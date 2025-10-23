"use client";

import { GATES } from "@/lib/circuit-utils";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Gate } from "@/types/circuit";
import GateIcon from "./icons/gate-icon";

const DraggableGate = ({ gate }: { gate: Gate }) => {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("gate", JSON.stringify(gate));
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            draggable
            onDragStart={handleDragStart}
            className="flex flex-col items-center gap-1 p-2 rounded-md hover:bg-accent cursor-grab active:cursor-grabbing"
          >
            <GateIcon gate={gate} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="font-semibold">{gate.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default function GateLibrary() {
  return (
    <Card className="w-36 border-t-0 border-b-0 border-l-0 rounded-none">
      <CardHeader>
        <CardTitle>Gate Library</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {GATES.map((gate) => (
            <DraggableGate key={gate.name} gate={gate} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
