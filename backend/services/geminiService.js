
const { GoogleGenAI } = require("@google/genai");

if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing from environment variables");
}

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

// =========================================
// GENERAL GEMINI TEXT RESPONSE
// =========================================

async function generateGeminiResponse(prompt) {
    try {
        if (!prompt || typeof prompt !== "string") {
            throw new Error("A valid prompt is required");
        }

        const response = await ai.models.generateContent({
            model: MODEL,
            contents: prompt
        });

        const generatedText = response.text;

        if (!generatedText) {
            throw new Error("Gemini returned an empty response");
        }

        return generatedText;

    } catch (error) {
        console.error("Gemini API Error:", error.message);
        throw error;
    }
}

// =========================================
// GEMINI VISION - SMART RECEIPT SCANNER
// =========================================

async function analyzeReceiptImage(imageBuffer, mimeType) {
    try {
        if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
            throw new Error("A valid receipt image is required");
        }

        const allowedMimeTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowedMimeTypes.includes(mimeType)) {
            throw new Error("Unsupported receipt image format");
        }

        const prompt = `
You are an expert financial receipt extraction AI.

Analyze the attached receipt image carefully.

Extract the receipt information and return ONLY valid JSON.
Do not include Markdown, explanations, or code fences.

Use this exact JSON structure:

{
  "isReceipt": true,
  "merchant": "Merchant or shop name",
  "date": "YYYY-MM-DD or null",
  "totalAmount": 0,
  "currency": "INR",
  "paymentMethod": "cash",
  "items": [
    {
      "name": "Item name",
      "quantity": 1,
      "price": 0
    }
  ],
  "tax": 0,
  "discount": 0,
  "description": "Short summary of the purchase",
  "extractedText": "Important readable receipt text",
  "warnings": []
}

IMPORTANT RULES:

1. Read the actual receipt. Never invent missing information.
2. Return isReceipt=false if the image is not a purchase receipt or bill.
3. totalAmount must be the final payable amount, not the subtotal.
4. Use null for an unreadable or unavailable date.
5. Do not guess the payment method. Use "other" if unknown.
6. paymentMethod must be one of:
   cash, upi, card, bank_transfer, other.
7. Use INR when the receipt clearly uses Indian Rupees.
8. Preserve item names and prices as accurately as possible.
9. Include warnings for unclear, cropped or unreadable information.
10. All numeric amounts must be numbers, not formatted currency strings.
11. If the total cannot be reliably identified, return totalAmount as null.
12. Do not mistake phone numbers, GST numbers, invoice numbers or
    item quantities for the payable amount.
13. Return the final amount actually payable by the customer.
`;

        const response = await ai.models.generateContent({
            model: MODEL,
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            text: prompt
                        },
                        {
                            inlineData: {
                                mimeType,
                                data: imageBuffer.toString("base64")
                            }
                        }
                    ]
                }
            ]
        });

        const generatedText = response.text;

        if (!generatedText) {
            throw new Error("Gemini returned an empty receipt analysis");
        }

        return generatedText;

    } catch (error) {
        console.error(
            "Gemini Receipt Analysis Error:",
            error.message
        );

        throw error;
    }
}

module.exports = {
    generateGeminiResponse,
    analyzeReceiptImage
};
