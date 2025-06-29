import { Router } from "express";
import {
  getModules,
  getModuleById,
  updateModule,
  getLockersByModule,
  getLockerById,
  getLockerStatuses,
  getLockerStats,
  adminUnlockLocker,
  forceCheckoutRental,
  getRentalHistory,
} from "../controllers/adminModuleController";
import { authenticateAdmin } from "../middleware/adminAuth";
import { validateBody, validateParams } from "../utils/validation";
import { UpdateModuleSchema } from "../schemas/module";
import { z } from "zod";

const router = Router();

router.use(authenticateAdmin);

// Module routes
router.get("/modules", getModules);
router.get("/modules/:id", getModuleById);
router.patch("/modules/:id", validateBody(UpdateModuleSchema), updateModule);

// Locker routes
router.get("/modules/:moduleId/lockers", getLockersByModule);
router.get("/lockers/:lockerId", getLockerById);
router.get("/lockers/status", getLockerStatuses);
router.get("/lockers/stats", getLockerStats);
router.post("/lockers/:lockerId/unlock", adminUnlockLocker);
router.get("/lockers/:lockerId/rentals", getRentalHistory);

// Rental routes
router.post("/rentals/force-checkout", forceCheckoutRental);

export default router;
