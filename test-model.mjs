import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
for (const m of ['gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest']) {
  try {
    const res = await ai.models.generateContent({ model: m, contents: 'Hi' });
    console.log(m, 'SUCCESS');
  } catch (e) {
    console.log(m, 'ERROR:', e.message);
  }
}
