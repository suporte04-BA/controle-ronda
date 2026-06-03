import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, CheckCircle2, ShieldAlert, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatData, formatHora, TIPO_ACAO_LABEL } from "@/lib/timezone";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

interface UltimoPonto {
  setor: string;
  hora: string;
  nome: string;
  tipo: string;
}

function AdminDashboard() {
  const [finalizadas, setFinalizadas] = useState(0);
  const [abertas, setAbertas] = useState(0);
  const [agentes, setAgentes] = useState(0);
  const [ultimo, setUltimo] = useState<UltimoPonto | null>(null);

  useEffect(() => {
    (async () => {
      const hojeStr = formatData(new Date());
      const inicio = new Date(); inicio.setHours(0, 0, 0, 0);
      const fim = new Date(); fim.setHours(23, 59, 59, 999);

      const [{ count: usuarios }, { data: registros }, { data: profs }, { data: sets }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("registros_ponto")
          .select("user_id,tipo_acao,horario_acao")
          .gte("horario_acao", inicio.toISOString())
          .lte("horario_acao", fim.toISOString())
          .order("horario_acao", { ascending: false }),
        supabase.from("profiles").select("id,nome,setor_id"),
        supabase.from("setores").select("id,nome"),
      ]);

      const filtrados = (registros ?? []).filter((r) => formatData(r.horario_acao) === hojeStr);
      const porUser = new Map<string, string[]>();
      // ordem cronológica crescente para contar ciclos
      [...filtrados].reverse().forEach((r) => {
        if (!porUser.has(r.user_id)) porUser.set(r.user_id, []);
        porUser.get(r.user_id)!.push(r.tipo_acao);
      });

      let finalizadasCount = 0;
      let abertasCount = 0;
      porUser.forEach((arr) => {
        finalizadasCount += Math.floor(arr.length / 3);
        if (arr.length % 3 !== 0) abertasCount++;
      });

      setFinalizadas(finalizadasCount);
      setAbertas(abertasCount);
      setAgentes(usuarios ?? 0);

      const last = filtrados[0];
      if (last) {
        const pm = new Map((profs ?? []).map((p: any) => [p.id, p]));
        const sm = new Map((sets ?? []).map((s: any) => [s.id, s.nome]));
        const p: any = pm.get(last.user_id);
        setUltimo({
          nome: p?.nome ?? "—",
          setor: p?.setor_id ? (sm.get(p.setor_id) as string) ?? "—" : "—",
          hora: formatHora(last.horario_acao),
          tipo: TIPO_ACAO_LABEL[last.tipo_acao] ?? last.tipo_acao,
        });
      }
    })();
  }, []);

  const cards = [
    { label: "Rondas Finalizadas Hoje", value: finalizadas, icon: CheckCircle2, color: "text-green-600" },
    { label: "Rondas em Aberto", value: abertas, icon: ShieldAlert, color: "text-amber-600" },
    {
      label: "Último Ponto Verificado",
      value: ultimo ? `${ultimo.hora}` : "—",
      sub: ultimo ? `${ultimo.setor} • ${ultimo.nome}` : "Aguardando primeiro registro",
      icon: MapPin,
      color: "text-primary",
    },
    { label: "Total de Agentes em Campo", value: agentes, icon: Users, color: "text-blue-600" },
  ];

  return (
    <div className="p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Dashboard de Rondas</h1>
        <p className="text-sm text-muted-foreground">Monitoramento em tempo real ({formatData(new Date())})</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-3 ${c.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold tabular-nums">{c.value}</div>
              <div className="text-sm text-muted-foreground">{c.label}</div>
              {"sub" in c && c.sub && (
                <div className="text-xs text-muted-foreground/80 mt-1 truncate">{c.sub}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
