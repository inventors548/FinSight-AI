
const { GoogleGenAI } = require("@google/genai");

if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing from environment variables");
}

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

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

module.exports = {
    generateGeminiResponse
};
