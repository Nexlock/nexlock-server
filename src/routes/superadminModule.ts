import { Router } from "express";
import {
  createModule,
  deleteModule,
  editModuleDeviceId,
  createAdminWithSystem,
} from "../controllers/superadminModuleController";

const router = Router();

router.post("/admins", createAdminWithSystem);
router.post("/modules", createModule);
router.delete("/modules/:id", deleteModule);
router.patch("/modules/:id/device-id", editModuleDeviceId);

export default router;
