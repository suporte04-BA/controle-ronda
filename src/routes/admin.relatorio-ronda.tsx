import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Loader2,
  User,
  Calendar,
  Clock,
  ArrowRight,
  Trash2,
  AlertTriangle,
  Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  formatData,
  formatHora,
  formatManaus,
  TIPO_ACAO_LABEL,
  CICLO_RONDA,
  nowManaus,
  toManausISO,
} from "@/lib/timezone";
import { Preset, rangeFromPreset, toInput } from "@/lib/date-filters";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/relatorio-ronda")({
  component: RelatorioRonda,
});

interface RondaCard {
  cycleKey: string;
  user_id: string;
  nome: string;
  setor: string;
  setor_id: string | null;
  inicio: string;
  fim: string | null;
  status: "andamento" | "finalizado";
  passosCount: number;
  observacoes: string | null;
}

function RelatorioRonda() {
  const [items, setItems] = useState<RondaCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [preset, setPreset] = useState<Preset>("hoje");
  const initial = rangeFromPreset("hoje")!;
  const [dataDe, setDataDe] = useState<string>(initial.from);
  const [dataAte, setDataAte] = useState<string>(initial.to);
  const [busca, setBusca] = useState("");
  const [setorFiltro, setSetorFiltro] = useState<string>("all");
  const [setores, setSetores] = useState<{ id: string; nome: string }[]>([]);

  const carregar = async (de?: string, ate?: string) => {
    setLoading(true);
    try {
      let regsQuery = supabase
        .from("registros_ponto")
        .select("id,user_id,tipo_acao,horario_acao,horario_foto,foto_url,observacoes")
        .order("horario_acao", { ascending: true });

      if (de) regsQuery = regsQuery.gte("horario_acao", toManausISO(de, "00:00:00"));
      if (ate) regsQuery = regsQuery.lte("horario_acao", toManausISO(ate, "23:59:59"));

      const [{ data: regs }, { data: profs }, { data: sets }] = await Promise.all([
        regsQuery.range(0, 49999),
        supabase.from("profiles").select("id,nome,setor_id"),
        supabase.from("setores").select("id,nome"),
      ]);

      setSetores((sets ?? []).map((s: any) => ({ id: s.id, nome: s.nome })));
      const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
      const setMap = new Map((sets ?? []).map((s: any) => [s.id, s.nome]));

      const porUser = new Map<string, any[]>();
      (regs ?? []).forEach((r: any) => {
        if (!porUser.has(r.user_id)) porUser.set(r.user_id, []);
        porUser.get(r.user_id)!.push(r);
      });

      const rondas: RondaCard[] = [];
      porUser.forEach((lista, userId) => {
        const p: any = profMap.get(userId);
        const nome = p?.nome ?? "—";
        const setor = p?.setor_id ? (setMap.get(p.setor_id) as string) ?? "—" : "—";

        let ciclo: any[] = [];
        const flush = () => {
          if (ciclo.length === 0) return;
          const checkIn = ciclo[0];
          const last = ciclo[ciclo.length - 1];
          const lastTipo = String(last.tipo_acao);
          const isFinished = lastTipo === "check_out_2";
          rondas.push({
            cycleKey: `${userId}_${checkIn.horario_acao}`,
            user_id: userId,
            nome,
            setor,
            setor_id: p?.setor_id ?? null,
            inicio: checkIn.horario_acao,
            fim: isFinished ? last.horario_acao : null,
            status: isFinished ? "finalizado" : "andamento",
            passosCount: ciclo.length,
            observacoes: isFinished ? (last.observacoes ?? null) : null,
          });
          ciclo = [];
        };

        lista.forEach((r: any) => {
          const tipo = String(r.tipo_acao);
          if (tipo === "check_in") {
            if (ciclo.length > 0) flush();
            ciclo = [r];
          } else if (tipo === "check_out_2") {
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

      rondas.sort(
        (a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime(),
      );
      setItems(rondas);
    } catch (e: any) {
      toast.error(`Erro ao carregar rondas: ${e?.message ?? "desconhecido"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar(dataDe, dataAte);
  }, [dataDe, dataAte]);

  const handlePreset = (p: Preset) => {
    setPreset(p);
    if (p === "custom") return;
    const r = rangeFromPreset(p);
    if (r) {
      setDataDe(r.from);
      setDataAte(r.to);
    }
  };

  const filtered = useMemo(() => {
    const de = dataDe ? new Date(dataDe + "T00:00:00") : null;
    const ate = dataAte ? new Date(dataAte + "T23:59:59") : null;
    const q = busca.trim().toLowerCase();
    return items.filter((item) => {
      if (de && new Date(item.inicio) < de) return false;
      if (ate && new Date(item.inicio) > ate) return false;
      if (setorFiltro !== "all" && item.setor_id !== setorFiltro) return false;
      if (q) {
        const hay = `${item.nome} ${item.setor} ${item.observacoes ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, dataDe, dataAte, busca, setorFiltro]);

  const andamento = filtered.filter((i) => i.status === "andamento");
  const finalizado = filtered.filter((i) => i.status === "finalizado");

  const excluir = async (card: RondaCard) => {
    const id = toast.loading("Excluindo ronda...");
    try {
      const { data: regs } = await supabase
        .from("registros_ponto")
        .select("id,foto_url")
        .eq("user_id", card.user_id)
        .gte("horario_acao", card.inicio)
        .lte("horario_acao", card.fim ?? new Date().toISOString());

      for (const r of regs ?? []) {
        if (r.foto_url) {
          await supabase.storage.from("fotos_ponto").remove([r.foto_url]);
        }
      }

      const ids = (regs ?? []).map((r) => r.id);
      if (ids.length > 0) {
        await supabase.from("registros_ponto").delete().in("id", ids);
      }

      toast.success("Ronda excluída!", { id });
      setConfirmDelete(null);
      carregar(dataDe, dataAte);
    } catch (e: any) {
      toast.error(`Erro: ${e?.message ?? "desconhecido"}`, { id });
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Relatório de Ronda</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhamento em tempo real das rondas. Clique para ver detalhes.
        </p>
      </header>

      {/* ── Filtros ── */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Período</label>
            <div className="flex gap-1">
              {(["hoje", "ontem", "ultimos7", "semana", "semana_passada", "mes", "custom"] as Preset[]).map(
                (p) => (
                  <button
                    key={p}
                    onClick={() => handlePreset(p)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      preset === p
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    }`}
                  >
                    {p === "hoje"
                      ? "Hoje"
                      : p === "ontem"
                        ? "Ontem"
                        : p === "ultimos7"
                          ? "Últ. 7 dias"
                          : p === "semana"
                            ? "Semana"
                            : p === "semana_passada"
                              ? "Sem. pass."
                              : p === "mes"
                                ? "Mês"
                                : "Personalizado"}
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">De</label>
            <Input
              type="date"
              value={dataDe}
              onChange={(e) => {
                setDataDe(e.target.value);
                setPreset("custom");
              }}
              className="h-8 w-[140px] text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Até</label>
            <Input
              type="date"
              value={dataAte}
              onChange={(e) => {
                setDataAte(e.target.value);
                setPreset("custom");
              }}
              className="h-8 w-[140px] text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Setor</label>
            <Select value={setorFiltro} onValueChange={setSetorFiltro}>
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {setores.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[180px] space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Buscar</label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Nome, setor, observação..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="h-8 pl-7 text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center text-muted-foreground">
          Nenhuma ronda registrada.
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center text-muted-foreground">
          Nenhuma ronda encontrado com os filtros selecionados.
        </div>
      ) : (
        <>
          {andamento.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Em Andamento ({andamento.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {andamento.map((card) => (
                  <RondaCardItem
                    key={card.cycleKey}
                    card={card}
                    onExcluir={() => setConfirmDelete(card.cycleKey)}
                  />
                ))}
              </div>
            </section>
          )}

          {finalizado.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Finalizados ({finalizado.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {finalizado.map((card) => (
                  <RondaCardItem
                    key={card.cycleKey}
                    card={card}
                    onExcluir={() => setConfirmDelete(card.cycleKey)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {!loading && items.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
          <FileText className="w-3.5 h-3.5" />
          {filtered.length} de {items.length} ronda(s)
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold">Excluir ronda?</h3>
                <p className="text-xs text-muted-foreground">
                  Esta ação irá apagar todos os registros e fotos desta ronda.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  const card = [...andamento, ...finalizado].find(
                    (c) => c.cycleKey === confirmDelete,
                  );
                  if (card) excluir(card);
                }}
              >
                <Trash2 className="w-4 h-4 mr-1" /> Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RondaCardItem({
  card,
  onExcluir,
}: {
  card: RondaCard;
  onExcluir: () => void;
}) {
  const isAndamento = card.status === "andamento";
  const horaInicio = formatHora(card.inicio);
  const horaFim = card.fim ? formatHora(card.fim) : "—";

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md">
      {/* Header with status */}
      <div
        className={`px-4 py-2 flex items-center justify-between ${
          isAndamento
            ? "bg-green-500/10 border-b border-green-500/20"
            : "bg-muted/50 border-b border-border"
        }`}
      >
        <span
          className={`text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5 ${
            isAndamento ? "text-green-600" : "text-muted-foreground"
          }`}
        >
          {isAndamento && (
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          )}
          {isAndamento ? "Em Andamento" : "Finalizado"}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onExcluir();
          }}
          className="text-muted-foreground hover:text-red-500 transition-colors p-1"
          title="Excluir ronda"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Card body — clickable */}
      <a
        href={`/admin/ronda-detalhe/${encodeURIComponent(card.user_id)}/${encodeURIComponent(card.inicio)}`}
        className="block p-4 space-y-2 w-full text-left cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <User className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <div className="font-semibold truncate text-sm">{card.nome}</div>
            <div className="text-xs text-muted-foreground truncate">
              {card.setor}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="w-3 h-3" />
          {formatData(card.inicio)}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-mono font-medium">
            {horaInicio} — {horaFim}
          </span>
          <span className="text-xs text-muted-foreground ml-auto">
            {card.passosCount} foto(s)
          </span>
        </div>

        {card.observacoes && (
          <div className="text-xs text-muted-foreground line-clamp-2 bg-muted/30 rounded px-2 py-1">
            {card.observacoes}
          </div>
        )}

        <div className="flex items-center justify-end text-xs text-primary font-medium pt-1">
          Ver detalhes <ArrowRight className="w-3 h-3 ml-1" />
        </div>
      </a>
    </div>
  );
}
