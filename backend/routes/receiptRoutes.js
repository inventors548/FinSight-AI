
const express = require("express");
const multer = require("multer");

const protect = require("../middleware/authMiddleware");
const { scanReceipt } = require("../controllers/receiptController");

const router = express.Router();

// Store uploaded images temporarily in memory.
const storage = multer.memoryStorage();

// Accept only JPEG, PNG and WEBP images.
const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
];

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1
    },
    fileFilter: (req, file, cb) => {
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return cb(
                new Error("Only JPEG, PNG and WEBP receipt images are allowed.")
            );
        }

        cb(null, true);
    }
});

// Verify actual image signatures instead of trusting MIME type alone.
const validateImageSignature = (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: "Please upload a receipt image."
        });
    }

    const buffer = req.file.buffer;

    const isJPEG =
        buffer.length >= 3 &&
        buffer[0] === 0xFF &&
        buffer[1] === 0xD8 &&
        buffer[2] === 0xFF;

    const isPNG =
        buffer.length >= 8 &&
        buffer.subarray(0, 8).equals(
            Buffer.from([
                0x89, 0x50, 0x4E, 0x47,
                0x0D, 0x0A, 0x1A, 0x0A
            ])
        );

    const isWEBP =
        buffer.length >= 12 &&
        buffer.toString("ascii", 0, 4) === "RIFF" &&
        buffer.toString("ascii", 8, 12) === "WEBP";

    const validSignature =
        (req.file.mimetype === "image/jpeg" && isJPEG) ||
        (req.file.mimetype === "image/png" && isPNG) ||
        (req.file.mimetype === "image/webp" && isWEBP);

    if (!validSignature) {
        return res.status(400).json({
            success: false,
            message: "The uploaded file does not match a supported image format."
        });
    }

    next();
};

// Convert Multer errors into JSON responses.
const handleReceiptUpload = (req, res, next) => {
    upload.single("receipt")(req, res, (error) => {
        if (error) {
            const isSizeError = error.code === "LIMIT_FILE_SIZE";

            return res.status(isSizeError ? 413 : 400).json({
                success: false,
                message: isSizeError
                    ? "Receipt image must be smaller than 5 MB."
                    : error.message || "Receipt upload failed."
            });
        }

        next();
    });
};

// All receipt endpoints require authentication.
router.use(protect);

// POST /api/receipts/scan
router.post(
    "/scan",
    handleReceiptUpload,
    validateImageSignature,
    scanReceipt
);

module.exports = router;
