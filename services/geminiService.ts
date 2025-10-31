/**
 * Sends a prompt to the Gemini API via a secure serverless function.
 * The API key is kept on the server and never exposed to the browser.
 * 
 * @param prompt The text prompt to send to the model.
 * @returns A promise that resolves to the AI's text response.
 */
export const getAiAnalysis = async (prompt: string): Promise<string> => {
    try {
        // Call our serverless function instead of directly calling Gemini
        // This keeps the API key secure on the server side
        const functionUrl = import.meta.env.DEV 
            ? 'http://localhost:8888/.netlify/functions/gemini-proxy'  // Local development
            : '/.netlify/functions/gemini-proxy';  // Production

        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error("Error from serverless function:", errorData);
            throw new Error(errorData.error || 'Failed to get AI response');
        }

        const data = await response.json();
        return data.text || '';
        
    } catch (error) {
        console.error("Error getting AI analysis:", error);
        // Re-throw the error to be handled by the calling component.
        throw new Error("Failed to communicate with the AI service.");
    }
};
