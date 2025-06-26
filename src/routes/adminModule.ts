import { Router } from "express";
import {
  getModules,
  getModuleById,
  updateModule,
} from "../controllers/adminModuleController";
import { authenticateAdmin } from "../middleware/adminAuth";

const router = Router();

router.use(authenticateAdmin);

router.get("/modules", getModules);
router.get("/modules/:id", getModuleById);
router.patch("/modules/:id", updateModule);

export default router;
