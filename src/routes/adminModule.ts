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
  getModuleStatus,
} from "../controllers/adminModuleController";
import { authenticateAdmin } from "../middleware/adminAuth";
import { validateBody } from "../utils/validation";
import { UpdateModuleSchema } from "../schemas/module";

const router = Router();

router.use(authenticateAdmin);

// Debug middleware to log all requests
router.use((req, res, next) => {
  console.log(`Admin Module Route: ${req.method} ${req.path}`);
  console.log(`Full URL: ${req.originalUrl}`);
  console.log(`Query params:`, req.query);
  next();
});

// Module routes
router.get("/modules", getModules);
router.get("/modules/:id", getModuleById);
router.get("/modules/:id/status", getModuleStatus);
router.patch("/modules/:id", validateBody(UpdateModuleSchema), updateModule);
router.get("/modules/:moduleId/lockers", getLockersByModule);

// Locker status and stats routes - moved to top level
router.get("/lockers/status", getLockerStatuses);
router.get("/lockers/stats", getLockerStats);

// Individual locker routes
router.get("/lockers/:lockerId", getLockerById);
router.get("/lockers/:lockerId/rentals", getRentalHistory);
router.post("/lockers/:lockerId/unlock", adminUnlockLocker);

// Rental routes
router.post("/rentals/force-checkout", forceCheckoutRental);

export default router;
