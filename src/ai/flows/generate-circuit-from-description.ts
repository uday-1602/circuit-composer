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
  prompt: `You are a quantum circuit design assistant. Your task is to generate a quantum circuit diagram, as QASM 2.0 code, based on a natural language description of the desired circuit functionality.

You MUST adhere to the following strict QASM 2.0 format:
1. Start with 'OPENQASM 2.0;'.
2. Include the standard library with 'include "qelib1.inc";'.
3. Declare the quantum register using 'qreg q[n];', where 'n' is the number of qubits.
4. Declare the classical register using 'creg c[n];', where 'n' is the same number of qubits. The classical register must have the same size as the quantum register.
5. Do not use 'qubit q[n];'. Always use 'qreg q[n];'.

Example for a 2-qubit circuit:
OPENQASM 2.0;
include "qelib1.inc";
qreg q[2];
creg c[2];
h q[0];
cx q[0],q[1];

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
