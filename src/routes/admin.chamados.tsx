import { createFileRoute } from "@tanstack/react-router";
import { Ticket } from "lucide-react";

export const Route = createFileRoute("/admin/chamados")({
  component: Chamados,
});

function Chamados() {
  return (
    <div className="p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Todos os Chamados</h1>
        <p className="text-sm text-muted-foreground">Gestão de chamados internos da equipe.</p>
      </header>
      <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
        <Ticket className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Módulo em construção. Em breve.</p>
      </div>
    </div>
  );
}
