'use server';
/**
 * @fileOverview This file defines a Genkit flow that generates a quantum circuit diagram from a natural language description.
 *
 * It includes:
 * - generateCircuitFromDescription - A function to generate a quantum circuit diagram from a natural language description.
 * - GenerateCircuitFromDescriptionInput - The input type for the generateCircuitFromDescription function.
 * - GenerateCircuitFromDescriptionOutput - The return type for the generateCircuitFromDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCircuitFromDescriptionInputSchema = z.object({
  description: z.string().describe('A natural language description of the desired quantum circuit functionality.'),
});
export type GenerateCircuitFromDescriptionInput = z.infer<typeof GenerateCircuitFromDescriptionInputSchema>;

const GenerateCircuitFromDescriptionOutputSchema = z.object({
  circuitDiagram: z.string().describe('A text representation of the generated quantum circuit diagram, as QASM 2.0 code.'),
});
export type GenerateCircuitFromDescriptionOutput = z.infer<typeof GenerateCircuitFromDescriptionOutputSchema>;

export async function generateCircuitFromDescription(input: GenerateCircuitFromDescriptionInput): Promise<GenerateCircuitFromDescriptionOutput> {
  return generateCircuitFromDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCircuitFromDescriptionPrompt',
  input: {schema: GenerateCircuitFromDescriptionInputSchema},
  output: {schema: GenerateCircuitFromDescriptionOutputSchema},
  prompt: `You are a quantum circuit design assistant.  You will generate a quantum circuit diagram, as QASM 2.0 code, based on a natural language description of the desired circuit functionality. Ensure the output is valid QASM 2.0.

Description: {{{description}}}
`,
});

const generateCircuitFromDescriptionFlow = ai.defineFlow(
  {
    name: 'generateCircuitFromDescriptionFlow',
    inputSchema: GenerateCircuitFromDescriptionInputSchema,
    outputSchema: GenerateCircuitFromDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
