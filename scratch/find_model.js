const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
  const key = "AIzaSyD8A38FTxAycSJAjk7jQ0ZpC9FcJc13Ks0";
  console.log("--- Listing Available Models ---");
  
  const genAI = new GoogleGenerativeAI(key);
  try {
    const models = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 
    // Wait, the SDK has a listModels method in higher versions or different APIs.
    // I'll try with gemini-pro which is the most reliable one for v1beta.
    const result = await genAI.getGenerativeModel({ model: "gemini-pro" }).generateContent("Test");
    console.log("✅ gemini-pro works!");
  } catch (e) {
    console.log("❌ gemini-pro failed:", e.message);
  }

  try {
    const result = await genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" }).generateContent("Test");
    console.log("✅ gemini-1.5-flash-latest works!");
  } catch (e) {
    console.log("❌ gemini-1.5-flash-latest failed:", e.message);
  }
}

listModels();
