import type { Request, Response, NextFunction } from "express";
import { PrismaClient } from "../../generated/prisma";
import { generateNFCCode } from "../utils/nfc";
import { sendUnlockMessage } from "../services/websocketService";
import type {
  CreateRentalRequest,
  ValidateNFCRequest,
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

    // Generate NFC code
    const nfcCode = generateNFCCode();

    // Create rental
    const rental = await prisma.lockerRental.create({
      data: {
        lockerId,
        nfcCode,
        userId: user.id,
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
      nfcCode: rental.nfcCode,
      userId: rental.userId,
      startDate: rental.startDate,
      endDate: rental.endDate,
      locker: rental.locker,
    });
  } catch (error) {
    next(error);
  }
};

export const validateNFC = async (
  req: Request<{}, {}, ValidateNFCRequest>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { nfcCode, moduleId } = req.body;

    // Find active rental with this NFC code
    const rental = await prisma.lockerRental.findFirst({
      where: {
        nfcCode,
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
      res.status(200).json({
        valid: false,
        message: "Invalid or expired NFC code",
      });
      return;
    }

    // Check if NFC code belongs to a locker in the requested module
    if (rental.locker.module.id !== moduleId) {
      res.status(200).json({
        valid: false,
        message: "NFC code not valid for this module",
      });
      return;
    }

    res.status(200).json({
      valid: true,
      lockerId: rental.locker.lockerId,
      message: "NFC code is valid",
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

    // Update rental with end date
    const updatedRental = await prisma.lockerRental.update({
      where: { id: rentalId },
      data: { endDate: new Date() },
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

    // Send unlock message to module
    await sendUnlockMessage({
      moduleId: rental.locker.module.deviceId,
      lockerId: rental.locker.lockerId,
      action: "unlock",
      timestamp: new Date(),
    });

    res.status(200).json({
      id: updatedRental.id,
      lockerId: updatedRental.lockerId,
      nfcCode: updatedRental.nfcCode,
      userId: updatedRental.userId,
      startDate: updatedRental.startDate,
      endDate: updatedRental.endDate,
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
        nfcCode: rental.nfcCode,
        userId: rental.userId,
        startDate: rental.startDate,
        endDate: rental.endDate,
        locker: rental.locker,
      }))
    );
  } catch (error) {
    next(error);
  }
};
