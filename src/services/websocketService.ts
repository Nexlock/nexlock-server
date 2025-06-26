import type { Server as HTTPServer } from "http";
import { Server as SocketIOServer, type Socket } from "socket.io";
import type { UnlockMessage } from "../schemas/rental";
import { UnlockMessageSchema } from "../schemas/rental";
import { PrismaClient } from "../../generated/prisma";

const prisma = new PrismaClient();

interface ModuleConnection {
  socket: Socket;
  moduleId: string;
  lastPing: Date;
}

interface LockerStatus {
  moduleId: string;
  lockerId: string;
  occupied: boolean;
  lastUpdate: Date;
}

class WebSocketService {
  private io: SocketIOServer | null = null;
  private moduleConnections = new Map<string, ModuleConnection>();
  private lockerStatuses = new Map<string, LockerStatus>();

  initialize(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
      path: "/socket.io/",
    });

    // Module namespace for ESP32 connections
    const moduleNamespace = this.io.of("/module");

    moduleNamespace.on("connection", (socket: Socket) => {
      console.log("New module connection:", socket.id);

      socket.on("register", (data: { moduleId: string }) => {
        this.registerModule(socket, data.moduleId);
      });

      socket.on("ping", (data: { moduleId: string }) => {
        this.handlePing(socket, data.moduleId);
      });

      socket.on(
        "locker-status",
        (data: { moduleId: string; lockerId: string; occupied: boolean }) => {
          this.handleLockerStatus(data);
        }
      );

      socket.on(
        "validate-nfc",
        async (data: { nfcCode: string; moduleId: string }) => {
          await this.handleNFCValidation(socket, data);
        }
      );

      socket.on("disconnect", () => {
        this.handleDisconnect(socket);
      });

      socket.on("error", (error) => {
        console.error("Socket error:", error);
      });
    });

    // Main namespace for web clients
    this.io.on("connection", (socket: Socket) => {
      console.log("Web client connected:", socket.id);

      socket.on("get-locker-statuses", (data: { moduleId?: string }) => {
        this.sendLockerStatuses(socket, data.moduleId);
      });

      socket.on(
        "admin-unlock",
        async (data: { moduleId: string; lockerId: string }) => {
          await this.handleAdminUnlock(data);
        }
      );
    });

    // Ping modules every 30 seconds
    setInterval(() => {
      this.pingModules();
    }, 30000);

    console.log("WebSocket service initialized with Socket.IO");
  }

  private registerModule(socket: Socket, moduleId: string) {
    this.moduleConnections.set(moduleId, {
      socket,
      moduleId,
      lastPing: new Date(),
    });

    socket.emit("registered", {
      moduleId,
      timestamp: new Date().toISOString(),
    });

    console.log(`Module ${moduleId} registered with socket ${socket.id}`);
  }

  private handlePing(socket: Socket, moduleId: string) {
    const connection = this.moduleConnections.get(moduleId);
    if (connection) {
      connection.lastPing = new Date();
      socket.emit("pong", {
        timestamp: new Date().toISOString(),
      });
    }
  }

  private handleDisconnect(socket: Socket) {
    // Remove module connection
    for (const [moduleId, connection] of this.moduleConnections.entries()) {
      if (connection.socket.id === socket.id) {
        this.moduleConnections.delete(moduleId);
        console.log(`Module ${moduleId} disconnected`);
        break;
      }
    }
  }

  private pingModules() {
    const now = new Date();
    for (const [moduleId, connection] of this.moduleConnections.entries()) {
      const timeSinceLastPing = now.getTime() - connection.lastPing.getTime();

      // Remove connections that haven't pinged in 2 minutes
      if (timeSinceLastPing > 120000) {
        connection.socket.disconnect();
        this.moduleConnections.delete(moduleId);
        console.log(`Module ${moduleId} timed out`);
      }
    }
  }

  sendUnlockMessage(message: UnlockMessage): boolean {
    try {
      const validatedMessage = UnlockMessageSchema.parse(message);
      const connection = this.moduleConnections.get(validatedMessage.moduleId);

      if (!connection || !connection.socket.connected) {
        console.error(`Module ${validatedMessage.moduleId} not connected`);
        return false;
      }

      connection.socket.emit("unlock", {
        lockerId: validatedMessage.lockerId,
        action: validatedMessage.action,
        timestamp: validatedMessage.timestamp.toISOString(),
      });

      console.log(
        `Unlock message sent to module ${validatedMessage.moduleId} for locker ${validatedMessage.lockerId}`
      );
      return true;
    } catch (error) {
      console.error("Failed to send unlock message:", error);
      return false;
    }
  }

  private handleLockerStatus(data: {
    moduleId: string;
    lockerId: string;
    occupied: boolean;
  }) {
    const statusKey = `${data.moduleId}-${data.lockerId}`;

    this.lockerStatuses.set(statusKey, {
      moduleId: data.moduleId,
      lockerId: data.lockerId,
      occupied: data.occupied,
      lastUpdate: new Date(),
    });

    // Broadcast status to web clients
    if (this.io) {
      this.io.emit("locker-status-update", {
        moduleId: data.moduleId,
        lockerId: data.lockerId,
        occupied: data.occupied,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(
      `Locker status update: Module ${data.moduleId}, Locker ${data.lockerId}, Occupied: ${data.occupied}`
    );
  }

  private async handleNFCValidation(
    socket: Socket,
    data: { nfcCode: string; moduleId: string }
  ) {
    try {
      // Find active rental with this NFC code
      const rental = await prisma.lockerRental.findFirst({
        where: {
          nfcCode: data.nfcCode,
          endDate: null,
        },
        include: {
          locker: {
            include: {
              module: true,
            },
          },
        },
      });

      if (!rental) {
        socket.emit("nfc-validation-result", {
          valid: false,
          message: "Invalid or expired NFC code",
        });
        return;
      }

      // Check if NFC code belongs to a locker in the requested module
      if (rental.locker.module.deviceId !== data.moduleId) {
        socket.emit("nfc-validation-result", {
          valid: false,
          message: "NFC code not valid for this module",
        });
        return;
      }

      socket.emit("nfc-validation-result", {
        valid: true,
        lockerId: rental.locker.lockerId,
        message: "Access granted",
      });

      console.log(
        `NFC validation successful: Module ${data.moduleId}, Locker ${rental.locker.lockerId}`
      );
    } catch (error) {
      console.error("NFC validation error:", error);
      socket.emit("nfc-validation-result", {
        valid: false,
        message: "Validation error",
      });
    }
  }

  private sendLockerStatuses(socket: Socket, moduleId?: string) {
    const statuses = Array.from(this.lockerStatuses.values());
    const filteredStatuses = moduleId
      ? statuses.filter((status) => status.moduleId === moduleId)
      : statuses;

    socket.emit("locker-statuses", filteredStatuses);
  }

  private async handleAdminUnlock(data: {
    moduleId: string;
    lockerId: string;
  }) {
    try {
      const success = this.sendUnlockMessage({
        moduleId: data.moduleId,
        lockerId: data.lockerId,
        action: "unlock",
        timestamp: new Date(),
      });

      if (this.io) {
        this.io.emit("admin-unlock-result", {
          moduleId: data.moduleId,
          lockerId: data.lockerId,
          success,
        });
      }
    } catch (error) {
      console.error("Admin unlock error:", error);
    }
  }

  getConnectedModules(): string[] {
    return Array.from(this.moduleConnections.keys());
  }

  getIO(): SocketIOServer | null {
    return this.io;
  }

  getLockerStatuses(moduleId?: string): LockerStatus[] {
    const statuses = Array.from(this.lockerStatuses.values());
    return moduleId
      ? statuses.filter((status) => status.moduleId === moduleId)
      : statuses;
  }
}

export const websocketService = new WebSocketService();

export const sendUnlockMessage = (message: UnlockMessage): Promise<boolean> => {
  return Promise.resolve(websocketService.sendUnlockMessage(message));
};
