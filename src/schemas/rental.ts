import { z } from "zod";

export const CreateRentalSchema = z.object({
  lockerId: z.string().min(1, "Locker ID is required"),
});

export const ValidateNFCSchema = z.object({
  nfcCode: z.string().min(1, "NFC code is required"),
  moduleId: z.string().min(1, "Module ID is required"),
});

export const CheckoutRentalSchema = z.object({
  rentalId: z.string().min(1, "Rental ID is required"),
});

export const RentalResponseSchema = z.object({
  id: z.string(),
  lockerId: z.string(),
  nfcCode: z.string(),
  userId: z.string(),
  startDate: z.date(),
  endDate: z.date().nullable(),
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

export const NFCValidationResponseSchema = z.object({
  valid: z.boolean(),
  lockerId: z.string().optional(),
  message: z.string(),
});

export const UnlockMessageSchema = z.object({
  moduleId: z.string(),
  lockerId: z.string(),
  action: z.literal("unlock"),
  timestamp: z.date(),
});

export type CreateRentalRequest = z.infer<typeof CreateRentalSchema>;
export type ValidateNFCRequest = z.infer<typeof ValidateNFCSchema>;
export type CheckoutRentalRequest = z.infer<typeof CheckoutRentalSchema>;
export type RentalResponse = z.infer<typeof RentalResponseSchema>;
export type NFCValidationResponse = z.infer<typeof NFCValidationResponseSchema>;
export type UnlockMessage = z.infer<typeof UnlockMessageSchema>;
