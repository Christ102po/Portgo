const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const controller = require("../controllers/tickets.controller");

const router = express.Router();

router.get("/check-duplicate", asyncHandler(controller.checkDuplicate));

module.exports = router;
