const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const { otpSendSchema, otpVerifySchema } = require("../schemas");
const controller = require("../controllers/otp.controller");

const router = express.Router();

router.post("/send", validate(otpSendSchema), asyncHandler(controller.send));
router.post("/verify", validate(otpVerifySchema), asyncHandler(controller.verify));

module.exports = router;
