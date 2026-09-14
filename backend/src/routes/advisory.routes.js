const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const { requireAuth } = require("../middleware/auth");
const { advisoryUpdateSchema, advisoryCancelAllSchema } = require("../schemas");
const controller = require("../controllers/advisory.controller");

const router = express.Router();

router.get("/", asyncHandler(controller.getAdvisory));
router.put("/", requireAuth, validate(advisoryUpdateSchema), asyncHandler(controller.updateAdvisory));
router.post(
  "/cancel-all-schedules",
  requireAuth,
  validate(advisoryCancelAllSchema),
  asyncHandler(controller.cancelAllActiveSchedules)
);
router.post("/broadcast-sms", requireAuth, asyncHandler(controller.broadcastSms));

module.exports = router;
