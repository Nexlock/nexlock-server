import { z } from "zod";

export const AuthUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().min(1),
  type: z.enum(["user", "admin"]),
});

export const RegisterUserSchema = z.object({
  email: z.string().email("Invalid email format"),
  name: z.string().min(1, "Name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const RegisterAdminSchema = z.object({
  email: z.string().email("Invalid email format"),
  name: z.string().min(1, "Name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  registrationCode: z.string().min(1, "Registration code is required"),
});

export const CreateRegistrationCodeSchema = z.object({
  adminId: z.string().min(1, "Admin ID is required"),
  secret: z.string().min(1, "Secret is required"),
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export const AuthResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
  }),
});

export const CreateRegistrationCodeResponseSchema = z.object({
  code: z.string(),
  expiresAt: z.date(),
});

export type AuthUser = z.infer<typeof AuthUserSchema>;
export type RegisterUserRequest = z.infer<typeof RegisterUserSchema>;
export type RegisterAdminRequest = z.infer<typeof RegisterAdminSchema>;
export type CreateRegistrationCodeRequest = z.infer<
  typeof CreateRegistrationCodeSchema
>;
export type LoginRequest = z.infer<typeof LoginSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type CreateRegistrationCodeResponse = z.infer<
  typeof CreateRegistrationCodeResponseSchema
>;
