const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth");
const controller = require("../controllers/dev.controller");

const router = express.Router();

router.post("/seed-demo", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), asyncHandler(controller.seedDemo));

module.exports = router;
