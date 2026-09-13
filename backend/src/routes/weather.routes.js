const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const controller = require("../controllers/weather.controller");

const router = express.Router();

router.get("/", asyncHandler(controller.getCurrentWeather));

module.exports = router;
