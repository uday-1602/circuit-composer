
"use client";

import type { Gate } from '@/types/circuit';
import { cn } from '@/lib/utils';
import { ArrowDownToLine } from 'lucide-react';

interface GateIconProps {
  gate: Gate;
  isPlaced?: boolean;
}

export default function GateIcon({ gate, isPlaced = false }: GateIconProps) {
  if (gate.name === 'CNOT' && isPlaced) {
    return (
      <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
      </div>
    );
  }
  
  if (gate.name === 'Measure' && isPlaced) {
    return (
        <div className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg shadow-md",
            gate.color,
            "text-white",
          )}>
           <div className="relative w-8 h-8">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                    <path d="M 10 90 A 40 40 0 0 1 90 90" stroke="currentColor" strokeWidth="8" fill="none"/>
                    <line x1="50" y1="50" x2="20" y2="20" stroke="currentColor" strokeWidth="8" />
                </svg>
            </div>
        </div>
    )
  }

  return (
    <div
      className={cn(
        "w-10 h-10 rounded-md flex items-center justify-center font-bold text-lg shadow-md",
        gate.color,
        "text-black",
        isPlaced && "w-12 h-12 rounded-lg"
      )}
    >
      {gate.label}
    </div>
  );
}
