import { Router } from "express";
import {
  createRental,
  lockUnlockRental,
  extendRental,
  checkoutRental,
  getUserRentals,
  getLockerStatuses,
  getRentalStatus, // Add this import
} from "../controllers/rentalController";
import { authenticateUser } from "../middleware/auth";
import { authenticateAdmin } from "../middleware/adminAuth";
import { validateBody } from "../utils/validation";
import {
  CreateRentalSchema,
  LockUnlockRentalSchema,
  ExtendRentalSchema,
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
router.get("/rentals/:rentalId/status", authenticateUser, getRentalStatus); // Add this route
router.post(
  "/rentals/lock-unlock",
  authenticateUser,
  validateBody(LockUnlockRentalSchema),
  lockUnlockRental
);
router.post(
  "/rentals/extend",
  authenticateUser,
  validateBody(ExtendRentalSchema),
  extendRental
);
router.post(
  "/rentals/checkout",
  authenticateUser,
  validateBody(CheckoutRentalSchema),
  checkoutRental
);

export default router;
