'use server';

/**
 * @fileOverview Provides AI-powered suggestions for the next gate or sequence of gates to optimize a quantum circuit.
 *
 * - suggestNextGate - A function that provides suggestions for optimizing quantum circuits.
 * - SuggestNextGateInput - The input type for the suggestNextGate function.
 * - SuggestNextGateOutput - The return type for the suggestNextGate function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestNextGateInputSchema = z.object({
  circuitState: z
    .string()
    .describe('The current state of the quantum circuit, represented as QASM code.'),
  targetFunction: z
    .string()
    .describe(
      'The target function or desired outcome of the quantum circuit, described in natural language.'
    ),
});
export type SuggestNextGateInput = z.infer<typeof SuggestNextGateInputSchema>;

const SuggestNextGateOutputSchema = z.object({
  suggestion: z
    .string()
    .describe(
      'The AI-powered suggestion for the next gate or sequence of gates to optimize the quantum circuit, including a rationale for the suggestion.'
    ),
});
export type SuggestNextGateOutput = z.infer<typeof SuggestNextGateOutputSchema>;

export async function suggestNextGate(input: SuggestNextGateInput): Promise<SuggestNextGateOutput> {
  return suggestNextGateFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestNextGatePrompt',
  input: {schema: SuggestNextGateInputSchema},
  output: {schema: SuggestNextGateOutputSchema},
  prompt: `You are an AI-powered quantum circuit optimization assistant. Your task is to suggest the next gate or sequence of gates to optimize a given quantum circuit, based on its current state and the target function.

  Current Circuit State (QASM code):
  {{circuitState}}

  Target Function:
  {{targetFunction}}

  Based on the current state of the circuit and the target function, provide a suggestion for the next gate or sequence of gates to apply. Include a brief rationale for your suggestion. Be as specific as possible, including the qubit indices the gate(s) should be applied to.
  `,
});

const suggestNextGateFlow = ai.defineFlow(
  {
    name: 'suggestNextGateFlow',
    inputSchema: SuggestNextGateInputSchema,
    outputSchema: SuggestNextGateOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
