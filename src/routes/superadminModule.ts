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

// Test endpoint for secret verification
router.get("/test-auth", (req, res) => {
  const authHeader = req.headers.authorization;
  const secret = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : authHeader;
  const superAdminSecret = process.env.SUPERADMIN_SECRET;

  console.log("Test endpoint - Auth header:", authHeader);
  console.log("Test endpoint - Secret:", secret);
  console.log("Test endpoint - Expected secret exists:", !!superAdminSecret);

  if (!superAdminSecret || secret !== superAdminSecret) {
    res.status(403).json({ error: "Invalid super admin secret" });
    return;
  }

  res.status(200).json({ message: "Authentication successful" });
});

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
