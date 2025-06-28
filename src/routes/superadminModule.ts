import { Router } from "express";
import {
  createModule,
  deleteModule,
  editModuleDeviceId,
  createAdminWithSystem,
  getAvailableModules,
  pairModule,
} from "../controllers/superadminModuleController";
import { validateBody } from "../utils/validation";
import {
  CreateAdminWithSystemSchema,
  CreateModuleSchema,
  DeleteModuleSchema,
  EditModuleSchema,
  PairModuleSchema,
} from "../schemas/module";

const router = Router();

router.post(
  "/admins",
  validateBody(CreateAdminWithSystemSchema),
  createAdminWithSystem
);
router.post("/modules", validateBody(CreateModuleSchema), createModule);
router.delete("/modules/:id", validateBody(DeleteModuleSchema), deleteModule);
router.patch(
  "/modules/:id/device-id",
  validateBody(EditModuleSchema),
  editModuleDeviceId
);
router.get("/available-modules", getAvailableModules);
router.post("/pair-module", validateBody(PairModuleSchema), pairModule);

export default router;
