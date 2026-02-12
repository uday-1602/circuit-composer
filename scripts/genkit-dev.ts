import { config } from 'dotenv';
config();

import '@/genkit/flows/generate-circuit-from-description.ts';
import '@/genkit/flows/suggest-next-gate.ts';