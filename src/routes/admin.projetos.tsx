import { createFileRoute } from "@tanstack/react-router";
import { FolderKanban } from "lucide-react";

export const Route = createFileRoute("/admin/projetos")({
  component: Projetos,
});

function Projetos() {
  return (
    <div className="p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Projetos</h1>
        <p className="text-sm text-muted-foreground">Gestão de projetos e obras da BA Elétrica.</p>
      </header>
      <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
        <FolderKanban className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Módulo em construção.</p>
      </div>
    </div>
  );
}
