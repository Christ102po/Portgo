const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const { requireAuth, requireRole } = require("../middleware/auth");
const {
  portGuidelineCreateSchema,
  portGuidelineUpdateSchema,
  emergencyHotlineCreateSchema,
  emergencyHotlineUpdateSchema,
} = require("../schemas");
const controller = require("../controllers/portInformation.controller");

const router = express.Router();

router.get("/public", asyncHandler(controller.listPublic));

router.use(requireAuth, requireRole("SUPER_ADMIN", "ADMIN"));
router.get("/", asyncHandler(controller.listAdmin));
router.post("/guidelines", validate(portGuidelineCreateSchema), asyncHandler(controller.createGuideline));
router.put("/guidelines/:id", validate(portGuidelineUpdateSchema), asyncHandler(controller.updateGuideline));
router.delete("/guidelines/:id", asyncHandler(controller.deleteGuideline));
router.post("/hotlines", validate(emergencyHotlineCreateSchema), asyncHandler(controller.createHotline));
router.put("/hotlines/:id", validate(emergencyHotlineUpdateSchema), asyncHandler(controller.updateHotline));
router.delete("/hotlines/:id", asyncHandler(controller.deleteHotline));

module.exports = router;
