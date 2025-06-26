import { Router } from "express";
import {
  createRegistrationCode,
  deleteRegistrationCode,
  registerAdmin,
  loginAdmin,
} from "../controllers/adminAuthController";
import { authenticateAdmin } from "../middleware/adminAuth";
import { validateBody } from "../utils/validation";
import {
  CreateRegistrationCodeSchema,
  RegisterAdminSchema,
  LoginSchema,
} from "../schemas/auth";

const router = Router();

router.post(
  "/registration-codes",
  validateBody(CreateRegistrationCodeSchema),
  createRegistrationCode
);
router.delete(
  "/registration-codes/:code",
  authenticateAdmin,
  deleteRegistrationCode
);
router.post("/register", validateBody(RegisterAdminSchema), registerAdmin);
router.post("/login", validateBody(LoginSchema), loginAdmin);

export default router;
