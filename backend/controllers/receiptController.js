
const Transaction = require("../models/Transaction");
const { analyzeReceiptImage } = require("../services/geminiService");
const { categorizeTransaction } = require("../services/mlService");

const VALID_PAYMENT_METHODS = [
    "cash",
    "upi",
    "card",
    "bank_transfer",
    "other"
];

// Parse Gemini's JSON response safely.
const parseGeminiJSON = (text) => {
    if (!text || typeof text !== "string") {
        throw new Error("Gemini returned an empty response");
    }

    const cleanedText = text
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

    const start = cleanedText.indexOf("{");
    const end = cleanedText.lastIndexOf("}");

    if (start === -1 || end === -1 || end < start) {
        throw new Error("Could not find valid receipt JSON");
    }

    return JSON.parse(cleanedText.substring(start, end + 1));
};

// Validate receipt date.
const isValidReceiptDate = (date) => {
    if (!date) return false;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return false;
    }

    const parsed = new Date(`${date}T00:00:00.000Z`);

    return (
        !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === date
    );
};

// SCAN AND ANALYZE RECEIPT
const scanReceipt = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please upload a receipt image."
            });
        }

        // Analyze receipt using Gemini Vision.
        const geminiResponse = await analyzeReceiptImage(
            req.file.buffer,
            req.file.mimetype
        );

        const extracted = parseGeminiJSON(geminiResponse);

        if (extracted.isReceipt !== true) {
            return res.status(400).json({
                success: false,
                message: "The uploaded image does not appear to be a valid receipt."
            });
        }

        const merchant =
            typeof extracted.merchant === "string"
                ? extracted.merchant.trim()
                : "";

        const totalAmount = Number(extracted.totalAmount);

        if (
            !merchant ||
            extracted.totalAmount === null ||
            extracted.totalAmount === undefined ||
            !Number.isFinite(totalAmount) ||
            totalAmount <= 0
        ) {
            return res.status(422).json({
                success: false,
                message: "Could not reliably identify the merchant or final payable amount. Please upload a clearer receipt.",
                extractedData: extracted
            });
        }

        const receiptDate = isValidReceiptDate(extracted.date)
            ? extracted.date
            : null;

        const paymentMethod = VALID_PAYMENT_METHODS.includes(
            extracted.paymentMethod
        )
            ? extracted.paymentMethod
            : "other";

        const items = Array.isArray(extracted.items)
            ? extracted.items
                .filter((item) => item && typeof item.name === "string")
                .map((item) => ({
                    name: item.name.trim(),
                    quantity: Number(item.quantity) || 1,
                    price: Number(item.price) || 0
                }))
            : [];

        const description =
            typeof extracted.description === "string" &&
            extracted.description.trim()
                ? extracted.description.trim()
                : `Purchase at ${merchant}`;

        // Ask the existing ML service to predict the expense category.
        let categoryPrediction = {
            category: "Uncategorized",
            confidence: null,
            source: "fallback",
            needsReview: true
        };

        try {
            const mlResult = await categorizeTransaction(
                `${merchant} ${description}`
            );

            if (mlResult && mlResult.category) {
                categoryPrediction = {
                    category: mlResult.category,
                    confidence: mlResult.confidence ?? null,
                    source: "machine_learning",
                    needsReview: false
                };
            }
        } catch (mlError) {
            console.error(
                "Receipt ML categorization failed:",
                mlError.message
            );
        }

        // Check for possible duplicate expenses.
        let duplicateTransactions = [];

        if (receiptDate) {
            const startOfDay = new Date(
                `${receiptDate}T00:00:00.000Z`
            );

            const endOfDay = new Date(startOfDay);
            endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

            const candidates = await Transaction.find({
                userId: req.user.id,
                type: "expense",
                amount: totalAmount,
                date: {
                    $gte: startOfDay,
                    $lt: endOfDay
                }
            })
                .select("title amount date category")
                .limit(10)
                .lean();

            const normalizedMerchant = merchant.toLowerCase();

            duplicateTransactions = candidates.filter((transaction) => {
                const normalizedTitle = (
                    transaction.title || ""
                ).toLowerCase();

                return (
                    normalizedTitle.includes(normalizedMerchant) ||
                    normalizedMerchant.includes(normalizedTitle)
                );
            });
        }

        const warnings = Array.isArray(extracted.warnings)
            ? extracted.warnings.filter(
                (warning) => typeof warning === "string"
            )
            : [];

        if (!receiptDate) {
            warnings.push(
                "Receipt date could not be reliably identified. Please select the date manually."
            );
        }

        if (categoryPrediction.needsReview) {
            warnings.push(
                "Automatic category prediction was unavailable. Please review the category."
            );
        }

        if (duplicateTransactions.length > 0) {
            warnings.push(
                "A transaction with a matching amount, date and merchant may already exist."
            );
        }

        return res.status(200).json({
            success: true,
            message: "Receipt analyzed successfully.",
            receipt: {
                merchant,
                date: receiptDate,
                totalAmount,
                currency: extracted.currency || "INR",
                paymentMethod,
                items,
                tax: Number(extracted.tax) || 0,
                discount: Number(extracted.discount) || 0,
                description,
                extractedText: extracted.extractedText || "",
                warnings
            },
            categoryPrediction,
            possibleDuplicate: {
                found: duplicateTransactions.length > 0,
                transactions: duplicateTransactions
            }
        });

    } catch (error) {
        console.error("Receipt scanning error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to analyze receipt. Please try again.",
            error: process.env.NODE_ENV === "development"
                ? error.message
                : undefined
        });
    }
};

module.exports = {
    scanReceipt
};
