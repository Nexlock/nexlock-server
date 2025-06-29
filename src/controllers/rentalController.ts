import type { Request, Response, NextFunction } from "express";
import { PrismaClient } from "../../generated/prisma";
import {
  sendLockUnlockMessage,
  websocketService,
} from "../services/websocketService";
import type {
  CreateRentalRequest,
  LockUnlockRentalRequest,
  ExtendRentalRequest,
  CheckoutRentalRequest,
} from "../schemas/rental";
import type { AuthUser } from "../schemas/auth";

const prisma = new PrismaClient();

export const createRental = async (
  req: Request<{}, {}, CreateRentalRequest>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { lockerId } = req.body;
    const user = req.user as AuthUser;

    if (!user || user.type !== "user") {
      res.status(401).json({ error: "User access required" });
      return;
    }

    // Check if locker exists
    const locker = await prisma.locker.findUnique({
      where: { id: lockerId },
      include: {
        module: true,
        LockerRental: {
          where: { endDate: null },
        },
      },
    });

    if (!locker) {
      res.status(404).json({ error: "Locker not found" });
      return;
    }

    // Check if locker is already rented
    if (locker.LockerRental.length > 0) {
      res.status(409).json({ error: "Locker is already rented" });
      return;
    }

    // Create rental with 6-hour expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 6);

    const rental = await prisma.lockerRental.create({
      data: {
        lockerId,
        userId: user.id,
        expiresAt,
        isLocked: true,
      },
      include: {
        locker: {
          include: {
            module: {
              select: {
                id: true,
                name: true,
                deviceId: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json({
      id: rental.id,
      lockerId: rental.lockerId,
      userId: rental.userId,
      startDate: rental.startDate,
      endDate: rental.endDate,
      expiresAt: rental.expiresAt,
      isLocked: rental.isLocked,
      locker: rental.locker,
    });
  } catch (error) {
    next(error);
  }
};

export const lockUnlockRental = async (
  req: Request<{}, {}, LockUnlockRentalRequest>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { rentalId, action } = req.body;
    const user = req.user as AuthUser;

    if (!user || user.type !== "user") {
      res.status(401).json({ error: "User access required" });
      return;
    }

    // Find the rental
    const rental = await prisma.lockerRental.findFirst({
      where: {
        id: rentalId,
        userId: user.id,
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
      res.status(404).json({ error: "Active rental not found" });
      return;
    }

    // Check if rental has expired
    if (rental.expiresAt < new Date()) {
      res.status(403).json({
        error:
          "Rental has expired. Please extend your rental time to continue using the locker.",
      });
      return;
    }

    // Update rental lock status
    const isLocked = action === "lock";
    const updatedRental = await prisma.lockerRental.update({
      where: { id: rentalId },
      data: { isLocked },
      include: {
        locker: {
          include: {
            module: {
              select: {
                id: true,
                name: true,
                deviceId: true,
              },
            },
          },
        },
      },
    });

    // Send lock/unlock message to module using module.id for WebSocket routing
    const success = await sendLockUnlockMessage({
      moduleId: rental.locker.module.id, // ✅ Use raw module ID for WebSocket communication
      lockerId: rental.locker.lockerId,
      action,
      timestamp: new Date(),
    });

    if (!success) {
      res
        .status(503)
        .json({ error: "Failed to communicate with locker module" });
      return;
    }

    res.status(200).json({
      id: updatedRental.id,
      lockerId: updatedRental.lockerId,
      userId: updatedRental.userId,
      startDate: updatedRental.startDate,
      endDate: updatedRental.endDate,
      expiresAt: updatedRental.expiresAt,
      isLocked: updatedRental.isLocked,
      locker: updatedRental.locker,
    });
  } catch (error) {
    next(error);
  }
};

export const extendRental = async (
  req: Request<{}, {}, ExtendRentalRequest>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { rentalId, hours } = req.body;
    const user = req.user as AuthUser;

    if (!user || user.type !== "user") {
      res.status(401).json({ error: "User access required" });
      return;
    }

    // Find the rental
    const rental = await prisma.lockerRental.findFirst({
      where: {
        id: rentalId,
        userId: user.id,
        endDate: null,
      },
      include: {
        locker: {
          include: {
            module: {
              select: {
                id: true,
                name: true,
                deviceId: true,
              },
            },
          },
        },
      },
    });

    if (!rental) {
      res.status(404).json({ error: "Active rental not found" });
      return;
    }

    // Extend the expiry time
    const newExpiresAt = new Date(rental.expiresAt);
    newExpiresAt.setHours(newExpiresAt.getHours() + hours);

    const updatedRental = await prisma.lockerRental.update({
      where: { id: rentalId },
      data: { expiresAt: newExpiresAt },
      include: {
        locker: {
          include: {
            module: {
              select: {
                id: true,
                name: true,
                deviceId: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json({
      id: updatedRental.id,
      lockerId: updatedRental.lockerId,
      userId: updatedRental.userId,
      startDate: updatedRental.startDate,
      endDate: updatedRental.endDate,
      expiresAt: updatedRental.expiresAt,
      isLocked: updatedRental.isLocked,
      locker: updatedRental.locker,
    });
  } catch (error) {
    next(error);
  }
};

export const checkoutRental = async (
  req: Request<{}, {}, CheckoutRentalRequest>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { rentalId } = req.body;
    const user = req.user as AuthUser;

    if (!user || user.type !== "user") {
      res.status(401).json({ error: "User access required" });
      return;
    }

    // Find the rental
    const rental = await prisma.lockerRental.findFirst({
      where: {
        id: rentalId,
        userId: user.id,
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
      res.status(404).json({ error: "Active rental not found" });
      return;
    }

    // Update rental with end date and ensure it's unlocked
    const updatedRental = await prisma.lockerRental.update({
      where: { id: rentalId },
      data: {
        endDate: new Date(),
        isLocked: false,
      },
      include: {
        locker: {
          include: {
            module: {
              select: {
                id: true,
                name: true,
                deviceId: true,
              },
            },
          },
        },
      },
    });

    // Send unlock message to module for checkout using module.id for WebSocket routing
    await sendLockUnlockMessage({
      moduleId: rental.locker.module.id, // ✅ Use raw module ID for WebSocket communication
      lockerId: rental.locker.lockerId,
      action: "unlock",
      timestamp: new Date(),
    });

    res.status(200).json({
      id: updatedRental.id,
      lockerId: updatedRental.lockerId,
      userId: updatedRental.userId,
      startDate: updatedRental.startDate,
      endDate: updatedRental.endDate,
      expiresAt: updatedRental.expiresAt,
      isLocked: updatedRental.isLocked,
      locker: updatedRental.locker,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserRentals = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user as AuthUser;

    if (!user || user.type !== "user") {
      res.status(401).json({ error: "User access required" });
      return;
    }

    const rentals = await prisma.lockerRental.findMany({
      where: { userId: user.id },
      include: {
        locker: {
          include: {
            module: {
              select: {
                id: true,
                name: true,
                deviceId: true,
              },
            },
          },
        },
      },
      orderBy: { startDate: "desc" },
    });

    res.status(200).json(
      rentals.map((rental) => ({
        id: rental.id,
        lockerId: rental.lockerId,
        userId: rental.userId,
        startDate: rental.startDate,
        endDate: rental.endDate,
        expiresAt: rental.expiresAt,
        isLocked: rental.isLocked,
        locker: rental.locker,
      }))
    );
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

    if (!user || user.type !== "admin") {
      res.status(401).json({ error: "Admin access required" });
      return;
    }

    // Get modules belonging to this admin
    const modules = await prisma.module.findMany({
      where: { adminId: user.id },
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

    // Filter statuses for modules belonging to this admin using module.id
    const adminModuleIds = modules.map((m) => m.id); // ✅ Use module.id for WebSocket lookups
    const adminStatuses = allStatuses.filter((status) =>
      adminModuleIds.includes(status.moduleId)
    );

    // Combine module info with statuses
    const moduleStatuses = modules.map((module) => ({
      id: module.id,
      name: module.name,
      deviceId: module.deviceId,
      lockers: module.lockers.map((locker) => {
        const status = adminStatuses.find(
          (s) => s.moduleId === module.id && s.lockerId === locker.lockerId // ✅ Use module.id for status matching
        );
        return {
          id: locker.id,
          lockerId: locker.lockerId,
          occupied: status?.occupied || false,
          lastUpdate: status?.lastUpdate || null,
        };
      }),
    }));

    res.status(200).json(moduleStatuses);
  } catch (error) {
    next(error);
  }
};
