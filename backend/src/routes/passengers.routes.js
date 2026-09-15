const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const { passengerCreateSchema, passengerSearchSchema, passengerRebookSchema, bookingLookupSchema, kioskTripScanSchema } = require("../schemas");
const controller = require("../controllers/passengers.controller");

const router = express.Router();

router.post("/", validate(passengerCreateSchema), asyncHandler(controller.create));
router.get("/search", validate(passengerSearchSchema, "query"), asyncHandler(controller.search));
router.post("/:id/rebook", validate(passengerRebookSchema), asyncHandler(controller.rebook));
router.get("/lookup", validate(bookingLookupSchema, "query"), asyncHandler(controller.lookup));
router.get("/qr-profile", validate(bookingLookupSchema, "query"), asyncHandler(controller.kioskProfile));
router.get("/kiosk-time", asyncHandler(controller.kioskTime));
router.post("/kiosk-trip", validate(kioskTripScanSchema), asyncHandler(controller.recordKioskTrip));
router.post("/:id/resend-sms", asyncHandler(controller.resendSms));

module.exports = router;
