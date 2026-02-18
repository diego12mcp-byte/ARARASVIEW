import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getBiomeAnalysis = async (biomeName: string): Promise<AIAnalysisResult> => {
  const prompt = `
    Analyze the following Brazilian Cerrado phytophysiognomy: "${biomeName}".
    Provide a concise ecological description, its importance, typical flora (3-5 examples), and typical fauna (3-5 examples).
    Return the response in JSON format.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING, description: "A concise ecological description (max 2 sentences)." },
            ecology: { type: Type.STRING, description: "Ecological importance and soil characteristics." },
            flora: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of typical plant species." },
            fauna: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of typical animal species." },
          },
          required: ["description", "ecology", "flora", "fauna"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No text returned from Gemini");
    
    return JSON.parse(text) as AIAnalysisResult;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze biome.");
  }
};

export const generateBiomeImage = async (biomeName: string): Promise<string> => {
  const prompt = `Photorealistic landscape of the Brazilian Cerrado biome type: ${biomeName}. 
  High quality, nature photography style, sunny day, detailed vegetation.`;

  try {
    // Using gemini-2.5-flash-image for standard generation
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: prompt,
      config: {
        // No specific image config needed for 2.5 flash image regarding size/ratio for this simple use case,
        // but explicit config helps if we switch to pro models.
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Gemini Image Generation Error:", error);
    throw new Error("Failed to generate image.");
  }
};
