import { Router } from "express";
import {
  createRental,
  validateNFC,
  checkoutRental,
  getUserRentals,
} from "../controllers/rentalController";
import { authenticateUser } from "../middleware/auth";
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

// Module routes (for ESP32 validation - no auth required)
router.post("/validate-nfc", validateBody(ValidateNFCSchema), validateNFC);

export default router;
