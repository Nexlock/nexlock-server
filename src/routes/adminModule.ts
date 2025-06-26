import { Router } from "express";
import {
  getModules,
  getModuleById,
  updateModule,
} from "../controllers/adminModuleController";
import { authenticateAdmin } from "../middleware/adminAuth";
import { validateBody } from "../utils/validation";
import { UpdateModuleSchema } from "../schemas/module";

const router = Router();

router.use(authenticateAdmin);

router.get("/modules", getModules);
router.get("/modules/:id", getModuleById);
router.patch("/modules/:id", validateBody(UpdateModuleSchema), updateModule);

export default router;
