import { config } from 'dotenv';
config();

import '@/ai/flows/generate-circuit-from-description.ts';
import '@/ai/flows/suggest-next-gate.ts';