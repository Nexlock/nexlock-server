import { z } from "zod";

export const CreateModuleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  deviceId: z.string().min(1, "Device ID is required"),
  description: z.string().optional(),
  location: z.string().optional(),
  adminId: z.string().min(1, "Admin ID is required"),
  secret: z.string().min(1, "Secret is required"),
  lockerIds: z.array(z.string()).optional(),
});

export const CreateAdminWithSystemSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Invalid email format").optional(),
  modules: z
    .array(
      z.object({
        name: z.string().min(1, "Module name is required"),
        deviceId: z.string().min(1, "Device ID is required"),
        description: z.string().optional(),
        location: z.string().optional(),
        lockerIds: z.array(z.string()),
      })
    )
    .min(1, "At least one module is required"),
  secret: z.string().min(1, "Secret is required"),
});

export const EditModuleSchema = z.object({
  deviceId: z.string().min(1, "Device ID is required"),
  secret: z.string().min(1, "Secret is required"),
});

export const UpdateModuleSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    location: z.string().optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.description !== undefined ||
      data.location !== undefined,
    {
      message:
        "At least one field (name, description, location) must be provided",
    }
  );

export const LockerResponseSchema = z.object({
  id: z.string(),
  lockerId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ModuleResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  deviceId: z.string(),
  description: z.string().optional(),
  location: z.string().optional(),
  adminId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  lockers: z.array(LockerResponseSchema).optional(),
});

export const DeleteModuleSchema = z.object({
  secret: z.string().min(1, "Secret is required"),
});

export type CreateModuleRequest = z.infer<typeof CreateModuleSchema>;
export type CreateAdminWithSystemRequest = z.infer<
  typeof CreateAdminWithSystemSchema
>;
export type EditModuleRequest = z.infer<typeof EditModuleSchema>;
export type UpdateModuleRequest = z.infer<typeof UpdateModuleSchema>;
export type ModuleResponse = z.infer<typeof ModuleResponseSchema>;
export type LockerResponse = z.infer<typeof LockerResponseSchema>;
export type DeleteModuleRequest = z.infer<typeof DeleteModuleSchema>;
