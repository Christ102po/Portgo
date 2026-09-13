const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const { passengerCreateSchema, passengerSearchSchema, passengerRebookSchema, bookingLookupSchema } = require("../schemas");
const controller = require("../controllers/passengers.controller");
const optionalAuth = require("../middleware/optionalAuth");

const router = express.Router();

router.post("/", optionalAuth, validate(passengerCreateSchema), asyncHandler(controller.create));
router.get("/search", validate(passengerSearchSchema, "query"), asyncHandler(controller.search));
router.post("/:id/rebook", validate(passengerRebookSchema), asyncHandler(controller.rebook));
router.get("/lookup", validate(bookingLookupSchema, "query"), asyncHandler(controller.lookup));

module.exports = router;
