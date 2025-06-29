import { Router } from "express";
import {
  createRegistrationCode,
  deleteRegistrationCode,
  registerAdmin,
  loginAdmin,
  getCurrentAdmin,
} from "../controllers/adminAuthController";
import { authenticateAdmin } from "../middleware/adminAuth";
import { validateBody } from "../utils/validation";
import {
  CreateRegistrationCodeSchema,
  RegisterAdminSchema,
  LoginSchema,
} from "../schemas/auth";

const router = Router();

// Superadmin endpoint - uses secret validation in controller, NO AUTH MIDDLEWARE
router.post(
  "/auth/registration-codes",
  validateBody(CreateRegistrationCodeSchema),
  createRegistrationCode
);
// Admin endpoint - requires admin auth
router.delete(
  "/auth/registration-codes/:code",
  authenticateAdmin,
  deleteRegistrationCode
);
// Registration endpoint - NO AUTH REQUIRED since we're creating the admin account
router.post("/auth/register", validateBody(RegisterAdminSchema), registerAdmin);
router.post("/auth/login", validateBody(LoginSchema), loginAdmin);
router.get("/me", authenticateAdmin, getCurrentAdmin);

export default router;
