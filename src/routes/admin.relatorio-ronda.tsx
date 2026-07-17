import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  FileText,
  Loader2,
  User,
  Calendar,
  Clock,
  ArrowRight,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  formatData,
  formatHora,
  formatManaus,
  TIPO_ACAO_LABEL,
  CICLO_RONDA,
  nowManaus,
} from "@/lib/timezone";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/relatorio-ronda")({
  component: RelatorioRonda,
});

interface RondaCard {
  cycleKey: string;
  user_id: string;
  nome: string;
  setor: string;
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

  const carregar = async () => {
    setLoading(true);
    const [{ data: regs }, { data: profs }, { data: sets }] = await Promise.all([
      supabase
        .from("registros_ponto")
        .select("id,user_id,tipo_acao,horario_acao,horario_foto,foto_url,observacoes")
        .order("horario_acao", { ascending: true })
        .limit(10000),
      supabase.from("profiles").select("id,nome,setor_id"),
      supabase.from("setores").select("id,nome"),
    ]);

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
        const isFinished = last.tipo_acao === "check_out_2";
        rondas.push({
          cycleKey: `${userId}_${checkIn.horario_acao}`,
          user_id: userId,
          nome,
          setor,
          inicio: checkIn.horario_acao,
          fim: isFinished ? last.horario_acao : null,
          status: isFinished ? "finalizado" : "andamento",
          passosCount: ciclo.length,
          observacoes: isFinished ? (last.observacoes ?? null) : null,
        });
        ciclo = [];
      };

      lista.forEach((r: any) => {
        if (r.tipo_acao === "check_in") {
          flush();
          ciclo = [r];
        } else if (r.tipo_acao === "check_out_2") {
          ciclo.push(r);
          flush();
        } else {
          ciclo.push(r);
        }
      });
      flush();
    });

    rondas.sort(
      (a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime(),
    );
    setItems(rondas);
    setLoading(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const excluir = async (card: RondaCard) => {
    const id = toast.loading("Excluindo ronda...");
    try {
      const { data: regs } = await supabase
        .from("registros_ponto")
        .select("id,foto_url")
        .eq("user_id", card.user_id)
        .gte("horario_acao", card.inicio)
        .lte("horario_acao", card.fim ?? card.inicio);

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
      carregar();
    } catch (e: any) {
      toast.error(`Erro: ${e?.message ?? "desconhecido"}`, { id });
    }
  };

  const andamento = items.filter((i) => i.status === "andamento");
  const finalizado = items.filter((i) => i.status === "finalizado");

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Relatório de Ronda</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhamento em tempo real das rondas. Clique para ver detalhes.
        </p>
      </header>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center text-muted-foreground">
          Nenhuma ronda registrada.
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
          {items.length} ronda(s) no total
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

      {/* Card body — clickable (SPA navigation preserves auth state) */}
      <a
        href={`/admin/ronda-detalhe/${encodeURIComponent(card.user_id)}/${encodeURIComponent(card.inicio)}`}
        target="_blank"
        rel="noopener noreferrer"
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
