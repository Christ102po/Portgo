const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const { requireAuth } = require("../middleware/auth");
const { shipCreateSchema, shipUpdateSchema, shipClassesUpdateSchema } = require("../schemas");
const controller = require("../controllers/ships.controller");

const router = express.Router();

router.get("/", asyncHandler(controller.list));
router.post("/", requireAuth, validate(shipCreateSchema), asyncHandler(controller.create));
router.put("/:id", requireAuth, validate(shipUpdateSchema), asyncHandler(controller.update));
router.delete("/:id", requireAuth, asyncHandler(controller.remove));
router.get("/:id/classes", asyncHandler(controller.listClasses));
router.put("/:id/classes", requireAuth, validate(shipClassesUpdateSchema), asyncHandler(controller.updateClasses));

module.exports = router;
