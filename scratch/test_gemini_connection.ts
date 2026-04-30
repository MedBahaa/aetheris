import { GeminiService } from '../src/lib/gemini';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testGemini() {
  console.log("--- Testing Gemini AI Connection ---");
  console.log("API Key present:", !!process.env.GEMINI_API_KEY);

  const mockNews = {
    globalSentiment: 'POSITIF' as any,
    probableImpact: 'Très fort',
    news: [{ summary: 'Records de bénéfices pour 2025' } as any]
  };

  const mockMarket = {
    price: '1168.00 MAD',
    marketSituation: 'Tendance haussière franche',
    rsi: { value: '65', interpretation: 'Haussier' },
    support: '1150',
    resistance: '1200'
  };

  try {
    const result = await GeminiService.synthesizeAnalysis('AKDITAL', mockNews, mockMarket);
    if (result) {
      console.log("✅ Success! Gemini returned analysis:");
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log("❌ Failed: Gemini returned null.");
    }
  } catch (e: any) {
    console.error("❌ Error:", e.message);
  }
}

testGemini();
