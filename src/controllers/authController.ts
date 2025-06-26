import type { Request, Response, NextFunction } from "express";
import { PrismaClient } from "../../generated/prisma";
import { hashPassword, generateJWT } from "../utils/auth";
import type { RegisterUserRequest, LoginRequest } from "../types/auth";
import passport from "../config/passport";

const prisma = new PrismaClient();

export const registerUser = async (
  req: Request<{}, {}, RegisterUserRequest>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
      res.status(400).json({ error: "Email, name, and password are required" });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ error: "User already exists" });
      return;
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
      },
    });

    const token = generateJWT({
      id: user.id,
      email: user.email,
      name: user.name,
      type: "user",
    });

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    next(error);
  }
};

export const loginUser = (
  req: Request<{}, {}, LoginRequest>,
  res: Response,
  next: NextFunction
) => {
  passport.authenticate(
    "user-local",
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
