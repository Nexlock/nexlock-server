import { Router } from "express";
import {
  createRental,
  validateNFC,
  checkoutRental,
  getUserRentals,
  getLockerStatuses,
} from "../controllers/rentalController";
import { authenticateUser } from "../middleware/auth";
import { authenticateAdmin } from "../middleware/adminAuth";
import { validateBody } from "../utils/validation";
import {
  CreateRentalSchema,
  ValidateNFCSchema,
  CheckoutRentalSchema,
} from "../schemas/rental";

const router = Router();

// User routes (require user authentication)
router.post(
  "/rentals",
  authenticateUser,
  validateBody(CreateRentalSchema),
  createRental
);
router.get("/rentals", authenticateUser, getUserRentals);
router.post(
  "/rentals/checkout",
  authenticateUser,
  validateBody(CheckoutRentalSchema),
  checkoutRental
);

// Admin routes
router.get("/locker-statuses", authenticateAdmin, getLockerStatuses);

// Module routes (for ESP32 validation - no auth required)
router.post("/validate-nfc", validateBody(ValidateNFCSchema), validateNFC);

export default router;
