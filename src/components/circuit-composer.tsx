
"use client";

import { useState, useCallback, DragEvent, useEffect } from 'react';
import type { CircuitState, Gate, GateInstance, EditorLanguage } from '@/types/circuit';
import GateLibrary from './gate-library';
import CircuitCanvas from './circuit-canvas';
import FloatingAiAssistant from './floating-ai-assistant';
import BlochSphere from './bloch-sphere';
import ProbabilityChart from './probability-chart';
import QasmEditor from './qasm-editor';
import { Button } from './ui/button';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { circuitToQasm, qasmToCircuit, circuitToQiskit, qiskitToCircuit } from '@/lib/circuit-utils';
import DensityMatrix from './density-matrix';
import type { Complex, Matrix } from '@/types/circuit';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

// --- Simulation Logic ---

const applyGate = (stateVector: Complex[], gate: GateInstance, numQubits: number): Complex[] => {
    const newState = [...stateVector];
    const n = 2 ** numQubits;

    // This is a placeholder for a more robust quantum simulation.
    // It currently handles H, X, and CNOT for basic state changes.
    if (gate.gate.name === 'H') {
        const q = gate.qubit;
        // Create a temporary vector to store the results before applying them
        const tempState = [...newState];
        for (let i = 0; i < n; i++) {
            const basisStateWithoutQ = i & ~(1 << q);
            const basisStateWithQ = i | (1 << q);
            if (!((i >> q) & 1)) { // qubit is |0>
                const otherStateCoeff = newState[basisStateWithQ];
                tempState[i] = { re: (newState[i].re + otherStateCoeff.re) / Math.sqrt(2), im: (newState[i].im + otherStateCoeff.im) / Math.sqrt(2) };
            } else { // qubit is |1>
                const otherStateCoeff = newState[basisStateWithoutQ];
                tempState[i] = { re: (otherStateCoeff.re - newState[i].re) / Math.sqrt(2), im: (otherStateCoeff.im - newState[i].im) / Math.sqrt(2) };
            }
        }
        return tempState;

    } else if (gate.gate.name === 'X') {
        const q = gate.qubit;
        const tempState = [...newState];
        for (let i = 0; i < n; i++) {
            if (!((i >> q) & 1)) { // if qubit is 0, swap with corresponding 1 state
                const j = i | (1 << q);
                const temp = tempState[i];
                tempState[i] = tempState[j];
                tempState[j] = temp;
            }
        }
        return tempState;
    } else if (gate.gate.name === 'CNOT') {
        const c = gate.qubit;
        const t = gate.targetQubit!;
        const tempState = [...newState];
        for (let i = 0; i < n; i++) {
            // Check if control bit is 1
            if ((i >> c) & 1) {
                 // if target is 0, swap with corresponding 1 state
                if (!((i >> t) & 1)) {
                    const j = i | (1 << t);
                    const temp = tempState[i];
                    tempState[i] = tempState[j];
                    tempState[j] = temp;
                }
            }
        }
        return tempState;
    } else if (gate.gate.name === 'Z') {
        const q = gate.qubit;
        for (let i = 0; i < n; i++) {
            if((i >> q) & 1) { // If qubit is 1
                newState[i] = { re: -newState[i].re, im: -newState[i].im };
            }
        }
    }
    // Note: S and T gates introduce phases, which are more complex to handle
    // without a full complex number matrix library. They are omitted for now.

    return newState;
}

const calculateStateVector = (circuit: CircuitState): Complex[] => {
    const { qubits, gates } = circuit;
    const numStates = 2 ** qubits;
    let stateVector: Complex[] = Array(numStates).fill({ re: 0, im: 0 });
    if (numStates > 0) {
        stateVector[0] = { re: 1, im: 0 };
    }


    const sortedGates = [...gates].sort((a, b) => a.timestep - b.timestep);

    for (const gate of sortedGates) {
        stateVector = applyGate(stateVector, gate, qubits);
    }

    return stateVector;
};

const calculateDensityMatrix = (stateVector: Complex[], numQubits: number, qubitIndex: number): Matrix => {
    const n = 2 ** numQubits;
    const rho: Matrix = [
        [{ re: 0, im: 0 }, { re: 0, im: 0 }],
        [{ re: 0, im: 0 }, { re: 0, im: 0 }]
    ];
    if (numQubits === 0) return rho;


    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            // Check if all other qubits are the same
            let traceOut = true;
            for(let k = 0; k < numQubits; k++) {
                if (k !== qubitIndex && ((i >> k) & 1) !== ((j >> k) & 1)) {
                    traceOut = false;
                    break;
                }
            }

            if (traceOut) {
                const bitI = (i >> qubitIndex) & 1;
                const bitJ = (j >> qubitIndex) & 1;

                // rho_ij += psi_i * conj(psi_j)
                const psi_i = stateVector[i];
                const psi_j_conj = { re: stateVector[j].re, im: -stateVector[j].im };

                const term = {
                    re: psi_i.re * psi_j_conj.re - psi_i.im * psi_j_conj.im,
                    im: psi_i.re * psi_j_conj.im + psi_i.im * psi_j_conj.re
                };

                rho[bitI][bitJ].re += term.re;
                rho[bitI][bitJ].im += term.im;
            }
        }
    }
    return rho;
};

const calculateQubitStateFromDensityMatrix = (rho: Matrix): { theta: number, phi: number } => {
    // This is a simplification. The state might be mixed.
    // We are extracting bloch vector components <X>, <Y>, <Z>
    // <X> = Tr(ρX), <Y> = Tr(ρY), <Z> = Tr(ρZ)
    const x = rho[0][1].re + rho[1][0].re;
    const y = rho[0][1].im - rho[1][0].im;
    const z = rho[0][0].re - rho[1][1].re;

    const r = Math.sqrt(x*x + y*y + z*z);
    if (r < 1e-9) return { theta: 0, phi: 0 }; // Handle zero vector case

    const theta = Math.acos(z / r);
    const phi = Math.atan2(y, x);

    return { theta, phi };
}


export default function CircuitComposer() {
  const [circuit, setCircuit] = useState<CircuitState>({
    qubits: 3,
    timesteps: 25,
    gates: [],
  });
  const [editorCode, setEditorCode] = useState('');
  const [editorLanguage, setEditorLanguage] = useState<EditorLanguage>('qasm');
  const [isTyping, setIsTyping] = useState(false);
  
  const { toast } = useToast();

  const [cnotDrop, setCnotDrop] = useState<{ qubit: number; timestep: number } | null>(null);
  const [selectedTargetQubit, setSelectedTargetQubit] = useState<string | undefined>(undefined);
  
  const [selectedQubit, setSelectedQubit] = useState<number | null>(0);
  const [blochState, setBlochState] = useState({ theta: 0, phi: 0 });
  
  const [probabilityData, setProbabilityData] = useState<Array<{ name: string; probability: number; fill: string }>>([]);
  const [densityMatrix, setDensityMatrix] = useState<Matrix>([[{ re: 1, im: 0 }, { re: 0, im: 0 }], [{ re: 0, im: 0 }, { re: 0, im: 0 }]]);


  const updateCircuitAndVisualizations = useCallback((newCircuit: CircuitState, fromEditor = false) => {
    setCircuit(newCircuit);

    const stateVector = calculateStateVector(newCircuit);
  
    // Update visualizations
    const probabilities = stateVector.map(c => c.re * c.re + c.im * c.im);
    const colors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
    setProbabilityData(Array.from({ length: 2 ** newCircuit.qubits }, (_, i) => ({
      name: `|${i.toString(2).padStart(newCircuit.qubits, '0')}⟩`,
      probability: probabilities[i] || 0,
      fill: colors[i % colors.length],
    })));
  
    const currentSelectedQubit = selectedQubit === null || selectedQubit >= newCircuit.qubits ? 0 : selectedQubit;
    
    if (newCircuit.qubits > 0) {
      if (selectedQubit !== null && selectedQubit >= newCircuit.qubits) {
        setSelectedQubit(0);
      }
      const dm = calculateDensityMatrix(stateVector, newCircuit.qubits, currentSelectedQubit);
      setDensityMatrix(dm);
      setBlochState(calculateQubitStateFromDensityMatrix(dm));
    } else {
      setSelectedQubit(null);
      setDensityMatrix([[{ re: 1, im: 0 }, { re: 0, im: 0 }], [{ re: 0, im: 0 }, { re: 0, im: 0 }]]);
      setBlochState({ theta: 0, phi: 0 });
    }
    
    // Sync editor unless the update came from the editor itself
    if (!fromEditor) {
      if (editorLanguage === 'qasm') {
          setEditorCode(circuitToQasm(newCircuit));
      } else {
          setEditorCode(circuitToQiskit(newCircuit));
      }
    }
  }, [selectedQubit, editorLanguage]);


  // Effect to handle all circuit updates and sync visualizations
  useEffect(() => {
    // This effect now primarily reacts to changes in circuit, selectedQubit, or editorLanguage
    // and calls the consolidated update function.
    updateCircuitAndVisualizations(circuit);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circuit, selectedQubit, editorLanguage]);

  // Effect to handle changes from editor
  useEffect(() => {
    if (!isTyping) return;
    const handler = setTimeout(() => {
      try {
        let newCircuitState;
        if (editorLanguage === 'qasm') {
          newCircuitState = qasmToCircuit(editorCode, circuit);
        } else {
          newCircuitState = qiskitToCircuit(editorCode, circuit);
        }
        const fullNewCircuit = {
          ...circuit,
          ...newCircuitState, 
          gates: newCircuitState.gates?.map(g => ({...g, id: uuidv4()})) || [] 
        };
        // We call updateCircuitAndVisualizations directly to avoid loops and keep the editor in sync
        updateCircuitAndVisualizations(fullNewCircuit, true); 
      } catch (error) {
        console.error("Code parsing error:", error);
        toast({ title: `${editorLanguage.toUpperCase()} Error`, description: "Could not parse code.", variant: "destructive" });
      }
    }, 500); // Debounce time

    return () => {
      clearTimeout(handler);
    };
  }, [editorCode, isTyping, toast, editorLanguage, circuit, updateCircuitAndVisualizations]);


  const handleSelectQubit = (qubitIndex: number | null) => {
    setSelectedQubit(qubitIndex);
  };
  
  const addQubit = () => {
    if (circuit.qubits >= 5) {
        toast({ title: 'Limit Reached', description: 'A maximum of 5 qubits is allowed for this demo.', variant: 'destructive' });
        return;
    }
    setCircuit(c => ({ ...c, qubits: c.qubits + 1 }));
  };

  const removeQubit = () => {
    if (circuit.qubits > 1) {
      const newQubits = circuit.qubits - 1;
      setCircuit(c => ({
        ...c,
        qubits: newQubits,
        gates: c.gates.filter(g => g.qubit < newQubits && (g.targetQubit === undefined || g.targetQubit < newQubits))
      }));
    }
  };

  const clearCircuit = () => {
    setCircuit(c => ({ ...c, gates: [] }));
  };
  
  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const gateJSON = e.dataTransfer.getData("gate");
    if (!gateJSON) return;
    
    const gate: Gate = JSON.parse(gateJSON);
    const target = e.target as HTMLElement;
    const dropZone = target.closest('[data-qubit][data-timestep]');

    if (dropZone) {
      const qubit = parseInt(dropZone.getAttribute('data-qubit')!, 10);
      const timestep = parseInt(dropZone.getAttribute('data-timestep')!, 10);

      const isOccupied = circuit.gates.some(g => 
        (g.qubit === qubit && g.timestep === timestep) ||
        (g.targetQubit === qubit && g.timestep === timestep)
      );

      if (isOccupied) {
        toast({
          title: "Error",
          description: "This position is already occupied.",
          variant: "destructive",
        })
        return;
      }
      
      if (gate.qubits > 1) {
        if (gate.name === "CNOT") {
            setSelectedTargetQubit(undefined);
            setCnotDrop({ qubit, timestep });
        }
      } else {
        const newGate: GateInstance = { id: uuidv4(), gate, qubit, timestep };
        setCircuit(c => ({ ...c, gates: [...c.gates, newGate] }));
      }
    }
  }, [circuit, toast]);

  const handleCnotPlacement = () => {
    if (cnotDrop && selectedTargetQubit !== undefined) {
        const targetQubit = parseInt(selectedTargetQubit, 10);

        if (cnotDrop.qubit === targetQubit) {
            toast({ title: "Invalid Target", description: "Control and target qubits cannot be the same.", variant: "destructive" });
            return;
        }

        const isTargetOccupied = circuit.gates.some(g => 
            (g.qubit === targetQubit && g.timestep === cnotDrop.timestep) ||
            (g.targetQubit === targetQubit && g.timestep === cnotDrop.timestep)
        );

        if (isTargetOccupied) {
            toast({ title: "Error", description: `Qubit ${targetQubit} is occupied at this timestep.`, variant: "destructive" });
            return;
        }

        const cnotGate = {
            id: uuidv4(),
            gate: { name: 'CNOT', label: 'CX', color: 'bg-purple-500', description: 'Controlled-NOT Gate', qubits: 2 },
            qubit: cnotDrop.qubit,
            timestep: cnotDrop.timestep,
            targetQubit: targetQubit,
        };
        setCircuit(c => ({...c, gates: [...c.gates, cnotGate]}));
    }
    setCnotDrop(null);
    setSelectedTargetQubit(undefined);
  }

  const removeGate = (gateId: string) => {
    setCircuit(c => ({...c, gates: c.gates.filter(g => g.id !== gateId)}));
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };
  
  const handleCircuitUpdateFromAI = (newCircuit: CircuitState) => {
    handleSelectQubit(null);
    updateCircuitAndVisualizations(newCircuit);
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <GateLibrary />
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-4 p-4 overflow-y-auto">
        
        <div className="xl:col-span-2 flex flex-col gap-4">
            <div className="flex items-center gap-2">
                <Button onClick={addQubit} size="sm"><Plus className="w-4 h-4 mr-2"/> Add Qubit</Button>
                <Button onClick={removeQubit} size="sm" variant="outline" disabled={circuit.qubits <= 1}><Minus className="w-4 h-4 mr-2"/> Remove Qubit</Button>
                <Button onClick={clearCircuit} size="sm" variant="destructive"><Trash2 className="w-4 h-4 mr-2"/> Clear All</Button>
            </div>
            
            <div className="flex-grow">
                <CircuitCanvas
                    circuit={circuit}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    removeGate={removeGate}
                    selectedQubit={selectedQubit}
                    onSelectQubit={handleSelectQubit}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <BlochSphere
                    theta={blochState.theta}
                    phi={blochState.phi}
                    selectedQubit={selectedQubit}
                    numQubits={circuit.qubits}
                    onSelectQubit={handleSelectQubit}
                 />
                 <Card className="flex-1 flex flex-col">
                    <CardHeader>
                         <CardTitle>State Probabilities</CardTitle>
                         <CardDescription>Probability of measuring each state.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex items-center justify-center">
                         <ProbabilityChart data={probabilityData} />
                    </CardContent>
                </Card>
            </div>
        </div>

        <div className="xl:col-span-1 flex flex-col gap-4">
            <QasmEditor 
                code={editorCode} 
                setCode={setEditorCode} 
                setIsTyping={setIsTyping}
                language={editorLanguage}
                setLanguage={setEditorLanguage}
            />
            <Card className="flex-1 flex flex-col">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Density Matrix</CardTitle>
                            <CardDescription>
                                { selectedQubit !== null ? `Matrix for Qubit ${selectedQubit}` : 'Select a qubit.'}
                            </CardDescription>
                        </div>
                        <Select value={selectedQubit?.toString()} onValueChange={(val) => handleSelectQubit(parseInt(val))}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select Qubit" />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.from({length: circuit.qubits}).map((_, i) => (
                                    <SelectItem key={i} value={i.toString()}>Qubit {i}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center">
                    {selectedQubit !== null ? <DensityMatrix matrix={densityMatrix} /> : <p className="text-sm text-muted-foreground">Select a qubit to see its density matrix.</p>}
                </CardContent>
            </Card>
        </div>

      </div>
      <FloatingAiAssistant circuit={circuit} onCircuitUpdate={handleCircuitUpdateFromAI} />

      <AlertDialog open={!!cnotDrop} onOpenChange={(isOpen) => !isOpen && setCnotDrop(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Select Target Qubit for CNOT</AlertDialogTitle>
                <AlertDialogDescription>
                    The CNOT gate requires a target qubit. Select one of the available qubits below.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <RadioGroup onValueChange={setSelectedTargetQubit} value={selectedTargetQubit}>
                {Array.from({length: circuit.qubits}).map((_, i) => (
                    cnotDrop?.qubit !== i && (
                    <div key={i} className="flex items-center space-x-2">
                        <RadioGroupItem value={String(i)} id={`q-${i}`} />
                        <Label htmlFor={`q-${i}`}>Qubit {i}</Label>
                    </div>
                )))}
            </RadioGroup>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleCnotPlacement} disabled={selectedTargetQubit === undefined}>
                    Place Gate
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
