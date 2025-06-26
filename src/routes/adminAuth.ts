import { Router } from "express";
import {
  createRegistrationCode,
  deleteRegistrationCode,
  registerAdmin,
  loginAdmin,
} from "../controllers/adminAuthController";
import { authenticateAdmin } from "../middleware/adminAuth";

const router = Router();

router.post("/registration-codes", createRegistrationCode);
router.delete(
  "/registration-codes/:code",
  authenticateAdmin,
  deleteRegistrationCode
);
router.post("/register", registerAdmin);
router.post("/login", loginAdmin);

export default router;
