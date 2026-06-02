import { createFileRoute } from "@tanstack/react-router";
import { PlusSquare } from "lucide-react";

export const Route = createFileRoute("/admin/chamados/novo")({
  component: NovoChamado,
});

function NovoChamado() {
  return (
    <div className="p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Novo Chamado</h1>
        <p className="text-sm text-muted-foreground">Abrir um novo chamado interno.</p>
      </header>
      <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
        <PlusSquare className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Formulário de chamado em construção.</p>
      </div>
    </div>
  );
}
