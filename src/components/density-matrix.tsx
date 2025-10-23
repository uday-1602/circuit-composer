
'use client';

import type { Matrix, Complex } from '@/types/circuit';
import { cn } from '@/lib/utils';

interface DensityMatrixProps {
  matrix: Matrix;
}

const formatComplex = (c: Complex) => {
    const re = c.re.toFixed(2);
    const im = Math.abs(c.im).toFixed(2);
    if (Math.abs(c.im) < 0.005) {
        return `${re}`;
    }
    return `${re} ${c.im < 0 ? '-' : '+'} ${im}i`;
}

export default function DensityMatrix({ matrix }: DensityMatrixProps) {
  if (!matrix) return null;

  return (
    <div className="flex flex-col items-center justify-center font-code">
      <div className="flex items-center">
        <div className="text-5xl font-thin">[</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-center text-sm">
            <div className="p-2 bg-muted rounded-md">{formatComplex(matrix[0][0])}</div>
            <div className="p-2 bg-muted rounded-md">{formatComplex(matrix[0][1])}</div>
            <div className="p-2 bg-muted rounded-md">{formatComplex(matrix[1][0])}</div>
            <div className="p-2 bg-muted rounded-md">{formatComplex(matrix[1][1])}</div>
        </div>
        <div className="text-5xl font-thin">]</div>
      </div>
    </div>
  );
}

    