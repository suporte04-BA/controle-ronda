import { createFileRoute } from "@tanstack/react-router";
import { Tag } from "lucide-react";

export const Route = createFileRoute("/admin/categorias")({
  component: Categorias,
});

function Categorias() {
  return (
    <div className="p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Categorias</h1>
        <p className="text-sm text-muted-foreground">Cadastro de categorias para classificação interna.</p>
      </header>
      <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
        <Tag className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Módulo em construção.</p>
      </div>
    </div>
  );
}
