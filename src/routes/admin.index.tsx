import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, CheckCircle2, ShieldAlert, MapPin } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { formatData, formatHora, TIPO_ACAO_LABEL } from "@/lib/timezone";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

interface UltimoPonto {
  setor: string;
  hora: string;
  nome: string;
  tipo: string;
}

const PIE_COLORS = ["#00F0FF", "#7700EE", "#FF006E", "#00FF88", "#EEFF00", "#FF8C00", "#4ECDC4", "#A855F7"];

function AdminDashboard() {
  const { theme } = useTheme();
  const [finalizadas, setFinalizadas] = useState(0);
  const [abertas, setAbertas] = useState(0);
  const [agentes, setAgentes] = useState(0);
  const [ultimo, setUltimo] = useState<UltimoPonto | null>(null);
  const [ranking, setRanking] = useState<{ nome: string; rondas: number }[]>([]);
  const [porSetor, setPorSetor] = useState<{ setor: string; rondas: number }[]>([]);

  useEffect(() => {
    (async () => {
      const hojeStr = formatData(new Date());
      const inicio = new Date(); inicio.setHours(0, 0, 0, 0);
      const fim = new Date(); fim.setHours(23, 59, 59, 999);

      const [{ count: usuarios }, { data: regsHoje }, { data: regsAll }, { data: profs }, { data: sets }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("registros_ponto")
          .select("user_id,tipo_acao,horario_acao")
          .gte("horario_acao", inicio.toISOString())
          .lte("horario_acao", fim.toISOString())
          .order("horario_acao", { ascending: false }),
        supabase.from("registros_ponto")
          .select("user_id,tipo_acao,horario_acao")
          .order("horario_acao", { ascending: true })
          .limit(5000),
        supabase.from("profiles").select("id,nome,setor_id"),
        supabase.from("setores").select("id,nome"),
      ]);

      const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
      const setMap = new Map((sets ?? []).map((s: any) => [s.id, s.nome]));

      const filtrados = (regsHoje ?? []).filter((r) => formatData(r.horario_acao) === hojeStr);
      const porUser = new Map<string, string[]>();
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
        const p: any = profMap.get(last.user_id);
        setUltimo({
          nome: p?.nome ?? "—",
          setor: p?.setor_id ? (setMap.get(p.setor_id) as string) ?? "—" : "—",
          hora: formatHora(last.horario_acao),
          tipo: TIPO_ACAO_LABEL[last.tipo_acao] ?? last.tipo_acao,
        });
      }

      // Ranking: rondas completas (check_out_2) por usuário
      const completaPorUser = new Map<string, number>();
      const completaPorSetor = new Map<string, number>();
      (regsAll ?? []).forEach((r: any) => {
        if (r.tipo_acao !== "check_out_2") return;
        completaPorUser.set(r.user_id, (completaPorUser.get(r.user_id) ?? 0) + 1);
        const p: any = profMap.get(r.user_id);
        const setorNome = p?.setor_id ? (setMap.get(p.setor_id) as string) ?? "Sem setor" : "Sem setor";
        completaPorSetor.set(setorNome, (completaPorSetor.get(setorNome) ?? 0) + 1);
      });

      const rankingArr = Array.from(completaPorUser.entries())
        .map(([uid, qtd]) => ({ nome: ((profMap.get(uid) as any)?.nome as string) ?? "—", rondas: qtd }))
        .sort((a, b) => b.rondas - a.rondas)
        .slice(0, 8);
      setRanking(rankingArr);

      const setoresArr = Array.from(completaPorSetor.entries())
        .map(([setor, rondas]) => ({ setor, rondas }))
        .sort((a, b) => b.rondas - a.rondas);
      setPorSetor(setoresArr);
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
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard de Rondas</h1>
        <p className="text-sm text-muted-foreground">Monitoramento em tempo real ({formatData(new Date())})</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="card-neon p-5 transition-all duration-300">
              <div className={`w-10 h-10 rounded-lg bg-secondary/80 flex items-center justify-center mb-3 ${c.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold tabular-nums text-foreground">{c.value}</div>
              <div className="text-sm text-muted-foreground mt-0.5">{c.label}</div>
              {"sub" in c && c.sub && (
                <div className="text-xs text-muted-foreground/60 mt-1 truncate">{c.sub}</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card-neon p-5 lg:col-span-2 transition-all duration-300">
          <h2 className="text-sm font-semibold mb-1 text-foreground">Ranking de Vigilantes</h2>
          <p className="text-xs text-muted-foreground mb-4">Rondas completas (ciclo até Fim de Ronda)</p>
          <div className="h-72">
            {ranking.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Nenhuma ronda completa registrada ainda.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ranking} margin={{ top: 8, right: 8, left: 0, bottom: 36 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)"} />
                  <XAxis dataKey="nome" angle={-25} textAnchor="end" interval={0} height={60} tick={{ fontSize: 11, fill: theme === "dark" ? "#8B8BA3" : "#64748B" }} stroke={theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: theme === "dark" ? "#8B8BA3" : "#64748B" }} stroke={theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} />
                  <Tooltip contentStyle={theme === "dark"
                    ? { background: "#12122A", color: "#F0F0FF", border: "1px solid rgba(0,240,255,0.2)", borderRadius: 8, boxShadow: "0 0 15px rgba(0,240,255,0.1)" }
                    : { background: "#FFFFFF", color: "#1E293B", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }
                  } />
                  <Bar dataKey="rondas" fill={theme === "dark" ? "#00F0FF" : "#0284C7"} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card-neon p-5 transition-all duration-300">
          <h2 className="text-sm font-semibold mb-1 text-foreground">Distribuição por Setor</h2>
          <p className="text-xs text-muted-foreground mb-4">Rondas concluídas por setor</p>
          <div className="h-72">
            {porSetor.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Sem dados de setor ainda.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={porSetor} dataKey="rondas" nameKey="setor" innerRadius={48} outerRadius={88} paddingAngle={2}>
                    {porSetor.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={theme === "dark"
                    ? { background: "#12122A", color: "#F0F0FF", border: "1px solid rgba(0,240,255,0.2)", borderRadius: 8, boxShadow: "0 0 15px rgba(0,240,255,0.1)" }
                    : { background: "#FFFFFF", color: "#1E293B", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }
                  } />
                  <Legend wrapperStyle={{ fontSize: 11, color: theme === "dark" ? "#8B8BA3" : "#64748B" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
