
const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  askFinancialAdvisor
} = require("../controllers/advisorController");

// All financial advisor routes require JWT authentication.
router.use(protect);

// POST /api/advisor/ask
router.post("/ask", askFinancialAdvisor);

module.exports = router;
