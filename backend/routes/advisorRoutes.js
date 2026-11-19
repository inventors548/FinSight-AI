
const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  askFinancialAdvisor,
  previewTransaction
} = require("../controllers/advisorController");

// All Financial Advisor endpoints require authentication.
router.use(protect);

// Existing read-only Gemini Financial Advisor.
router.post("/ask", askFinancialAdvisor);

// New natural-language transaction preview.
router.post("/transaction-preview", previewTransaction);

module.exports = router;
