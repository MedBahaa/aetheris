import { GoogleGenerativeAI } from '@google/generative-ai';

async function list() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  try {
    const result = await genAI.listModels();
    console.log("Available models:");
    result.models.forEach(m => {
      console.log(`- ${m.name} (${m.displayName})`);
    });
  } catch (e) {
    console.error("Failed to list models:", e);
  }
}

list();
