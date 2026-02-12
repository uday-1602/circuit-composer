import { genkit } from 'genkit';
import openai from '@genkit-ai/compat-oai';

export const ai = genkit({
  plugins: [
    openai({
      name: 'openai',
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    }),
  ],
  model: 'openai/llama-3.3-70b-versatile',
});
