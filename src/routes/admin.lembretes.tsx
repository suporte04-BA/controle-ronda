import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/admin/lembretes")({
  component: Lembretes,
});

function Lembretes() {
  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Lembretes</h1>
      <div className="bg-card border border-border rounded-2xl p-10 text-center text-muted-foreground">
        <Bell className="w-10 h-10 mx-auto mb-3 text-primary" />
        <p className="font-medium text-foreground">Configurações de lembretes</p>
        <p className="text-sm mt-1">Em breve: notificações automáticas para funcionários que esqueceram de bater o ponto.</p>
      </div>
    </div>
  );
}
