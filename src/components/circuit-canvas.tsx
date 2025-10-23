
"use client";

import type { DragEvent } from 'react';
import type { CircuitState, GateInstance } from '@/types/circuit';
import GateIcon from './icons/gate-icon';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CircuitCanvasProps {
  circuit: CircuitState;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  removeGate: (gateId: string) => void;
  selectedQubit: number | null;
  onSelectQubit: (qubitIndex: number | null) => void;
}

export default function CircuitCanvas({ circuit, onDrop, onDragOver, removeGate, selectedQubit, onSelectQubit }: CircuitCanvasProps) {
  const { qubits, timesteps, gates } = circuit;

  const getGateAt = (qubit: number, timestep: number): GateInstance | undefined => {
    return gates.find(g => g.qubit === qubit && g.timestep === timestep);
  };
  
  const getTargetAt = (qubit: number, timestep: number): GateInstance | undefined => {
    return gates.find(g => g.gate.name === 'CNOT' && g.targetQubit === qubit && g.timestep === timestep);
  };

  return (
    <div 
        className="relative overflow-auto bg-card p-4 rounded-lg shadow-inner min-w-[600px]"
    >
      <div className="relative grid" style={{ gridTemplateColumns: `4rem repeat(${timesteps}, 4rem)`, gridTemplateRows: `repeat(${qubits + 1}, 4rem)`}}>
        {/* Draw connection lines */}
        {gates.filter(g => g.gate.name === 'CNOT' && g.targetQubit !== undefined).map(g => {
            const controlY = g.qubit * 4 + 2; // in rem
            const targetY = g.targetQubit! * 4 + 2; // in rem
            const x = g.timestep * 4 + 4 + 2; // in rem
            return (
                <svg key={`line-${g.id}`} className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                    <line x1={`${x}rem`} y1={`${controlY}rem`} x2={`${x}rem`} y2={`${targetY}rem`} stroke="hsl(var(--primary))" strokeWidth="2" />
                </svg>
            )
        })}
        {/* Draw measurement lines */}
        {gates.filter(g => g.gate.name === 'Measure').map(g => {
            const controlY = g.qubit * 4 + 2; // in rem
            const targetY = qubits * 4 + 2; // in rem
            const x = g.timestep * 4 + 4 + 2; // in rem
            return (
                <svg key={`line-${g.id}`} className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                    <line x1={`${x}rem`} y1={`${controlY}rem`} x2={`${x}rem`} y2={`${targetY}rem`} stroke="hsl(var(--muted-foreground))" strokeWidth="2" />
                </svg>
            )
        })}

        {/* Qubit Labels and Lanes */}
        {Array.from({ length: qubits }).map((_, i) => (
          <div 
            key={`qubit-label-${i}`} 
            className={cn(
              "flex items-center justify-center font-mono text-lg font-bold sticky left-0 bg-card z-20 cursor-pointer rounded-md",
              selectedQubit === i && "bg-primary/20 ring-2 ring-primary"
            )}
            style={{ gridRow: i + 1 }}
            onClick={() => onSelectQubit(selectedQubit === i ? null : i)}
            >
            q[{i}]
          </div>
        ))}
        {Array.from({ length: qubits * timesteps }).map((_, index) => {
            const q = Math.floor(index / timesteps);
            const t = index % timesteps;
            const hasTarget = !!getTargetAt(q,t);
            return (
                <div key={`qubit-line-${q}-${t}`} style={{ gridRow: q + 1, gridColumn: t + 2 }} className="relative flex items-center justify-center">
                    {!hasTarget && <div className="w-full h-px bg-muted-foreground/50"></div>}
                </div>
            )
        })}

        {/* Classical Bit Label and Lane */}
        <div 
          key="cbit-label" 
          className="flex items-center justify-center font-mono text-lg font-bold sticky left-0 bg-card z-20"
          style={{ gridRow: qubits + 1 }}
          >
          c
        </div>
        {Array.from({ length: timesteps }).map((_, t) => (
            <div key={`cbit-line-${t}`} style={{ gridRow: qubits + 1, gridColumn: t + 2 }} className="relative flex items-center justify-center">
                <div className="w-full h-0.5 bg-muted-foreground"></div>
            </div>
        ))}


        {/* Drop Zones */}
        {Array.from({ length: qubits * timesteps }).map((_, index) => {
          const qubit = Math.floor(index / timesteps);
          const timestep = index % timesteps;
          
          return (
            <div
              key={`drop-${qubit}-${timestep}`}
              data-qubit={qubit}
              data-timestep={timestep}
              onDrop={onDrop}
              onDragOver={onDragOver}
              className="w-16 h-16 border-none flex items-center justify-center z-10"
              style={{ gridRow: qubit + 1, gridColumn: timestep + 2 }}
            />
          );
        })}
        
        {/* Placed Gates */}
        {gates.map(g => (
          <div
            key={g.id}
            className="relative flex items-center justify-center w-16 h-16 z-20 group"
            style={{ gridRow: g.qubit + 1, gridColumn: g.timestep + 2 }}
          >
            <GateIcon gate={g.gate} isPlaced />
            <button onClick={() => removeGate(g.id)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <X size={12} />
            </button>
          </div>
        ))}

        {/* CNOT Targets */}
        {gates.filter(g => g.gate.name === 'CNOT' && g.targetQubit !== undefined).map(g => (
          <div
            key={`target-${g.id}`}
            className="flex items-center justify-center w-16 h-16 z-20"
            style={{ gridRow: g.targetQubit! + 1, gridColumn: g.timestep + 2 }}
          >
            <div className="w-8 h-8 rounded-full border-2 border-primary bg-primary flex items-center justify-center relative">
                <div className="w-1.5 h-4 bg-primary-foreground"></div>
                <div className="w-4 h-1.5 bg-primary-foreground absolute"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
