import type { Server as HTTPServer } from "http";
import { Server as SocketIOServer, type Socket } from "socket.io";
import type { UnlockMessage } from "../schemas/rental";
import { UnlockMessageSchema } from "../schemas/rental";

interface ModuleConnection {
  socket: Socket;
  moduleId: string;
  lastPing: Date;
}

class WebSocketService {
  private io: SocketIOServer | null = null;
  private moduleConnections = new Map<string, ModuleConnection>();

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

      socket.on("disconnect", () => {
        this.handleDisconnect(socket);
      });

      socket.on("error", (error) => {
        console.error("Socket error:", error);
      });
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

  getConnectedModules(): string[] {
    return Array.from(this.moduleConnections.keys());
  }

  getIO(): SocketIOServer | null {
    return this.io;
  }
}

export const websocketService = new WebSocketService();

export const sendUnlockMessage = (message: UnlockMessage): Promise<boolean> => {
  return Promise.resolve(websocketService.sendUnlockMessage(message));
};
