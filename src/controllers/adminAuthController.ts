import type { Request, Response, NextFunction } from "express";
import { PrismaClient } from "../../generated/prisma";
import { hashPassword, generateJWT } from "../utils/auth";
import type {
  RegisterAdminRequest,
  LoginRequest,
  CreateRegistrationCodeRequest,
} from "../types/auth";
import passport from "../config/passport";

const prisma = new PrismaClient();

export const createRegistrationCode = async (
  req: Request<{}, {}, CreateRegistrationCodeRequest>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { adminId, secret } = req.body;
    const superAdminSecret = process.env.SUPERADMIN_SECRET;

    if (!adminId || !secret) {
      res.status(400).json({ error: "AdminId and secret are required" });
      return;
    }

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

    const code = await prisma.registrationCode.create({
      data: {
        adminId: adminId,
      },
    });

    res.status(201).json({
      code: code.code,
      expiresAt: code.expiresAt,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteRegistrationCode = async (
  req: Request<{ code: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { code } = req.params;

    const registrationCode = await prisma.registrationCode.findUnique({
      where: { code },
    });

    if (!registrationCode) {
      res.status(404).json({ error: "Registration code not found" });
      return;
    }

    await prisma.registrationCode.delete({
      where: { id: registrationCode.id },
    });

    res.status(200).json({ message: "Registration code deleted successfully" });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      res.status(404).json({ error: "Registration code not found" });
      return;
    }
    next(error);
  }
};

export const registerAdmin = async (
  req: Request<{}, {}, RegisterAdminRequest>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, name, password, registrationCode } = req.body;

    if (!email || !name || !password || !registrationCode) {
      res.status(400).json({
        error: "Email, name, password, and registration code are required",
      });
      return;
    }

    const regCode = await prisma.registrationCode.findUnique({
      where: { code: registrationCode },
      include: { admin: true },
    });

    if (!regCode) {
      res.status(400).json({ error: "Invalid registration code" });
      return;
    }

    if (regCode.isUsed) {
      res.status(400).json({ error: "Registration code already used" });
      return;
    }

    if (regCode.expiresAt < new Date()) {
      res.status(400).json({ error: "Registration code expired" });
      return;
    }

    if (!regCode.admin || !regCode.adminId) {
      res
        .status(400)
        .json({ error: "No admin associated with this registration code" });
      return;
    }

    // Check if email is already taken by another admin
    const existingAdmin = await prisma.admin.findUnique({ where: { email } });
    if (existingAdmin && existingAdmin.id !== regCode.adminId) {
      res.status(409).json({ error: "Email already taken" });
      return;
    }

    const hashedPassword = await hashPassword(password);

    // Update the existing admin with the registration details
    const admin = await prisma.admin.update({
      where: { id: regCode.adminId },
      data: {
        email,
        name,
        password: hashedPassword,
      },
    });

    // Mark registration code as used
    await prisma.registrationCode.update({
      where: { code: registrationCode },
      data: { isUsed: true },
    });

    // Ensure all fields are present before generating JWT
    if (!admin.email || !admin.name) {
      res.status(500).json({ error: "Admin registration incomplete" });
      return;
    }

    const token = generateJWT({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      type: "admin",
    });

    res.status(200).json({
      token,
      user: { id: admin.id, email: admin.email, name: admin.name },
    });
  } catch (error) {
    next(error);
  }
};

export const loginAdmin = (
  req: Request<{}, {}, LoginRequest>,
  res: Response,
  next: NextFunction
) => {
  passport.authenticate(
    "admin-local",
    { session: false },
    (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        res
          .status(401)
          .json({ error: info?.message || "Authentication failed" });
        return;
      }

      const token = generateJWT(user);

      res.json({
        token,
        user: { id: user.id, email: user.email, name: user.name },
      });
    }
  )(req, res, next);
};
