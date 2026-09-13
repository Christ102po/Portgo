const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const { requireAuth } = require("../middleware/auth");
const { checkinScanSchema } = require("../schemas");
const controller = require("../controllers/checkin.controller");

const router = express.Router();

router.post("/scan", requireAuth, validate(checkinScanSchema), asyncHandler(controller.scan));
router.get("/activity", requireAuth, asyncHandler(controller.getRecentActivity));
router.get("/analytics", requireAuth, asyncHandler(controller.getBoardingAnalytics));
router.get("/audit-manifest/export", requireAuth, asyncHandler(controller.exportBoardingAuditManifest));

module.exports = router;
