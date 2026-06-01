import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatData } from "@/lib/timezone";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [stats, setStats] = useState({ usuarios: 0, registrosHoje: 0, completos: 0, pendentes: 0 });

  useEffect(() => {
    (async () => {
      const hojeStr = formatData(new Date());
      const inicio = new Date(); inicio.setHours(0, 0, 0, 0);
      const fim = new Date(); fim.setHours(23, 59, 59, 999);

      const [{ count: usuarios }, { data: registros }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("registros_ponto")
          .select("user_id,tipo_acao,horario_acao")
          .gte("horario_acao", inicio.toISOString())
          .lte("horario_acao", fim.toISOString()),
      ]);

      const filtrados = (registros ?? []).filter((r) => formatData(r.horario_acao) === hojeStr);
      const porUser = new Map<string, Set<string>>();
      filtrados.forEach((r) => {
        if (!porUser.has(r.user_id)) porUser.set(r.user_id, new Set());
        porUser.get(r.user_id)!.add(r.tipo_acao);
      });
      let completos = 0;
      porUser.forEach((s) => { if (s.size === 3) completos++; });

      setStats({
        usuarios: usuarios ?? 0,
        registrosHoje: filtrados.length,
        completos,
        pendentes: (usuarios ?? 0) - porUser.size,
      });
    })();
  }, []);

  const cards = [
    { label: "Funcionários", value: stats.usuarios, icon: Users, color: "text-primary" },
    { label: "Registros hoje", value: stats.registrosHoje, icon: Clock, color: "text-blue-600" },
    { label: "Dias completos", value: stats.completos, icon: CheckCircle2, color: "text-green-600" },
    { label: "Sem registro hoje", value: stats.pendentes, icon: AlertCircle, color: "text-amber-600" },
  ];

  return (
    <div className="p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral em tempo real ({formatData(new Date())})</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-card border border-border rounded-2xl p-5">
              <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-3 ${c.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-3xl font-bold">{c.value}</div>
              <div className="text-sm text-muted-foreground">{c.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
