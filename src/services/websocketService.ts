import type { Server as HTTPServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import type { LockUnlockMessage, ModuleStatusUpdate } from "../schemas/rental";
import {
  LockUnlockMessageSchema,
  ModuleStatusUpdateSchema,
} from "../schemas/rental";
import { PrismaClient } from "../../generated/prisma";

const prisma = new PrismaClient();

interface ModuleConnection {
  ws: WebSocket;
  moduleId: string;
  lastPing: Date;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private moduleConnections = new Map<string, ModuleConnection>();

  initialize(httpServer: HTTPServer) {
    this.wss = new WebSocketServer({
      server: httpServer,
      path: "/ws",
    });

    this.wss.on("connection", (ws: WebSocket, request) => {
      console.log("New WebSocket connection:", request.url);

      ws.on("message", (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
          ws.send(JSON.stringify({ error: "Invalid message format" }));
        }
      });

      ws.on("close", () => {
        this.handleDisconnect(ws);
      });

      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
      });

      // Send initial connection acknowledgment
      ws.send(
        JSON.stringify({
          type: "connected",
          timestamp: new Date().toISOString(),
        })
      );
    });

    // Ping modules every 30 seconds
    setInterval(() => {
      this.pingModules();
    }, 30000);

    console.log("WebSocket service initialized");
  }

  private async handleMessage(ws: WebSocket, message: any) {
    switch (message.type) {
      case "register":
        this.registerModule(ws, message.moduleId);
        break;
      case "ping":
        this.handlePing(ws, message.moduleId);
        break;
      case "pong":
        this.handlePong(ws, message.moduleId);
        break;
      case "status_update":
        await this.handleStatusUpdate(message);
        break;
      default:
        console.log("Unknown message type:", message.type);
    }
  }

  private registerModule(ws: WebSocket, moduleId: string) {
    if (!moduleId) {
      ws.send(JSON.stringify({ error: "Module ID is required" }));
      return;
    }

    this.moduleConnections.set(moduleId, {
      ws,
      moduleId,
      lastPing: new Date(),
    });

    ws.send(
      JSON.stringify({
        type: "registered",
        moduleId,
        timestamp: new Date().toISOString(),
      })
    );

    console.log(`Module ${moduleId} registered`);
  }

  private handlePing(ws: WebSocket, moduleId: string) {
    const connection = this.moduleConnections.get(moduleId);
    if (connection) {
      connection.lastPing = new Date();
      ws.send(
        JSON.stringify({
          type: "pong",
          timestamp: new Date().toISOString(),
        })
      );
    }
  }

  private handlePong(ws: WebSocket, moduleId: string) {
    const connection = this.moduleConnections.get(moduleId);
    if (connection) {
      connection.lastPing = new Date();
    }
  }

  private async handleStatusUpdate(message: any) {
    try {
      const statusUpdate: ModuleStatusUpdate = ModuleStatusUpdateSchema.parse({
        moduleId: message.moduleId,
        lockerId: message.lockerId,
        status: message.status,
        timestamp: new Date(message.timestamp),
      });

      // Update the rental record with the current lock status
      const isLocked = statusUpdate.status === "locked";

      await prisma.lockerRental.updateMany({
        where: {
          locker: {
            lockerId: statusUpdate.lockerId,
            module: {
              deviceId: statusUpdate.moduleId,
            },
          },
          endDate: null,
        },
        data: {
          isLocked,
        },
      });

      console.log(
        `Updated locker ${statusUpdate.lockerId} status to ${statusUpdate.status}`
      );
    } catch (error) {
      console.error("Failed to handle status update:", error);
    }
  }

  private handleDisconnect(ws: WebSocket) {
    // Remove module connection
    for (const [moduleId, connection] of this.moduleConnections.entries()) {
      if (connection.ws === ws) {
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
        if (connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.close();
        }
        this.moduleConnections.delete(moduleId);
        console.log(`Module ${moduleId} timed out`);
      } else {
        // Send ping to active connections
        if (connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.send(
            JSON.stringify({
              type: "ping",
              timestamp: now.toISOString(),
            })
          );
        }
      }
    }
  }

  sendLockUnlockMessage(message: LockUnlockMessage): boolean {
    try {
      const validatedMessage = LockUnlockMessageSchema.parse(message);
      const connection = this.moduleConnections.get(validatedMessage.moduleId);

      if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
        console.error(`Module ${validatedMessage.moduleId} not connected`);
        return false;
      }

      connection.ws.send(
        JSON.stringify({
          type: validatedMessage.action,
          lockerId: validatedMessage.lockerId,
          timestamp: validatedMessage.timestamp.toISOString(),
        })
      );

      console.log(
        `${validatedMessage.action} message sent to module ${validatedMessage.moduleId} for locker ${validatedMessage.lockerId}`
      );
      return true;
    } catch (error) {
      console.error("Failed to send lock/unlock message:", error);
      return false;
    }
  }

  getConnectedModules(): string[] {
    return Array.from(this.moduleConnections.keys());
  }

  getWebSocketServer(): WebSocketServer | null {
    return this.wss;
  }

  broadcast(message: any) {
    if (!this.wss) return;

    const messageStr = JSON.stringify(message);
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }
}

export const websocketService = new WebSocketService();

export const sendLockUnlockMessage = (
  message: LockUnlockMessage
): Promise<boolean> => {
  return Promise.resolve(websocketService.sendLockUnlockMessage(message));
};
