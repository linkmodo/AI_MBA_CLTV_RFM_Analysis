
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Vite exposes env variables with VITE_ prefix via import.meta.env
// API key should be stored in .env file as VITE_GEMINI_API_KEY
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
    console.error("VITE_GEMINI_API_KEY is not set in environment variables");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

/**
 * Sends a prompt to the Gemini API and returns the text response.
 * @param prompt The text prompt to send to the model.
 * @returns A promise that resolves to the AI's text response.
 */
export const getAiAnalysis = async (prompt: string): Promise<string> => {
    try {
        // Guidelines recommend 'gemini-2.5-flash' for basic text tasks.
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        // Guidelines specify using response.text to get the output.
        return response.text;
    } catch (error) {
        console.error("Error getting AI analysis:", error);
        // Re-throw the error to be handled by the calling component.
        throw new Error("Failed to communicate with the AI service.");
    }
};
