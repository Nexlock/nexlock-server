import { z } from "zod";

export const CreateRentalSchema = z.object({
  lockerId: z.string().min(1, "Locker ID is required"),
});

export const LockUnlockRentalSchema = z.object({
  rentalId: z.string().min(1, "Rental ID is required"),
  action: z.enum(["lock", "unlock"]),
});

export const ExtendRentalSchema = z.object({
  rentalId: z.string().min(1, "Rental ID is required"),
  hours: z.number().min(1).max(24, "Extension must be between 1-24 hours"),
});

export const CheckoutRentalSchema = z.object({
  rentalId: z.string().min(1, "Rental ID is required"),
});

export const RentalResponseSchema = z.object({
  id: z.string(),
  lockerId: z.string(),
  userId: z.string(),
  startDate: z.date(),
  expiresAt: z.date(),
  isLocked: z.boolean(),
  locker: z.object({
    id: z.string(),
    lockerId: z.string(),
    module: z.object({
      id: z.string(),
      name: z.string(),
      deviceId: z.string(),
    }),
  }),
});

export const LockUnlockMessageSchema = z.object({
  moduleId: z.string(),
  lockerId: z.string(),
  action: z.enum(["lock", "unlock"]),
  timestamp: z.date(),
});

export const ModuleStatusUpdateSchema = z.object({
  moduleId: z.string(),
  lockerId: z.string(),
  status: z.enum(["locked", "unlocked"]),
  timestamp: z.date(),
});

export const LockerStatusSchema = z.object({
  moduleId: z.string(),
  lockerId: z.string(),
  occupied: z.boolean(),
  lastUpdate: z.date(),
});

export const ModuleStatusSchema = z.object({
  id: z.string(),
  name: z.string(),
  deviceId: z.string(),
  lockers: z.array(
    z.object({
      id: z.string(),
      lockerId: z.string(),
      occupied: z.boolean(),
      lastUpdate: z.date().nullable(),
    })
  ),
});

export type CreateRentalRequest = z.infer<typeof CreateRentalSchema>;
export type LockUnlockRentalRequest = z.infer<typeof LockUnlockRentalSchema>;
export type ExtendRentalRequest = z.infer<typeof ExtendRentalSchema>;
export type CheckoutRentalRequest = z.infer<typeof CheckoutRentalSchema>;
export type RentalResponse = z.infer<typeof RentalResponseSchema>;
export type LockUnlockMessage = z.infer<typeof LockUnlockMessageSchema>;
export type ModuleStatusUpdate = z.infer<typeof ModuleStatusUpdateSchema>;
