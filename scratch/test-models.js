import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function testModels() {
  const modelsToTest = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro', 'gemini-pro'];
  for (const model of modelsToTest) {
    try {
      console.log(`Testing ${model}...`);
      const m = genAI.getGenerativeModel({ model });
      await m.generateContent('Hello');
      console.log(`Success: ${model} is supported!`);
      break;
    } catch (error: any) {
      console.log(`Failed ${model}: ${error.message}`);
    }
  }
}

testModels();
