const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const { familyBookingCreateSchema } = require("../schemas");
const controller = require("../controllers/familyBookings.controller");

const router = express.Router();

router.post("/", validate(familyBookingCreateSchema), asyncHandler(controller.create));
router.post("/:id/resend-sms", asyncHandler(controller.resendSms));

module.exports = router;
