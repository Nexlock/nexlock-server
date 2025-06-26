import { Router } from "express";
import { registerUser, loginUser } from "../controllers/authController";
import { validateBody } from "../utils/validation";
import { RegisterUserSchema, LoginSchema } from "../schemas/auth";

const router = Router();

router.post("/register", validateBody(RegisterUserSchema), registerUser);
router.post("/login", validateBody(LoginSchema), loginUser);

export default router;
