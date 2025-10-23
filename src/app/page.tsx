import CircuitComposer from "@/components/circuit-composer";

export default function Home() {
  return (
    <main className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-between p-4 border-b">
        <h1 className="text-2xl font-bold text-foreground">Circuit Composer</h1>
      </header>
      <CircuitComposer />
    </main>
  );
}
