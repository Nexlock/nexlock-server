import type { Request, Response, NextFunction } from "express";
import { PrismaClient } from "../../generated/prisma";
import type {
  CreateModuleRequest,
  EditModuleRequest,
  CreateAdminWithSystemRequest,
  LockerResponse,
  DeleteModuleRequest,
  PairModuleRequest,
} from "../schemas/module";
import { websocketService } from "../services/websocketService";
import { generateNFCCode } from "../utils/nfc";

const prisma = new PrismaClient();

export const createAdminWithSystem = async (
  req: Request<{}, {}, CreateAdminWithSystemRequest>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, modules, secret } = req.body;
    const superAdminSecret = process.env.SUPERADMIN_SECRET;

    if (!superAdminSecret) {
      res.status(500).json({ error: "Server configuration error" });
      return;
    }

    if (secret !== superAdminSecret) {
      res.status(403).json({ error: "Invalid super admin secret" });
      return;
    }

    // Validate all deviceIds are unique
    const deviceIds = modules.map((m) => m.deviceId);
    const existingModules = await prisma.module.findMany({
      where: { deviceId: { in: deviceIds } },
    });

    if (existingModules.length > 0) {
      res.status(409).json({
        error: `Device IDs already exist: ${existingModules
          .map((m) => m.deviceId)
          .join(", ")}`,
      });
      return;
    }

    // Create admin
    const admin = await prisma.admin.create({
      data: {
        name,
        email,
      },
    });

    // Create modules with lockers
    const createdModules = await Promise.all(
      modules.map(async (moduleData) => {
        const module = await prisma.module.create({
          data: {
            name: moduleData.name,
            deviceId: moduleData.deviceId,
            description: moduleData.description,
            location: moduleData.location,
            adminId: admin.id,
          },
        });

        // Create lockers for this module
        const lockers: LockerResponse[] = await Promise.all(
          moduleData.lockerIds.map(
            async (lockerId): Promise<LockerResponse> => {
              const locker = await prisma.locker.create({
                data: {
                  lockerId,
                  moduleId: module.id,
                },
              });
              return {
                id: locker.id,
                lockerId: locker.lockerId,
                createdAt: locker.createdAt,
                updatedAt: locker.updatedAt,
              };
            }
          )
        );

        return { ...module, lockers };
      })
    );

    res.status(201).json({
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt,
      },
      modules: createdModules,
    });
  } catch (error) {
    next(error);
  }
};

export const createModule = async (
  req: Request<{}, {}, CreateModuleRequest>,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      name,
      deviceId,
      description,
      location,
      adminId,
      secret,
      lockerIds,
    } = req.body;
    const superAdminSecret = process.env.SUPERADMIN_SECRET;

    if (!superAdminSecret) {
      res.status(500).json({ error: "Server configuration error" });
      return;
    }

    if (secret !== superAdminSecret) {
      res.status(403).json({ error: "Invalid super admin secret" });
      return;
    }

    // Check if admin exists
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      res.status(404).json({ error: "Admin not found" });
      return;
    }

    // Check if deviceId already exists
    const existingModule = await prisma.module.findUnique({
      where: { deviceId },
    });

    if (existingModule) {
      res.status(409).json({ error: "Device ID already exists" });
      return;
    }

    const module = await prisma.module.create({
      data: {
        name,
        deviceId,
        description,
        location,
        adminId,
      },
    });

    // Create lockers if provided
    let lockers: LockerResponse[] = [];
    if (lockerIds && lockerIds.length > 0) {
      lockers = await Promise.all(
        lockerIds.map(async (lockerId): Promise<LockerResponse> => {
          const locker = await prisma.locker.create({
            data: {
              lockerId,
              moduleId: module.id,
            },
          });
          return {
            id: locker.id,
            lockerId: locker.lockerId,
            createdAt: locker.createdAt,
            updatedAt: locker.updatedAt,
          };
        })
      );
    }

    res.status(201).json({
      id: module.id,
      name: module.name,
      deviceId: module.deviceId,
      description: module.description,
      location: module.location,
      adminId: module.adminId,
      createdAt: module.createdAt,
      updatedAt: module.updatedAt,
      lockers,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteModule = async (
  req: Request<{ id: string }, {}, DeleteModuleRequest>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { secret } = req.body;
    const superAdminSecret = process.env.SUPERADMIN_SECRET;

    if (!superAdminSecret) {
      res.status(500).json({ error: "Server configuration error" });
      return;
    }

    if (secret !== superAdminSecret) {
      res.status(403).json({ error: "Invalid super admin secret" });
      return;
    }

    const module = await prisma.module.findUnique({
      where: { id },
    });

    if (!module) {
      res.status(404).json({ error: "Module not found" });
      return;
    }

    await prisma.module.delete({
      where: { id },
    });

    res.status(200).json({ message: "Module deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const editModuleDeviceId = async (
  req: Request<{ id: string }, {}, EditModuleRequest>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { deviceId, secret } = req.body;
    const superAdminSecret = process.env.SUPERADMIN_SECRET;

    if (!superAdminSecret) {
      res.status(500).json({ error: "Server configuration error" });
      return;
    }

    if (secret !== superAdminSecret) {
      res.status(403).json({ error: "Invalid super admin secret" });
      return;
    }

    // Check if module exists
    const existingModule = await prisma.module.findUnique({
      where: { id },
    });

    if (!existingModule) {
      res.status(404).json({ error: "Module not found" });
      return;
    }

    // Check if new deviceId already exists (excluding current module)
    const deviceIdExists = await prisma.module.findFirst({
      where: {
        deviceId,
        NOT: { id },
      },
    });

    if (deviceIdExists) {
      res.status(409).json({ error: "Device ID already exists" });
      return;
    }

    const updatedModule = await prisma.module.update({
      where: { id },
      data: { deviceId },
      include: {
        admin: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(200).json({
      id: updatedModule.id,
      name: updatedModule.name,
      deviceId: updatedModule.deviceId,
      description: updatedModule.description,
      location: updatedModule.location,
      adminId: updatedModule.adminId,
      createdAt: updatedModule.createdAt,
      updatedAt: updatedModule.updatedAt,
      admin: updatedModule.admin,
    });
  } catch (error) {
    next(error);
  }
};

export const getAvailableModules = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const secret = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : authHeader;
    const superAdminSecret = process.env.SUPERADMIN_SECRET;

    if (!superAdminSecret) {
      res.status(500).json({ error: "Server configuration error" });
      return;
    }

    if (secret !== superAdminSecret) {
      res.status(403).json({ error: "Invalid super admin secret" });
      return;
    }

    const availableModules = websocketService.getAvailableModules();
    console.log(`API: Returning ${availableModules.length} available modules`);

    res.status(200).json({ modules: availableModules });
  } catch (error) {
    next(error);
  }
};

export const pairModule = async (
  req: Request<{}, {}, PairModuleRequest>,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      macAddress,
      adminId,
      moduleName,
      description,
      location,
      numLockers,
      secret,
    } = req.body;
    const superAdminSecret = process.env.SUPERADMIN_SECRET;

    if (!superAdminSecret || secret !== superAdminSecret) {
      res.status(403).json({ error: "Invalid super admin secret" });
      return;
    }

    // Check if admin exists
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      res.status(404).json({ error: "Admin not found" });
      return;
    }

    // Generate unique module ID and device ID
    const moduleId = generateNFCCode(); // Reuse NFC generation for unique IDs
    const deviceId = `DEV_${moduleId.substring(0, 8).toUpperCase()}`;

    // Check if deviceId already exists (very unlikely but safety check)
    const existingModule = await prisma.module.findUnique({
      where: { deviceId },
    });

    if (existingModule) {
      res
        .status(409)
        .json({ error: "Generated device ID collision, try again" });
      return;
    }

    // Create module in database
    const module = await prisma.module.create({
      data: {
        name: moduleName,
        deviceId,
        description,
        location,
        adminId,
      },
    });

    // Generate locker IDs
    const lockerIds: string[] = [];
    const lockers: LockerResponse[] = [];

    for (let i = 1; i <= numLockers; i++) {
      const lockerId = `L${i.toString().padStart(2, "0")}`;
      lockerIds.push(lockerId);

      const locker = await prisma.locker.create({
        data: {
          lockerId,
          moduleId: module.id,
        },
      });

      lockers.push({
        id: locker.id,
        lockerId: locker.lockerId,
        createdAt: locker.createdAt,
        updatedAt: locker.updatedAt,
      });
    }

    // Send configuration to the physical module
    const configSuccess = websocketService.configureModule(
      macAddress,
      deviceId,
      lockerIds
    );

    if (!configSuccess) {
      // Rollback database changes
      await prisma.module.delete({ where: { id: module.id } });
      res.status(400).json({ error: "Failed to configure physical module" });
      return;
    }

    res.status(201).json({
      module: {
        id: module.id,
        name: module.name,
        deviceId: module.deviceId,
        description: module.description,
        location: module.location,
        adminId: module.adminId,
        createdAt: module.createdAt,
        updatedAt: module.updatedAt,
        lockers,
      },
      message: "Module paired and configured successfully",
    });
  } catch (error) {
    next(error);
  }
};
