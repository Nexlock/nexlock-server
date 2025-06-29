import { Router } from "express";
import {
  registerUser,
  loginUser,
  getCurrentUser,
} from "../controllers/authController";
import { authenticateUser } from "../middleware/auth";
import { validateBody } from "../utils/validation";
import { RegisterUserSchema, LoginSchema } from "../schemas/auth";

const router = Router();

router.post("/register", validateBody(RegisterUserSchema), registerUser);
router.post("/login", validateBody(LoginSchema), loginUser);
router.get("/me", authenticateUser, getCurrentUser);

export default router;
