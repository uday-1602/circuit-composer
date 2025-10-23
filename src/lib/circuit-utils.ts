

import type { Gate, CircuitState, GateInstance } from '@/types/circuit';
import { v4 as uuidv4 } from 'uuid';

export const GATES: Gate[] = [
  { name: 'H', label: 'H', color: 'bg-green-500', description: 'Hadamard Gate', qubits: 1 },
  { name: 'X', label: 'X', color: 'bg-red-500', description: 'Pauli-X Gate (NOT)', qubits: 1 },
  { name: 'Y', label: 'Y', color: 'bg-red-500', description: 'Pauli-Y Gate', qubits: 1 },
  { name: 'Z', label: 'Z', color: 'bg-red-500', description: 'Pauli-Z Gate', qubits: 1 },
  { name: 'S', label: 'S', color: 'bg-yellow-500', description: 'S Gate (Phase)', qubits: 1 },
  { name: 'T', label: 'T', color: 'bg-yellow-500', description: 'T Gate (π/8)', qubits: 1 },
  { name: 'CNOT', label: 'CX', color: 'bg-purple-500', description: 'Controlled-NOT Gate', qubits: 2 },
  { name: 'Measure', label: 'M', color: 'bg-gray-600', description: 'Measurement', qubits: 1 },
];

function getSortedGatesByTimestep(circuit: CircuitState): GateInstance[][] {
  const timesteps: { [key: number]: GateInstance[] } = {};
  circuit.gates.forEach(g => {
    if (!timesteps[g.timestep]) {
      timesteps[g.timestep] = [];
    }
    timesteps[g.timestep].push(g);
  });

  return Object.keys(timesteps)
    .sort((a,b) => parseInt(a) - parseInt(b))
    .map(timestep => timesteps[parseInt(timestep)]);
}


export function circuitToQasm(circuit: CircuitState): string {
  let qasm = `OPENQASM 2.0;\n`;
  qasm += `include "qelib1.inc";\n`;
  qasm += `qreg q[${circuit.qubits}];\n`;
  qasm += `creg c[${circuit.qubits}];\n\n`;

  const sortedGates = getSortedGatesByTimestep(circuit);

  sortedGates.forEach(timestepGates => {
    timestepGates.forEach(g => {
        if (g.gate.name === 'CNOT' && g.targetQubit !== undefined) {
            qasm += `cx q[${g.qubit}],q[${g.targetQubit}];\n`;
        } else if (g.gate.name === 'Measure') {
            qasm += `measure q[${g.qubit}] -> c[${g.qubit}];\n`;
        } else if (g.gate.qubits === 1) {
            qasm += `${g.gate.name.toLowerCase()} q[${g.qubit}];\n`;
        }
    });
  });

  return qasm;
}

export function circuitToQiskit(circuit: CircuitState): string {
    let qiskit = `from qiskit import QuantumCircuit, execute, Aer\n\n`;
    qiskit += `qc = QuantumCircuit(${circuit.qubits}, ${circuit.qubits})\n\n`;

    const sortedGates = getSortedGatesByTimestep(circuit);

    sortedGates.forEach(timestepGates => {
        timestepGates.forEach(g => {
            const gateName = g.gate.name.toLowerCase();
            if (gateName === 'cnot' && g.targetQubit !== undefined) {
                qiskit += `qc.cx(${g.qubit}, ${g.targetQubit})\n`;
            } else if (gateName === 'measure') {
                qiskit += `qc.measure(${g.qubit}, ${g.qubit})\n`;
            } else if (g.gate.qubits === 1) {
                qiskit += `qc.${gateName}(${g.qubit})\n`;
            }
        });
    });

    qiskit += `\n# To run the circuit:\n`;
    qiskit += `# simulator = Aer.get_backend('qasm_simulator')\n`;
    qiskit += `# result = execute(qc, simulator).result()\n`;
    qiskit += `# counts = result.get_counts(qc)\n`;
    qiskit += `# print(counts)\n`;

    return qiskit;
}


export function qasmToCircuit(qasm: string, currentCircuit: CircuitState): Partial<CircuitState> {
  const newGates: GateInstance[] = [];
  const lines = qasm.split('\n');
  let qubitCount = currentCircuit.qubits;

  const qregMatch = qasm.match(/qreg q\[(\d+)\];/);
  if (qregMatch) {
    qubitCount = parseInt(qregMatch[1], 10);
  }
  
  const qubitTimesteps: number[] = Array(qubitCount).fill(0);

  lines.forEach(line => {
    line = line.trim();
    if (line.startsWith('//') || line.startsWith('#') || line === '') return;

    const cxMatch = line.match(/^cx\s+q\[(\d+)\],q\[(\d+)\];/);
    const singleGateMatch = line.match(/^(\w+)\s+q\[(\d+)\];$/);
    const measureMatch = line.match(/^measure\s+q\[(\d+)\]\s*->\s*c\[\d+\];$/);

    let gateDef;
    let newGate: Omit<GateInstance, 'id'> | null = null;
    let controlQubit: number | undefined;
    let targetQubit: number | undefined;

    if (cxMatch) {
      gateDef = GATES.find(g => g.name === 'CNOT');
      controlQubit = parseInt(cxMatch[1], 10);
      targetQubit = parseInt(cxMatch[2], 10);
      if (gateDef && controlQubit !== undefined && targetQubit !== undefined) {
        const timestep = Math.max(qubitTimesteps[controlQubit], qubitTimesteps[targetQubit]);
        newGate = { gate: gateDef, qubit: controlQubit, targetQubit, timestep };
        qubitTimesteps[controlQubit] = timestep + 1;
        qubitTimesteps[targetQubit] = timestep + 1;
      }
    } else if (singleGateMatch) {
      const gateName = singleGateMatch[1].toLowerCase();
      gateDef = GATES.find(g => g.name.toLowerCase() === gateName);
      controlQubit = parseInt(singleGateMatch[2], 10);
      if (gateDef && controlQubit !== undefined) {
        const timestep = qubitTimesteps[controlQubit];
        newGate = { gate: gateDef, qubit: controlQubit, timestep };
        qubitTimesteps[controlQubit]++;
      }
    } else if (measureMatch) {
      gateDef = GATES.find(g => g.name === 'Measure');
      controlQubit = parseInt(measureMatch[1], 10);
      if (gateDef && controlQubit !== undefined) {
        const timestep = qubitTimesteps[controlQubit];
        newGate = { gate: gateDef, qubit: controlQubit, timestep };
        qubitTimesteps[controlQubit]++;
      }
    }

    if (newGate) {
      newGates.push({ ...newGate, id: uuidv4() });
    }
  });

  const maxTimesteps = Math.max(...qubitTimesteps, currentCircuit.timesteps);

  return { qubits: qubitCount, gates: newGates, timesteps: maxTimesteps };
}

export function qiskitToCircuit(qiskit: string, currentCircuit: CircuitState): Partial<CircuitState> {
    const newGates: GateInstance[] = [];
    const lines = qiskit.split('\n');
    let qubitCount = currentCircuit.qubits;

    const circuitDefMatch = qiskit.match(/QuantumCircuit\((\d+)/);
    if (circuitDefMatch) {
        qubitCount = parseInt(circuitDefMatch[1], 10);
    }
    
    const qubitTimesteps: number[] = Array(qubitCount).fill(0);

    lines.forEach(line => {
        line = line.trim();
        if (line.startsWith('#') || !line.startsWith('qc.')) return;

        const twoQubitGateMatch = line.match(/^qc\.(\w+)\((\d+),\s*(\d+)\)/);
        const singleQubitGateMatch = line.match(/^qc\.(\w+)\((\d+)\)/);

        let gateDef;
        let newGate: Omit<GateInstance, 'id'> | null = null;
        let controlQubit: number | undefined;
        let targetQubit: number | undefined;

        if (twoQubitGateMatch) {
            const gateName = twoQubitGateMatch[1].toUpperCase();
            gateDef = GATES.find(g => g.label === gateName || g.name === gateName);
            controlQubit = parseInt(twoQubitGateMatch[2], 10);
            targetQubit = parseInt(twoQubitGateMatch[3], 10);

            if (gateDef && controlQubit !== undefined && targetQubit !== undefined) {
                const timestep = Math.max(qubitTimesteps[controlQubit], qubitTimesteps[targetQubit]);
                newGate = { gate: gateDef, qubit: controlQubit, targetQubit, timestep };
                qubitTimesteps[controlQubit] = timestep + 1;
                qubitTimesteps[targetQubit] = timestep + 1;
            }
        } else if (singleQubitGateMatch) {
            const gateName = singleQubitGateMatch[1].toUpperCase();
            gateDef = GATES.find(g => g.name === gateName || g.label === gateName);
            controlQubit = parseInt(singleQubitGateMatch[2], 10);

            if (gateDef && controlQubit !== undefined) {
                const timestep = qubitTimesteps[controlQubit];
                newGate = { gate: gateDef, qubit: controlQubit, timestep };
                qubitTimesteps[controlQubit]++;
            }
        }

        if (newGate) {
            newGates.push({ ...newGate, id: uuidv4() });
        }
    });

    const maxTimesteps = Math.max(...qubitTimesteps, currentCircuit.timesteps);

    return { qubits: qubitCount, gates: newGates, timesteps: maxTimesteps };
}
