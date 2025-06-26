import type { Request, Response, NextFunction } from "express";
import { PrismaClient } from "../../generated/prisma";
import { hashPassword, generateJWT } from "../utils/auth";
import type { RegisterAdminRequest, LoginRequest } from "../types/auth";
import passport from "../config/passport";

const prisma = new PrismaClient();

export const createRegistrationCode = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const code = await prisma.registrationCode.create({
      data: {},
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

    const existingAdmin = await prisma.admin.findUnique({ where: { email } });
    if (existingAdmin) {
      res.status(409).json({ error: "Admin already exists" });
      return;
    }

    const regCode = await prisma.registrationCode.findUnique({
      where: { code: registrationCode },
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

    const hashedPassword = await hashPassword(password);

    const admin = await prisma.admin.create({
      data: {
        email,
        name,
        password: hashedPassword,
      },
    });

    await prisma.registrationCode.update({
      where: { code: registrationCode },
      data: { isUsed: true },
    });

    const token = generateJWT({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      type: "admin",
    });

    res.status(201).json({
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
