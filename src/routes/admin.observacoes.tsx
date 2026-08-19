import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  FileText,
  Loader2,
  User,
  Calendar,
  MessageSquare,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatData, formatHora, TIPO_ACAO_LABEL, CICLO_RONDA } from "@/lib/timezone";

export const Route = createFileRoute("/admin/observacoes")({
  component: Observacoes,
});

interface Passo {
  tipo: string;
  horario_acao: string;
  horario_foto: string;
  foto_url: string;
}

interface Ronda {
  id: string;
  user_id: string;
  nome: string;
  setor: string;
  inicio: string;
  fim: string;
  passos: Passo[];
  observacoes: string | null;
}

function Observacoes() {
  const [items, setItems] = useState<Ronda[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [{ data: regs }, { data: profs }, { data: sets }] = await Promise.all([
          supabase
            .from("registros_ponto")
            .select("id,user_id,tipo_acao,horario_acao,horario_foto,foto_url,observacoes")
            .order("horario_acao", { ascending: true })
            .limit(8000),
          supabase.from("profiles").select("id,nome,setor_id"),
          supabase.from("setores").select("id,nome"),
        ]);
        if (cancelled) return;
        const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
        const setMap = new Map((sets ?? []).map((s: any) => [s.id, s.nome]));

        const porUser = new Map<string, any[]>();
        (regs ?? []).forEach((r: any) => {
          if (!porUser.has(r.user_id)) porUser.set(r.user_id, []);
          porUser.get(r.user_id)!.push(r);
        });

        const rondas: Ronda[] = [];
        porUser.forEach((lista, userId) => {
          const p: any = profMap.get(userId);
          const nome = p?.nome ?? "—";
          const setor = p?.setor_id ? (setMap.get(p.setor_id) as string) ?? "—" : "—";

          let ciclo: any[] = [];
          const flush = () => {
            if (ciclo.length === 0) return;
            const checkIn = ciclo[0];
            const checkOut = ciclo[ciclo.length - 1];
            const observacoes = checkOut.observacoes ?? null;
            rondas.push({
              id: checkOut.id,
              user_id: userId,
              nome,
              setor,
              inicio: checkIn.horario_acao,
              fim: checkOut.horario_acao,
              passos: ciclo.map((c) => ({
                tipo: c.tipo_acao,
                horario_acao: c.horario_acao,
                horario_foto: c.horario_foto,
                foto_url: c.foto_url,
              })),
              observacoes,
            });
            ciclo = [];
          };

          lista.forEach((r: any) => {
            if (r.tipo_acao === "check_in") {
              flush();
              ciclo = [r];
            } else if (r.tipo_acao === "check_out_2") {
              if (ciclo.length > 0) {
                ciclo.push(r);
                flush();
              }
            } else {
              if (ciclo.length > 0) ciclo.push(r);
            }
          });
          flush();
        });

        rondas.sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime());
        setItems(rondas.filter((r) => r.observacoes && r.observacoes.trim().length > 0));
      } catch (e: any) {
        console.error("Erro ao carregar observações:", e);
      } finally {
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const ordenarPassos = (passos: Passo[]) => {
    return [...passos].sort(
      (a, b) => {
        const orderA = CICLO_RONDA.indexOf(a.tipo);
        const orderB = CICLO_RONDA.indexOf(b.tipo);
        return (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB);
      },
    );
  };

  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Observações das Rondas</h1>
        <p className="text-sm text-muted-foreground">
          Ocorrências relatadas pelos vigilantes ao final de cada ronda. Clique para expandir.
        </p>
      </header>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center text-muted-foreground">
          Nenhuma observação registrada ainda.
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((o) => {
            const isOpen = expandedId === o.id;
            const passosOrdenados = ordenarPassos(o.passos);

            return (
              <div
                key={o.id}
                className="bg-card border border-border rounded-xl shadow-sm overflow-hidden transition-all"
              >
                {/* Header — sempre visível, clicável */}
                <button
                  onClick={() => toggle(o.id)}
                  className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{o.nome}</div>
                      <div className="text-xs text-muted-foreground">{o.setor}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                        <Calendar className="w-3 h-3" />
                        {formatData(o.inicio)}
                      </div>
                      <div className="text-sm font-medium tabular-nums">{formatHora(o.inicio)}</div>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Preview da observação (quando fechado) */}
                {!isOpen && (
                  <div className="px-4 pb-4 flex items-start gap-2 text-sm text-muted-foreground">
                    <MessageSquare className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <p className="line-clamp-2">{o.observacoes}</p>
                  </div>
                )}

                {/* Conteúdo expandido */}
                {isOpen && (
                  <div className="px-4 pb-4 space-y-4 border-t border-border">
                    {/* Timeline dos passos */}
                    <ol className="relative border-l-2 border-primary/30 ml-3 space-y-2 py-3">
                      {passosOrdenados.map((p, idx) => (
                        <li key={`${p.tipo}_${idx}`} className="pl-5 relative">
                          <span className="absolute -left-[9px] top-1.5 w-3.5 h-3.5 rounded-full bg-primary border-4 border-background" />
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="font-medium">
                              {TIPO_ACAO_LABEL[p.tipo] ?? p.tipo}
                            </span>
                            <span className="text-xs text-muted-foreground tabular-nums flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {formatHora(p.horario_acao)}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ol>

                    {/* Observação completa */}
                    <div className="flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-lg p-4">
                      <MessageSquare className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-primary mb-1 uppercase tracking-wide">
                          Observação
                        </div>
                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                          {o.observacoes}
                        </p>
                      </div>
                    </div>

                    {/* Rodapé */}
                    <div className="text-xs text-muted-foreground text-right">
                      Ciclo: {formatData(o.inicio)} {formatHora(o.inicio)} → {formatHora(o.fim)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
          <FileText className="w-3.5 h-3.5" />
          {items.length} ronda(s) com observação encontrada(s)
        </div>
      )}
    </div>
  );
}
