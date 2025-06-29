import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AuthUserSchema, type AuthUser } from "../schemas/auth";
import type { SignOptions } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export const generateJWT = (user: AuthUser): string => {
  // Validate user object with Zod
  const validatedUser = AuthUserSchema.parse(user);

  return jwt.sign(
    {
      id: validatedUser.id,
      email: validatedUser.email,
      name: validatedUser.name,
      type: validatedUser.type,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN } as SignOptions
  );
};

export const verifyJWT = (token: string): AuthUser | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return AuthUserSchema.parse(decoded);
  } catch {
    return null;
  }
};
