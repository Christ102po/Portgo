const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const { requireAuth, requireRole } = require("../middleware/auth");
const { watchlistCreateSchema, watchlistUpdateSchema } = require("../schemas");
const controller = require("../controllers/watchlist.controller");

const router = express.Router();

router.use(requireAuth, requireRole("SUPER_ADMIN", "ADMIN"));

router.get("/", asyncHandler(controller.list));
router.post("/", validate(watchlistCreateSchema), asyncHandler(controller.create));
router.put("/:id", validate(watchlistUpdateSchema), asyncHandler(controller.update));
router.delete("/:id", asyncHandler(controller.remove));

module.exports = router;
