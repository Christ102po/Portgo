const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const { requireAuth } = require("../middleware/auth");
const { barangaySearchSchema, barangayImportSchema } = require("../schemas");
const controller = require("../controllers/barangayResidents.controller");

const router = express.Router();

// Public — the kiosk autocomplete needs this reachable without staff login.
router.get("/search", validate(barangaySearchSchema, "query"), asyncHandler(controller.search));

router.get("/", requireAuth, asyncHandler(controller.list));
router.post("/import", requireAuth, validate(barangayImportSchema), asyncHandler(controller.importCsv));

module.exports = router;
