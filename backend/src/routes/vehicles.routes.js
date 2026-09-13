const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const controller = require("../controllers/vehicles.controller");

const router = express.Router();

router.get("/", requireAuth, asyncHandler(controller.list));

module.exports = router;
