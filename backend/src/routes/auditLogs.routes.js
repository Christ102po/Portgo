const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth");
const controller = require("../controllers/auditLogs.controller");

const router = express.Router();

router.get("/", requireAuth, requireRole("SUPER_ADMIN"), asyncHandler(controller.list));

module.exports = router;
