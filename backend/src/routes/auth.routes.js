const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const { requireAuth } = require("../middleware/auth");
const { loginSchema } = require("../schemas");
const controller = require("../controllers/auth.controller");

const router = express.Router();

router.post("/login", validate(loginSchema), asyncHandler(controller.login));
router.get("/me", requireAuth, asyncHandler(controller.me));

module.exports = router;
