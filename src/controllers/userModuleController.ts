import type { Request, Response, NextFunction } from "express";
import { PrismaClient } from "../../generated/prisma";
import type { AuthUser } from "../schemas/auth";

const prisma = new PrismaClient();

export const getModules = async (
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

    const modules = await prisma.module.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        location: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            lockers: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const response = modules.map((module) => ({
      id: module.id,
      name: module.name,
      description: module.description,
      location: module.location,
      createdAt: module.createdAt,
      updatedAt: module.updatedAt,
      lockerCount: module._count.lockers,
    }));

    res.status(200).json(response);
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

    if (!user || user.type !== "user") {
      res.status(401).json({ error: "User access required" });
      return;
    }

    const module = await prisma.module.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        location: true,
        createdAt: true,
        updatedAt: true,
        lockers: {
          select: {
            id: true,
            lockerId: true,
            LockerRental: {
              where: { expiresAt: { gte: new Date() } },
              select: {
                id: true,
                startDate: true,
                expiresAt: true,
                isLocked: true,
                userId: true,
              },
            },
          },
          orderBy: { lockerId: "asc" },
        },
      },
    });

    if (!module) {
      res.status(404).json({ error: "Module not found" });
      return;
    }

    const response = {
      id: module.id,
      name: module.name,
      description: module.description,
      location: module.location,
      createdAt: module.createdAt,
      updatedAt: module.updatedAt,
      lockers: module.lockers.map((locker) => ({
        id: locker.id,
        lockerId: locker.lockerId,
        isAvailable: locker.LockerRental.length === 0,
        currentRental: locker.LockerRental[0]
          ? {
              id: locker.LockerRental[0].id,
              startDate: locker.LockerRental[0].startDate,
              expiresAt: locker.LockerRental[0].expiresAt,
              isLocked: locker.LockerRental[0].isLocked,
              isOwnRental: locker.LockerRental[0].userId === user.id,
            }
          : null,
      })),
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
