import type { Request, Response, NextFunction } from "express";
import { PrismaClient } from "../../generated/prisma";
import { websocketService } from "../services/websocketService";
import { sendLockUnlockMessage } from "../services/websocketService";
import type { UpdateModuleRequest } from "../schemas/module";
import type { AuthUser } from "../schemas/auth";

const prisma = new PrismaClient();

export const getModules = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user as AuthUser;

    if (!user || user.type !== "admin") {
      res.status(401).json({ error: "Admin access required" });
      return;
    }

    const modules = await prisma.module.findMany({
      where: { adminId: user.id },
      include: {
        lockers: {
          select: {
            id: true,
            lockerId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Add online status to each module
    const connectedModules = websocketService.getConnectedModules();
    const modulesWithStatus = modules.map((module) => ({
      ...module,
      isOnline: connectedModules.includes(module.id),
    }));

    res.status(200).json(modulesWithStatus);
  } catch (error) {
    next(error);
  }
};

export const getModuleById = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const user = req.user as AuthUser;

    if (!user || user.type !== "admin") {
      res.status(401).json({ error: "Admin access required" });
      return;
    }

    const module = await prisma.module.findFirst({
      where: {
        id,
        adminId: user.id,
      },
      include: {
        lockers: {
          select: {
            id: true,
            lockerId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!module) {
      res.status(404).json({ error: "Module not found" });
      return;
    }

    // Add online status
    const connectedModules = websocketService.getConnectedModules();
    const moduleWithStatus = {
      ...module,
      isOnline: connectedModules.includes(module.id),
    };

    res.status(200).json(moduleWithStatus);
  } catch (error) {
    next(error);
  }
};

export const getModuleStatus = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const user = req.user as AuthUser;

    if (!user || user.type !== "admin") {
      res.status(401).json({ error: "Admin access required" });
      return;
    }

    // Verify module belongs to admin
    const module = await prisma.module.findFirst({
      where: {
        id,
        adminId: user.id,
      },
    });

    if (!module) {
      res.status(404).json({ error: "Module not found" });
      return;
    }

    const connectedModules = websocketService.getConnectedModules();
    const isOnline = connectedModules.includes(id);

    // Get locker statuses for this module
    const lockerStatuses = websocketService.getLockerStatuses(id);

    res.status(200).json({
      moduleId: id,
      isOnline,
      lastSeen: isOnline ? new Date() : null,
      lockerStatuses,
    });
  } catch (error) {
    next(error);
  }
};

export const updateModule = async (
  req: Request<{ id: string }, {}, UpdateModuleRequest>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { name, description, location } = req.body;
    const user = req.user as AuthUser;

    if (!user || user.type !== "admin") {
      res.status(401).json({ error: "Admin access required" });
      return;
    }

    // Check if module exists and belongs to the admin
    const existingModule = await prisma.module.findFirst({
      where: {
        id,
        adminId: user.id,
      },
    });

    if (!existingModule) {
      res.status(404).json({ error: "Module not found" });
      return;
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (location !== undefined) updateData.location = location;

    const updatedModule = await prisma.module.update({
      where: { id },
      data: updateData,
      include: {
        lockers: {
          select: {
            id: true,
            lockerId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    res.status(200).json(updatedModule);
  } catch (error) {
    next(error);
  }
};

export const getLockersByModule = async (
  req: Request<{ moduleId: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { moduleId } = req.params;
    const user = req.user as AuthUser;

    if (!user || user.type !== "admin") {
      res.status(401).json({ error: "Admin access required" });
      return;
    }

    // Verify module belongs to admin
    const module = await prisma.module.findFirst({
      where: {
        id: moduleId,
        adminId: user.id,
      },
    });

    if (!module) {
      res.status(404).json({ error: "Module not found" });
      return;
    }

    const lockers = await prisma.locker.findMany({
      where: { moduleId },
      include: {
        module: {
          select: {
            id: true,
            name: true,
            deviceId: true,
          },
        },
        LockerRental: {
          where: { expiresAt: { gte: new Date() } },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { lockerId: "asc" },
    });

    const response = lockers.map((locker) => ({
      id: locker.id,
      lockerId: locker.lockerId,
      moduleId: locker.moduleId,
      createdAt: locker.createdAt,
      updatedAt: locker.updatedAt,
      module: locker.module,
      currentRental: locker.LockerRental[0]
        ? {
            id: locker.LockerRental[0].id,
            userId: locker.LockerRental[0].userId,
            startDate: locker.LockerRental[0].startDate,
            expiresAt: locker.LockerRental[0].expiresAt,
            isLocked: locker.LockerRental[0].isLocked,
            user: locker.LockerRental[0].user,
          }
        : null,
    }));

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const getLockerById = async (
  req: Request<{ lockerId: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { lockerId } = req.params;
    const user = req.user as AuthUser;

    if (!user || user.type !== "admin") {
      res.status(401).json({ error: "Admin access required" });
      return;
    }

    const locker = await prisma.locker.findFirst({
      where: {
        id: lockerId,
        module: {
          adminId: user.id,
        },
      },
      include: {
        module: {
          select: {
            id: true,
            name: true,
            deviceId: true,
          },
        },
        LockerRental: {
          where: { expiresAt: { gte: new Date() } },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!locker) {
      res.status(404).json({ error: "Locker not found" });
      return;
    }

    const response = {
      id: locker.id,
      lockerId: locker.lockerId,
      moduleId: locker.moduleId,
      createdAt: locker.createdAt,
      updatedAt: locker.updatedAt,
      module: locker.module,
      currentRental: locker.LockerRental[0]
        ? {
            id: locker.LockerRental[0].id,
            userId: locker.LockerRental[0].userId,
            startDate: locker.LockerRental[0].startDate,
            expiresAt: locker.LockerRental[0].expiresAt,
            isLocked: locker.LockerRental[0].isLocked,
            user: locker.LockerRental[0].user,
          }
        : null,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const getLockerStatuses = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user as AuthUser;
    const { moduleId } = req.query;

    if (!user || user.type !== "admin") {
      res.status(401).json({ error: "Admin access required" });
      return;
    }

    // Get modules belonging to this admin
    const whereClause: any = { adminId: user.id };
    if (moduleId && typeof moduleId === "string") {
      whereClause.id = moduleId;
    }

    const modules = await prisma.module.findMany({
      where: whereClause,
      include: {
        lockers: {
          select: {
            id: true,
            lockerId: true,
          },
        },
      },
    });

    // Get real-time locker statuses from WebSocket service
    const allStatuses = websocketService.getLockerStatuses();
    const connectedModules = websocketService.getConnectedModules();

    const adminModuleIds = modules.map((m) => m.id);
    const adminStatuses = allStatuses.filter((status) =>
      adminModuleIds.includes(status.moduleId)
    );

    // Create response with proper format including online/offline status
    const response: any[] = [];

    for (const module of modules) {
      const isModuleOnline = connectedModules.includes(module.id);

      for (const locker of module.lockers) {
        const status = adminStatuses.find(
          (s) => s.moduleId === module.id && s.lockerId === locker.lockerId
        );

        response.push({
          lockerId: locker.lockerId,
          moduleId: module.id,
          isOnline: isModuleOnline,
          isOccupied: status?.occupied || false,
          lastUpdate: status?.lastUpdate || null,
        });
      }
    }

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const getLockerStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user as AuthUser;
    const { moduleId } = req.query;

    if (!user || user.type !== "admin") {
      res.status(401).json({ error: "Admin access required" });
      return;
    }

    // Build where clause for modules
    const whereClause: any = { adminId: user.id };
    if (moduleId && typeof moduleId === "string") {
      whereClause.id = moduleId;
    }

    // Get total lockers count
    const totalLockers = await prisma.locker.count({
      where: {
        module: whereClause,
      },
    });

    // Get active rentals count
    const activeRentals = await prisma.lockerRental.count({
      where: {
        expiresAt: { gte: new Date() },
        locker: {
          module: whereClause,
        },
      },
    });

    // Get modules and check online status
    const modules = await prisma.module.findMany({
      where: whereClause,
      include: {
        lockers: {
          select: {
            id: true,
            lockerId: true,
          },
        },
      },
    });

    const connectedModules = websocketService.getConnectedModules();
    const allStatuses = websocketService.getLockerStatuses();

    let onlineLockers = 0;
    let occupiedLockers = 0;

    for (const module of modules) {
      const isModuleOnline = connectedModules.includes(module.id);

      if (isModuleOnline) {
        onlineLockers += module.lockers.length;

        // Count occupied lockers for this module
        const moduleStatuses = allStatuses.filter(
          (status) => status.moduleId === module.id
        );
        occupiedLockers += moduleStatuses.filter((s) => s.occupied).length;
      }
    }

    const availableLockers = totalLockers - activeRentals;
    const offlineLockers = totalLockers - onlineLockers;

    res.status(200).json({
      totalLockers,
      availableLockers,
      occupiedLockers,
      offlineLockers,
      activeRentals,
    });
  } catch (error) {
    next(error);
  }
};

export const adminUnlockLocker = async (
  req: Request<{ lockerId: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { lockerId } = req.params;
    const { reason } = req.body;
    const user = req.user as AuthUser;

    if (!user || user.type !== "admin") {
      res.status(401).json({ error: "Admin access required" });
      return;
    }

    // Find the locker and verify ownership
    const locker = await prisma.locker.findFirst({
      where: {
        id: lockerId,
        module: {
          adminId: user.id,
        },
      },
      include: {
        module: true,
      },
    });

    if (!locker) {
      res.status(404).json({ error: "Locker not found" });
      return;
    }

    // Send unlock command via WebSocket
    const success = await sendLockUnlockMessage({
      moduleId: locker.module.id,
      lockerId: locker.lockerId,
      action: "unlock",
      timestamp: new Date(),
    });

    if (!success) {
      res
        .status(503)
        .json({ error: "Failed to communicate with locker module" });
      return;
    }

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const forceCheckoutRental = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { rentalId, reason } = req.body;
    const user = req.user as AuthUser;

    if (!user || user.type !== "admin") {
      res.status(401).json({ error: "Admin access required" });
      return;
    }

    // Find the rental and verify admin has access
    const rental = await prisma.lockerRental.findFirst({
      where: {
        id: rentalId,
        expiresAt: { gte: new Date() },
        locker: {
          module: {
            adminId: user.id,
          },
        },
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
      res.status(404).json({ error: "Active rental not found" });
      return;
    }

    // End the rental
    await prisma.lockerRental.update({
      where: { id: rentalId },
      data: {
        expiresAt: new Date(),
        isLocked: false,
      },
    });

    // Send unlock command
    await sendLockUnlockMessage({
      moduleId: rental.locker.module.id,
      lockerId: rental.locker.lockerId,
      action: "unlock",
      timestamp: new Date(),
    });

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const getRentalHistory = async (
  req: Request<{ lockerId: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { lockerId } = req.params;
    const user = req.user as AuthUser;

    if (!user || user.type !== "admin") {
      res.status(401).json({ error: "Admin access required" });
      return;
    }

    // Verify locker belongs to admin
    const locker = await prisma.locker.findFirst({
      where: {
        id: lockerId,
        module: {
          adminId: user.id,
        },
      },
    });

    if (!locker) {
      res.status(404).json({ error: "Locker not found" });
      return;
    }

    const rentals = await prisma.lockerRental.findMany({
      where: { lockerId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { startDate: "desc" },
    });

    const response = rentals.map((rental) => ({
      id: rental.id,
      userId: rental.userId,
      startDate: rental.startDate,
      expiresAt: rental.expiresAt,
      isLocked: rental.isLocked,
      user: rental.user,
    }));

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
