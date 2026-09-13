const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const { requireAuth, requireRole } = require("../middleware/auth");
const {
  scheduleCreateSchema,
  scheduleUpdateSchema,
  scheduleCancelSchema,
  scheduleDelaySchema,
  scheduleMaintenanceSchema,
  manifestSignOffSchema,
} = require("../schemas");
const controller = require("../controllers/schedules.controller");
const manifestController = require("../controllers/manifest.controller");

const router = express.Router();

router.get("/", asyncHandler(controller.list));
router.post("/", requireAuth, validate(scheduleCreateSchema), asyncHandler(controller.create));
router.put("/:id", requireAuth, validate(scheduleUpdateSchema), asyncHandler(controller.update));
router.delete("/:id", requireAuth, asyncHandler(controller.remove));
router.post("/:id/cancel", requireAuth, validate(scheduleCancelSchema), asyncHandler(controller.cancel));
router.post("/:id/delay", requireAuth, validate(scheduleDelaySchema), asyncHandler(controller.delay));
router.post("/:id/maintenance", requireAuth, validate(scheduleMaintenanceSchema), asyncHandler(controller.maintenance));
router.post("/:id/reactivate", requireAuth, asyncHandler(controller.reactivate));
router.get("/:id/manifest", requireAuth, asyncHandler(manifestController.getManifest));
router.get("/:id/manifest/export", requireAuth, asyncHandler(manifestController.exportManifest));
router.post(
  "/:id/manifest/signoff",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN", "GATE_SCANNER"),
  validate(manifestSignOffSchema),
  asyncHandler(manifestController.signOff)
);

module.exports = router;
