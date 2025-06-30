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

interface LockerStatus {
  moduleId: string;
  lockerId: string;
  occupied: boolean;
  lastUpdate: Date;
}

interface AvailableModule {
  macAddress: string;
  ws: WebSocket; // Store WebSocket reference directly
  deviceInfo: string;
  version: string;
  capabilities: number;
  discoveredAt: Date;
  lastSeen: Date;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private moduleConnections = new Map<string, ModuleConnection>();
  private lockerStatuses = new Map<string, LockerStatus>();
  private availableModules = new Map<string, AvailableModule>();
  private webClients = new Set<WebSocket>();

  initialize(httpServer: HTTPServer) {
    this.wss = new WebSocketServer({
      server: httpServer,
      path: "/ws",
      perMessageDeflate: false,
      clientTracking: true,
    });

    this.wss.on("connection", (ws: WebSocket, request) => {
      const clientIP = request.socket.remoteAddress;
      const userAgent = request.headers["user-agent"];

      console.log("New WebSocket connection:", {
        url: request.url,
        ip: clientIP,
        userAgent: userAgent?.substring(0, 100),
      });

      // Determine if this is a module or web client connection
      // Check user agent first, but also check first message type
      const isModuleByUserAgent = Boolean(
        userAgent?.includes("ESP32") || userAgent?.includes("Arduino")
      );

      // We'll determine this dynamically based on the first message
      let isModule = isModuleByUserAgent;

      if (!isModule) {
        this.webClients.add(ws);
        console.log(
          `Web client connected. Total web clients: ${this.webClients.size}`
        );
      }

      ws.on("message", (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());

          // Dynamically detect if this is a module based on message type
          if (!isModuleByUserAgent && this.isModuleMessage(message.type)) {
            isModule = true;
            // Remove from web clients and treat as module
            this.webClients.delete(ws);
            console.log(
              `Connection reclassified as module based on message type: ${message.type}`
            );
          }

          this.handleMessage(ws, message, isModule);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ error: "Invalid message format" }));
          }
        }
      });

      ws.on("close", (code, reason) => {
        console.log("WebSocket disconnected:", {
          code,
          reason: reason.toString(),
          isModule,
        });
        this.handleDisconnect(ws);
      });

      ws.on("error", (error) => {
        console.error("WebSocket error:", {
          error: error.message,
          isModule,
          clientIP,
        });
      });

      // Send initial connection acknowledgment
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "connected",
            timestamp: new Date().toISOString(),
          })
        );
      }
    });

    this.wss.on("error", (error) => {
      console.error("WebSocket Server error:", error);
    });

    // Ping modules every 30 seconds
    setInterval(() => {
      this.pingModules();
    }, 30000);

    // Clean up stale modules every minute
    setInterval(() => {
      this.cleanupStaleModules();
    }, 60000);

    console.log("WebSocket service initialized");
  }

  private async handleMessage(ws: WebSocket, message: any, isModule: boolean) {
    console.log("Received message:", {
      type: message.type,
      isModule,
      data: message,
    });

    switch (message.type) {
      case "register":
        if (isModule) {
          this.registerModule(ws, message.moduleId);
        }
        break;
      case "ping":
        if (isModule) {
          this.handlePing(ws, message.moduleId);
        }
        break;
      case "pong":
        if (isModule) {
          this.handlePong(ws, message.moduleId);
        }
        break;
      case "status_update":
        if (isModule) {
          await this.handleStatusUpdate(message);
        }
        break;
      case "locker_status":
        if (isModule) {
          this.handleLockerStatus(message);
        }
        break;
      case "module_available":
        if (isModule) {
          this.handleModuleAvailable(ws, message);
        }
        break;
      case "configuration_success":
        if (isModule) {
          this.handleConfigurationSuccess(message);
        }
        break;
      case "configuration_error":
        if (isModule) {
          this.handleConfigurationError(message);
        }
        break;
      case "get_available_modules":
        if (!isModule) {
          this.sendAvailableModulesToClient(ws);
        }
        break;
      case "get_locker_statuses":
        if (!isModule) {
          this.sendLockerStatuses(ws, message.moduleId);
        }
        break;
      case "admin_unlock":
        if (!isModule) {
          await this.handleAdminUnlock(message);
        }
        break;
      default:
        console.log(
          "Unknown message type:",
          message.type,
          "from",
          isModule ? "module" : "web client"
        );
    }
  }

  private handleConfigurationSuccess(message: any) {
    const { moduleId, macAddress } = message;
    console.log(
      `Configuration success confirmed for module ${moduleId} (MAC: ${macAddress})`
    );

    // Broadcast success to web clients
    this.broadcastToWebClients({
      type: "module_configuration_success",
      moduleId,
      macAddress,
      timestamp: new Date().toISOString(),
    });
  }

  private handleConfigurationError(message: any) {
    const { error, expectedMac, actualMac } = message;
    console.error(`Configuration error: ${error}`, {
      expectedMac,
      actualMac,
    });

    // Broadcast error to web clients
    this.broadcastToWebClients({
      type: "module_configuration_error",
      error,
      expectedMac,
      actualMac,
      timestamp: new Date().toISOString(),
    });
  }

  private registerModule(ws: WebSocket, moduleId: string) {
    if (!moduleId) {
      ws.send(JSON.stringify({ error: "Module ID is required" }));
      return;
    }

    console.log(`Registering module: ${moduleId}`);

    this.moduleConnections.set(moduleId, {
      ws,
      moduleId,
      lastPing: new Date(),
    });

    // Remove from available modules since it's now registered and configured
    let removedMacAddress: string | null = null;

    for (const [macAddress, module] of this.availableModules.entries()) {
      if (module.ws === ws) {
        this.availableModules.delete(macAddress);
        removedMacAddress = macAddress;
        console.log(
          `Configured module removed from available list: ${macAddress} -> ${moduleId}`
        );
        break;
      }
    }

    if (removedMacAddress) {
      this.broadcastToWebClients({
        type: "available_modules_update",
        modules: Array.from(this.availableModules.values()).map((module) => ({
          macAddress: module.macAddress,
          wsId: this.generateWSId(module.ws),
          deviceInfo: module.deviceInfo,
          version: module.version,
          capabilities: module.capabilities,
          discoveredAt: module.discoveredAt,
          lastSeen: module.lastSeen,
        })),
      });
    }

    ws.send(
      JSON.stringify({
        type: "registered",
        moduleId,
        timestamp: new Date().toISOString(),
      })
    );

    console.log(
      `Module ${moduleId} registered successfully and removed from available modules`
    );
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

      console.log(
        `Processing status update: Module ${statusUpdate.moduleId}, Locker ${statusUpdate.lockerId}, Status: ${statusUpdate.status}`
      );

      // Update the rental record with the current lock status
      const isLocked = statusUpdate.status === "locked";

      // Find and update the active rental
      const updatedRentals = await prisma.lockerRental.updateMany({
        where: {
          locker: {
            lockerId: statusUpdate.lockerId,
            module: {
              id: statusUpdate.moduleId,
            },
          },
          expiresAt: { gte: new Date() }, // Only update active rentals
        },
        data: {
          isLocked,
        },
      });

      console.log(
        `Updated ${updatedRentals.count} rental records for locker ${statusUpdate.lockerId}`
      );

      // Update locker occupancy status for real-time tracking
      const statusKey = `${statusUpdate.moduleId}-${statusUpdate.lockerId}`;
      this.lockerStatuses.set(statusKey, {
        moduleId: statusUpdate.moduleId,
        lockerId: statusUpdate.lockerId,
        occupied: statusUpdate.status === "locked",
        lastUpdate: statusUpdate.timestamp,
      });

      // Broadcast to web clients with detailed status information
      this.broadcastToWebClients({
        type: "locker_status_update",
        moduleId: statusUpdate.moduleId,
        lockerId: statusUpdate.lockerId,
        status: statusUpdate.status,
        isLocked: isLocked,
        timestamp: statusUpdate.timestamp.toISOString(),
      });

      console.log(
        `Status update processed and broadcasted: ${statusUpdate.lockerId} is now ${statusUpdate.status}`
      );
    } catch (error) {
      console.error("Failed to handle status update:", error);
    }
  }

  private handleLockerStatus(message: any) {
    const { moduleId, lockerId, occupied } = message;
    const statusKey = `${moduleId}-${lockerId}`;

    this.lockerStatuses.set(statusKey, {
      moduleId,
      lockerId,
      occupied,
      lastUpdate: new Date(),
    });

    // Broadcast to web clients
    this.broadcastToWebClients({
      type: "locker_occupancy_update",
      moduleId,
      lockerId,
      occupied,
      timestamp: new Date().toISOString(),
    });

    console.log(
      `Locker occupancy update: Module ${moduleId}, Locker ${lockerId}, Occupied: ${occupied}`
    );
  }

  private handleModuleAvailable(ws: WebSocket, message: any) {
    const { macAddress, deviceInfo, version, capabilities, timestamp } =
      message;

    console.log("=== MODULE AVAILABLE DEBUG ===");
    console.log("Processing module_available:", {
      macAddress,
      deviceInfo,
      version,
      capabilities,
    });

    // Check if this module is already registered (configured) by WebSocket reference
    for (const [moduleId, connection] of this.moduleConnections.entries()) {
      if (connection.ws === ws) {
        console.log(
          `⚠️ Module ${macAddress} is already configured as ${moduleId}, ignoring availability broadcast`
        );
        return;
      }
    }

    // Also check if we already have this MAC address in available modules
    // and it's the same connection (to prevent duplicate entries)
    const existingModule = this.availableModules.get(macAddress);
    if (existingModule) {
      console.log(`Existing module found for MAC ${macAddress}:`, {
        deviceInfo: existingModule.deviceInfo,
        isSameWS: existingModule.ws === ws,
      });
      if (existingModule.ws === ws) {
        // Just update the lastSeen timestamp
        existingModule.lastSeen = new Date();
        console.log(`⏰ Updated lastSeen for existing module: ${macAddress}`);
        return;
      } else {
        console.log(
          `🔄 Different connection for same MAC, updating WebSocket reference`
        );
      }
    }

    const availableModule: AvailableModule = {
      macAddress,
      // Store WebSocket reference directly
      ws: ws,
      deviceInfo,
      version,
      capabilities,
      discoveredAt: this.availableModules.has(macAddress)
        ? this.availableModules.get(macAddress)!.discoveredAt
        : new Date(),
      lastSeen: new Date(),
    };

    this.availableModules.set(macAddress, availableModule);

    console.log(`✅ Available module updated: ${macAddress} (${deviceInfo})`);
    console.log(`📊 Total available modules: ${this.availableModules.size}`);
    console.log(
      `📋 Current available modules: ${Array.from(
        this.availableModules.keys()
      )}`
    );

    // Broadcast to web clients (convert ws to wsId for serialization)
    this.broadcastToWebClients({
      type: "available_modules_update",
      modules: Array.from(this.availableModules.values()).map((module) => ({
        macAddress: module.macAddress,
        wsId: this.generateWSId(module.ws), // Generate for display only
        deviceInfo: module.deviceInfo,
        version: module.version,
        capabilities: module.capabilities,
        discoveredAt: module.discoveredAt,
        lastSeen: module.lastSeen,
      })),
    });

    console.log(`📡 Broadcasted to ${this.webClients.size} web clients`);
  }

  private handleDisconnect(ws: WebSocket) {
    // Remove from web clients
    this.webClients.delete(ws);

    // Remove module connection
    for (const [moduleId, connection] of this.moduleConnections.entries()) {
      if (connection.ws === ws) {
        this.moduleConnections.delete(moduleId);
        console.log(`Module ${moduleId} disconnected`);
        break;
      }
    }

    // Remove from available modules by WebSocket reference
    for (const [macAddress, module] of this.availableModules.entries()) {
      if (module.ws === ws) {
        this.availableModules.delete(macAddress);
        console.log(`Available module removed: ${macAddress}`);
        this.broadcastToWebClients({
          type: "available_modules_update",
          modules: Array.from(this.availableModules.values()).map((module) => ({
            macAddress: module.macAddress,
            wsId: this.generateWSId(module.ws),
            deviceInfo: module.deviceInfo,
            version: module.version,
            capabilities: module.capabilities,
            discoveredAt: module.discoveredAt,
            lastSeen: module.lastSeen,
          })),
        });
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

  private cleanupStaleModules() {
    const now = new Date();
    const staleThreshold = 30000; // 30 seconds

    for (const [macAddress, module] of this.availableModules.entries()) {
      const timeSinceLastSeen = now.getTime() - module.lastSeen.getTime();

      if (timeSinceLastSeen > staleThreshold) {
        this.availableModules.delete(macAddress);
        console.log(`Removed stale available module: ${macAddress}`);

        this.broadcastToWebClients({
          type: "available_modules_update",
          modules: Array.from(this.availableModules.values()).map((module) => ({
            macAddress: module.macAddress,
            wsId: this.generateWSId(module.ws),
            deviceInfo: module.deviceInfo,
            version: module.version,
            capabilities: module.capabilities,
            discoveredAt: module.discoveredAt,
            lastSeen: module.lastSeen,
          })),
        });
      }
    }
  }

  private sendLockerStatuses(ws: WebSocket, moduleId?: string) {
    const statuses = Array.from(this.lockerStatuses.values());
    const filteredStatuses = moduleId
      ? statuses.filter((status) => status.moduleId === moduleId)
      : statuses;

    ws.send(
      JSON.stringify({
        type: "locker_statuses",
        statuses: filteredStatuses,
      })
    );
  }

  private async handleAdminUnlock(message: any) {
    const { moduleId, lockerId } = message;
    try {
      const success = this.sendLockUnlockMessage({
        moduleId,
        lockerId,
        action: "unlock",
        timestamp: new Date(),
      });

      this.broadcastToWebClients({
        type: "admin_unlock_result",
        moduleId,
        lockerId,
        success,
      });
    } catch (error) {
      console.error("Admin unlock error:", error);
    }
  }

  private broadcastToWebClients(message: any) {
    const messageStr = JSON.stringify(message);
    this.webClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  private generateWSId(ws: WebSocket): string {
    // Use a more reliable method to generate WebSocket ID
    const socket = (ws as any)._socket;
    if (!socket) {
      console.warn("⚠️ No socket found for WebSocket, using fallback ID");
      return `ws_${Date.now()}_${Math.random()}`;
    }

    const remoteAddress = socket.remoteAddress || "unknown";
    const remotePort = socket.remotePort || Math.random();
    const localPort = socket.localPort || "unknown";

    // Remove timestamp to make IDs consistent across calls
    const wsId = `ws_${remoteAddress}_${remotePort}_${localPort}`;
    return wsId;
  }

  sendLockUnlockMessage(message: LockUnlockMessage): boolean {
    try {
      const validatedMessage = LockUnlockMessageSchema.parse(message);
      const connection = this.moduleConnections.get(validatedMessage.moduleId);

      if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
        console.error(`Module ${validatedMessage.moduleId} not connected`);
        console.log(
          "Available connections:",
          Array.from(this.moduleConnections.keys())
        );
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

  configureModule(
    macAddress: string,
    moduleId: string,
    lockerIds: string[]
  ): boolean {
    console.log(`=== CONFIGURE MODULE DEBUG ===`);
    console.log(`Requested MAC: ${macAddress}`);
    console.log(`Module ID: ${moduleId}`);
    console.log(`Locker IDs: ${lockerIds.join(", ")}`);
    console.log(`Available modules count: ${this.availableModules.size}`);
    console.log(
      `Available module MACs: ${Array.from(this.availableModules.keys()).join(
        ", "
      )}`
    );

    const availableModule = this.availableModules.get(macAddress);

    if (!availableModule) {
      console.error(`❌ Available module not found: ${macAddress}`);
      console.log("Available modules detail:");
      for (const [mac, module] of this.availableModules.entries()) {
        console.log(
          `  - MAC: ${mac}, deviceInfo: ${module.deviceInfo}, wsConnected: ${
            module.ws.readyState === WebSocket.OPEN
          }`
        );
      }
      return false;
    }

    console.log(`✅ Found available module: ${macAddress}`);
    console.log(`Module details:`, {
      macAddress: availableModule.macAddress,
      deviceInfo: availableModule.deviceInfo,
      version: availableModule.version,
      capabilities: availableModule.capabilities,
      wsReadyState: availableModule.ws.readyState,
      wsOpen: availableModule.ws.readyState === WebSocket.OPEN,
    });

    // Use the stored WebSocket reference directly
    const moduleWS = availableModule.ws;

    if (moduleWS.readyState !== WebSocket.OPEN) {
      console.error(
        `❌ WebSocket connection is not open for module: ${macAddress}`
      );
      console.log(
        `WebSocket ready state: ${moduleWS.readyState} (expected: ${WebSocket.OPEN})`
      );
      return false;
    }

    console.log(`📤 Sending configuration to module ${macAddress}`);
    console.log(`Configuration payload:`, {
      type: "module_configured",
      moduleId,
      macAddress,
      lockerIds,
      timestamp: new Date().toISOString(),
    });

    // Send configuration to module with MAC address verification
    try {
      moduleWS.send(
        JSON.stringify({
          type: "module_configured",
          moduleId,
          macAddress, // ✅ Include MAC address for verification
          lockerIds,
          timestamp: new Date().toISOString(),
        })
      );

      console.log(`✅ Configuration message sent successfully`);
    } catch (error) {
      console.error(`❌ Failed to send configuration message:`, error);
      return false;
    }

    // Remove from available modules immediately - don't wait for restart
    this.availableModules.delete(macAddress);
    console.log(
      `🗑️ Module immediately removed from available list: ${macAddress} -> ${moduleId}`
    );

    // Broadcast update to remove from available modules list
    this.broadcastToWebClients({
      type: "available_modules_update",
      modules: Array.from(this.availableModules.values()).map((module) => ({
        macAddress: module.macAddress,
        wsId: this.generateWSId(module.ws),
        deviceInfo: module.deviceInfo,
        version: module.version,
        capabilities: module.capabilities,
        discoveredAt: module.discoveredAt,
        lastSeen: module.lastSeen,
      })),
    });

    console.log(`✅ Configuration complete for ${macAddress}`);
    return true;
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

  getLockerStatuses(moduleId?: string): LockerStatus[] {
    const statuses = Array.from(this.lockerStatuses.values());
    return moduleId
      ? statuses.filter((status) => status.moduleId === moduleId)
      : statuses;
  }

  getAvailableModules(): AvailableModule[] {
    // Convert for external consumption, keeping ws reference internal
    return Array.from(this.availableModules.values()).map((module) => ({
      macAddress: module.macAddress,
      wsId: this.generateWSId(module.ws),
      deviceInfo: module.deviceInfo,
      version: module.version,
      capabilities: module.capabilities,
      discoveredAt: module.discoveredAt,
      lastSeen: module.lastSeen,
    })) as any[];
  }

  private isModuleMessage(messageType: string): boolean {
    const moduleMessageTypes = [
      "module_available",
      "register",
      "ping",
      "pong",
      "status_update",
      "locker_status",
      "configuration_success",
      "configuration_error",
    ];
    return moduleMessageTypes.includes(messageType);
  }

  private sendAvailableModulesToClient(ws: WebSocket) {
    const availableModules = Array.from(this.availableModules.values()).map(
      (module) => ({
        macAddress: module.macAddress,
        wsId: this.generateWSId(module.ws),
        deviceInfo: module.deviceInfo,
        version: module.version,
        capabilities: module.capabilities,
        discoveredAt: module.discoveredAt,
        lastSeen: module.lastSeen,
      })
    );
    console.log(
      `Sending ${availableModules.length} available modules to client`
    );

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "available_modules_update",
          modules: availableModules,
        })
      );
    }
  }
}

export const websocketService = new WebSocketService();

export const sendLockUnlockMessage = (
  message: LockUnlockMessage
): Promise<boolean> => {
  return Promise.resolve(websocketService.sendLockUnlockMessage(message));
};
