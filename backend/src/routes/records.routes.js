const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const { requireAuth } = require("../middleware/auth");
const { tripStatusUpdateSchema, tripRebookSchema } = require("../schemas");
const controller = require("../controllers/records.controller");

const router = express.Router();

router.get("/", requireAuth, asyncHandler(controller.list));
router.get("/export", requireAuth, asyncHandler(controller.exportCsv));
router.patch("/:id/status", requireAuth, validate(tripStatusUpdateSchema), asyncHandler(controller.updateStatus));
router.post("/:id/rebook", requireAuth, validate(tripRebookSchema), asyncHandler(controller.rebook));
router.patch("/:id/refund-processed", requireAuth, asyncHandler(controller.markRefundProcessed));

module.exports = router;
