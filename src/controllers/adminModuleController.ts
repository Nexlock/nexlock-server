import type { Request, Response, NextFunction } from "express";
import { PrismaClient } from "../../generated/prisma";
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

    res.status(200).json(modules);
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

    res.status(200).json(module);
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
