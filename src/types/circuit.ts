
export interface Gate {
  name: string;
  label: string;
  color: string;
  description: string;
  qubits: number; // Number of qubits it acts on
}

export interface GateInstance {
  id: string;
  gate: Gate;
  qubit: number; // control qubit for multi-qubit gates
  timestep: number;
  targetQubit?: number; // target qubit for CNOT etc.
}

export type CircuitState = {
  qubits: number;
  timesteps: number;
  gates: GateInstance[];
};

export type EditorLanguage = 'qasm' | 'qiskit';

export type Complex = { re: number; im: number };
export type Matrix = [
    [Complex, Complex],
    [Complex, Complex]
];

export type VisualizationType = 'probabilities' | 'densityMatrix';

    