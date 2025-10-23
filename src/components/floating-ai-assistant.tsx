"use client";

import { useState, useTransition } from 'react';
import type { CircuitState } from '@/types/circuit';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { circuitToQasm, qasmToCircuit } from '@/lib/circuit-utils';
import { generateCircuitFromDescription } from '@/ai/flows/generate-circuit-from-description';
import { suggestNextGate } from '@/ai/flows/suggest-next-gate';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2 } from 'lucide-react';
import { Separator } from './ui/separator';
import { v4 as uuidv4 } from 'uuid';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface FloatingAiAssistantProps {
  circuit: CircuitState;
  onCircuitUpdate: (circuit: CircuitState) => void;
}

export default function FloatingAiAssistant({ circuit, onCircuitUpdate }: FloatingAiAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [targetFunction, setTargetFunction] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [generatedQasm, setGeneratedQasm] = useState('');
  const [isGenerating, startGenerating] = useTransition();
  const [isSuggesting, startSuggesting] = useTransition();

  const { toast } = useToast();

  const handleGenerateCircuit = () => {
    if (!description) {
        toast({ title: 'Error', description: 'Please provide a circuit description.', variant: 'destructive' });
        return;
    }
    startGenerating(async () => {
        const result = await generateCircuitFromDescription({ description });
        if (result.circuitDiagram) {
            setGeneratedQasm(result.circuitDiagram);
            toast({ title: 'Circuit Generated', description: 'QASM code has been generated. You can now apply it.' });
        } else {
            toast({ title: 'Error', description: 'Could not generate circuit.', variant: 'destructive' });
        }
    });
  };

  const handleApplyGeneratedCircuit = () => {
    if (!generatedQasm) return;
    try {
        const newCircuitState = qasmToCircuit(generatedQasm, circuit);
        onCircuitUpdate({
            ...circuit,
            ...newCircuitState,
            gates: newCircuitState.gates?.map(g => ({...g, id: uuidv4()})) || []
        });
        toast({ title: "Circuit Applied", description: "AI-generated circuit has been built." });
        setIsOpen(false);
    } catch (error) {
        console.error("Failed to parse generated QASM:", error);
        toast({ title: 'Error', description: 'Failed to parse the generated QASM code.', variant: 'destructive' });
    }
  }

  const handleSuggestGate = () => {
    if (!targetFunction) {
        toast({ title: 'Error', description: 'Please provide a target function.', variant: 'destructive' });
        return;
    }
    const currentQasm = circuitToQasm(circuit);
    if (!currentQasm.trim() || circuit.gates.length === 0) {
      toast({ title: 'Error', description: 'Cannot make suggestion for an empty circuit.', variant: 'destructive' });
      return;
    }

    startSuggesting(async () => {
        const result = await suggestNextGate({ circuitState: currentQasm, targetFunction });
        if (result.suggestion) {
            setSuggestion(result.suggestion);
            toast({ title: 'Suggestion Ready', description: 'AI has provided an optimization suggestion.' });
        } else {
            toast({ title: 'Error', description: 'Could not generate suggestion.', variant: 'destructive' });
        }
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          className="fixed bottom-6 right-6 rounded-full w-16 h-16 shadow-lg z-50"
          aria-label="Open AI Assistant"
        >
          <Wand2 className="w-8 h-8" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] md:max-w-[600px] lg:max-w-[800px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>AI Assistant</DialogTitle>
          <DialogDescription>
            Use AI to generate circuits from descriptions or get suggestions for optimizations.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto p-1">
            {/* AI Circuit Generation */}
            <Card>
                <CardHeader>
                    <CardTitle>Generate Circuit</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <Textarea 
                        placeholder="e.g., A Bell state circuit for two qubits."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="mb-2 font-code"
                    />
                    <Button onClick={handleGenerateCircuit} disabled={isGenerating} className="w-full">
                        {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Generate QASM
                    </Button>
                    {generatedQasm && (
                        <>
                         <Textarea
                            value={generatedQasm}
                            readOnly
                            className="h-32 font-code text-xs bg-muted"
                         />
                         <Button onClick={handleApplyGeneratedCircuit} variant="default">
                            Apply to Circuit
                         </Button>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* AI Gate Suggestion */}
            <Card>
                <CardHeader>
                    <CardTitle>Suggest Next Gate</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                     <Textarea 
                        placeholder="Target: e.g., 'maximize entanglement' or 'correct a phase flip error'"
                        value={targetFunction}
                        onChange={(e) => setTargetFunction(e.target.value)}
                        className="mb-2 font-code"
                    />
                    <Button onClick={handleSuggestGate} disabled={isSuggesting} className="w-full">
                        {isSuggesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Suggest
                    </Button>
                    {suggestion && (
                        <div className="mt-2 p-2 bg-muted rounded-md text-sm">
                            <p className="font-semibold">Suggestion:</p>
                            <p className="font-code whitespace-pre-wrap">{suggestion}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
