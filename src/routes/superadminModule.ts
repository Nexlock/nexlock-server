import { Router } from "express";
import {
  createModule,
  deleteModule,
  editModuleDeviceId,
  createAdminWithSystem,
} from "../controllers/superadminModuleController";
import { validateBody } from "../utils/validation";
import {
  CreateAdminWithSystemSchema,
  CreateModuleSchema,
  DeleteModuleSchema,
  EditModuleSchema,
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

export default router;
