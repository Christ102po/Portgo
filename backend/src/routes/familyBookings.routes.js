const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const { familyBookingCreateSchema } = require("../schemas");
const controller = require("../controllers/familyBookings.controller");
const optionalAuth = require("../middleware/optionalAuth");

const router = express.Router();

router.post("/", optionalAuth, validate(familyBookingCreateSchema), asyncHandler(controller.create));

module.exports = router;
