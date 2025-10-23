
'use client';

import React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

interface ProbabilityChartProps {
  data: Array<{ name: string; probability: number; fill: string }>;
}

const ProbabilityChart: React.FC<ProbabilityChartProps> = ({ data }) => {
  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" stroke="hsl(var(--foreground))" fontSize={12} />
          <YAxis domain={[0, 1]} stroke="hsl(var(--foreground))" fontSize={12} />
          <Tooltip
            cursor={{ fill: 'hsl(var(--primary))', fillOpacity: 0.1 }}
            contentStyle={{
              background: 'hsl(var(--card))',
              borderColor: 'hsl(var(--border))',
              color: 'hsl(var(--card-foreground))'
            }}
          />
          <Bar dataKey="probability" radius={[4, 4, 0, 0]}>
            <LabelList
                dataKey="probability"
                position="top"
                formatter={(value: number) => `${(value * 100).toFixed(1)}%`}
                className="fill-foreground"
                fontSize={12}
             />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProbabilityChart;

    