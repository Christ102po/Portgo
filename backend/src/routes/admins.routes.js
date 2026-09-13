const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const { requireAuth, requireRole } = require("../middleware/auth");
const { adminCreateSchema, adminUpdateSchema, adminResetPasswordSchema } = require("../schemas");
const controller = require("../controllers/admins.controller");

const router = express.Router();

router.use(requireAuth, requireRole("SUPER_ADMIN"));

router.get("/", asyncHandler(controller.list));
router.post("/", validate(adminCreateSchema), asyncHandler(controller.create));
router.put("/:id", validate(adminUpdateSchema), asyncHandler(controller.update));
router.patch("/:id/password", validate(adminResetPasswordSchema), asyncHandler(controller.resetPassword));

module.exports = router;
