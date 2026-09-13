const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const controller = require("../controllers/reports.controller");

const router = express.Router();

router.get("/summary", requireAuth, asyncHandler(controller.getSummary));
router.get("/export", requireAuth, asyncHandler(controller.exportReport));
router.get("/executive-summary", requireAuth, asyncHandler(controller.exportExecutiveSummary));

module.exports = router;
