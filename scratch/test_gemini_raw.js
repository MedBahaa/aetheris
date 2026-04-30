const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiRaw() {
  const key = "AIzaSyD8A38FTxAycSJAjk7jQ0ZpC9FcJc13Ks0";
  console.log("--- Testing Gemini Raw Connection ---");
  
  const genAI = new GoogleGenerativeAI(key);
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent("Fais une analyse boursière très courte (1 phrase) sur AKDITAL.");
    const response = await result.response;
    console.log("✅ Success! Gemini says:");
    console.log(response.text());
  } catch (e) {
    console.error("❌ Critical API Error:", e.message);
  }
}

testGeminiRaw();
