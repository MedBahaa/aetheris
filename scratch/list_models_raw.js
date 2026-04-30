const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listAllModels() {
  const key = "AIzaSyD8A38FTxAycSJAjk7jQ0ZpC9FcJc13Ks0";
  console.log("--- Listing ALL Models ---");
  
  const genAI = new GoogleGenerativeAI(key);
  try {
     // Note: listModels is a method on the genAI instance in recent SDKs
     // If not available, we can try to fetch the models endpoint directly.
     const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
     const data = await response.json();
     console.log("Models found:");
     if (data.models) {
       data.models.forEach(m => console.log(`- ${m.name}`));
     } else {
       console.log("No models returned. Error:", JSON.stringify(data));
     }
  } catch (e) {
    console.error("❌ Diagnostic Error:", e.message);
  }
}

listAllModels();
