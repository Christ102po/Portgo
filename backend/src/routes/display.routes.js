const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const controller = require("../controllers/display.controller");

const router = express.Router();

router.get("/board", asyncHandler(controller.getBoard));

module.exports = router;
