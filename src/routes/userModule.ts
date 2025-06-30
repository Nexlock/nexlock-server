import { Router } from "express";
import { getModules, getModuleById } from "../controllers/userModuleController";
import { authenticateUser } from "../middleware/auth";

const router = Router();

router.use(authenticateUser);

// Debug middleware to log all requests
router.use((req, res, next) => {
  console.log(`User Module Route: ${req.method} ${req.path}`);
  console.log(`Full URL: ${req.originalUrl}`);
  next();
});

// Module routes
router.get("/modules", getModules);
router.get("/modules/:id", getModuleById);

export default router;
