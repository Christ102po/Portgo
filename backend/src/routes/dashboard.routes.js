const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const controller = require("../controllers/dashboard.controller");

const router = express.Router();

router.get("/stats", requireAuth, asyncHandler(controller.getStats));
router.get("/details", requireAuth, asyncHandler(controller.getDetails));

module.exports = router;
