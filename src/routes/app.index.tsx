import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, CheckCircle2, Clock, MapPin, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  formatData,
  formatHora,
  nowManaus,
  acoesDoCicloAtual,
  proximaAcao,
  TIPO_ACAO_LABEL,
  CICLO_RONDA,
  type TipoAcao,
} from "@/lib/timezone";
import { CameraCapture } from "@/components/CameraCapture";

export const Route = createFileRoute("/app/")({
  component: BaterPonto,
});

interface PendingFoto {
  blob: Blob;
  timestamps: { horarioCapturaOriginal: string; horarioConfirmacaoEnvio: string };
  acao: TipoAcao;
}

function BaterPonto() {
  const { user } = useAuth();
  const [now, setNow] = useState(nowManaus());
  const [acoesHoje, setAcoesHoje] = useState<string[]>([]);
  const [camOpen, setCamOpen] = useState(false);
  const [obsOpen, setObsOpen] = useState(false);
  const [obsText, setObsText] = useState("");
  const [pendingFoto, setPendingFoto] = useState<PendingFoto | null>(null);
  const uploadingRef = useRef(false);

  useEffect(() => {
    const i = setInterval(() => setNow(nowManaus()), 1000);
    return () => clearInterval(i);
  }, []);

  const carregarHoje = async () => {
    if (!user) return;
    // Janela 7h-7h (igual ao relatório diário)
    // 7am Manaus = 11:00 UTC (UTC-4)
    const now = new Date();
    const utcH = now.getUTCHours();
    let cycleStart: Date;
    if (utcH >= 11) {
      cycleStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 11, 0, 0));
    } else {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - 1);
      cycleStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 11, 0, 0));
    }
    const { data } = await supabase
      .from("registros_ponto")
      .select("tipo_acao, horario_acao")
      .eq("user_id", user.id)
      .gte("horario_acao", cycleStart.toISOString())
      .order("horario_acao", { ascending: true })
      .limit(1000);
    setAcoesHoje((data ?? []).map((r) => r.tipo_acao));
  };

  useEffect(() => {
    carregarHoje();
  }, [user]);

  const proxima = useMemo(() => proximaAcao(acoesHoje), [acoesHoje]);
  const cicloAtual = useMemo(() => acoesDoCicloAtual(acoesHoje), [acoesHoje]);

  const salvarRegistro = async (foto: PendingFoto, observacoes?: string) => {
    const path = `${user!.id}/${Date.now()}_${foto.acao}.jpg`;
    const { error: upErr } = await supabase.storage
      .from("fotos_ponto")
      .upload(path, foto.blob, { contentType: "image/jpeg", upsert: false });
    if (upErr) {
      toast.error("Erro ao enviar foto", { description: upErr.message });
      return false;
    }
    const { error: insErr } = await supabase.from("registros_ponto").insert({
      user_id: user!.id,
      tipo_acao: foto.acao,
      horario_acao: foto.timestamps.horarioCapturaOriginal,
      horario_foto: foto.timestamps.horarioConfirmacaoEnvio,
      foto_url: path,
      observacoes: observacoes ?? null,
    });
    if (insErr) {
      toast.error("Erro ao registrar ponto", { description: insErr.message });
      return false;
    }
    return true;
  };

  const handleCapture = async (
    blob: Blob,
    timestamps: { horarioCapturaOriginal: string; horarioConfirmacaoEnvio: string },
  ) => {
    if (!user || !proxima || uploadingRef.current) return;
    const pend: PendingFoto = { blob, timestamps, acao: proxima };

    // Última ação do ciclo (Fim) -> abre tela de ocorrência antes de salvar
    if (proxima === "check_out_2") {
      setPendingFoto(pend);
      setObsText("");
      setObsOpen(true);
      setCamOpen(false);
      return;
    }

    uploadingRef.current = true;
    const ok = await salvarRegistro(pend);
    uploadingRef.current = false;
    if (!ok) return;
    toast.success(`${TIPO_ACAO_LABEL[proxima]} registrado com sucesso!`);
    setCamOpen(false);
    await carregarHoje();
  };

  const confirmarObs = async (enviar: boolean) => {
    if (!pendingFoto || uploadingRef.current) return;
    uploadingRef.current = true;
    const ok = await salvarRegistro(pendingFoto, enviar ? obsText.trim() : null);
    uploadingRef.current = false;
    if (!ok) return;
    toast.success(
      enviar && obsText.trim()
        ? "Ronda concluída com ocorrência registrada!"
        : "Ronda concluída com sucesso!",
    );
    setObsOpen(false);
    setPendingFoto(null);
    setObsText("");
    setAcoesHoje([]);
    await carregarHoje();
  };

  return (
    <div className="px-4 py-6 space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground capitalize">
          {now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="w-3.5 h-3.5" />
          <span>Fuso horário: Manaus (UTC-4)</span>
        </div>
      </header>

      <div className="card-neon p-8 text-center glow-cyan animate-neon-pulse">
        <Clock className="w-6 h-6 mx-auto text-neon-cyan mb-2" />
        <div className="text-5xl font-bold tabular-nums tracking-tight text-foreground text-glow-cyan">
          {formatHora(now)}
        </div>
        <div className="text-sm text-muted-foreground mt-2">{formatData(now)}</div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Ronda atual
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {CICLO_RONDA.map((t) => {
            const feito = cicloAtual.includes(t);
            return (
              <div
                key={t}
                className={`rounded-xl p-3 text-center border transition-all duration-300 ${
                  feito
                    ? "bg-success/10 border-success/30 text-success shadow-[0_0_12px_rgba(0,255,136,0.15)]"
                    : "bg-secondary/50 border-border-subtle text-muted-foreground"
                }`}
              >
                {feito && <CheckCircle2 className="w-4 h-4 mx-auto mb-1" />}
                <div className="text-[11px] font-medium leading-tight">{TIPO_ACAO_LABEL[t]}</div>
              </div>
            );
          })}
        </div>
      </div>

      {proxima ? (
        <Button
          onClick={() => setCamOpen(true)}
          size="lg"
          className="w-full h-16 text-base rounded-2xl bg-primary text-primary-foreground font-semibold hover:shadow-[0_0_24px_rgba(0,240,255,0.35)] transition-all duration-200 animate-neon-pulse"
        >
          <Camera className="w-5 h-5 mr-2" />
          Registrar {TIPO_ACAO_LABEL[proxima]}
        </Button>
      ) : (
        <div className="card-neon p-6 text-center glow-cyan">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-success" />
          <p className="font-semibold text-foreground">Todos os registros do dia concluídos!</p>
          <p className="text-xs mt-1 text-muted-foreground">Bom descanso. Volte amanhã.</p>
        </div>
      )}

      <CameraCapture
        open={camOpen}
        onCancel={() => setCamOpen(false)}
        onCapture={handleCapture}
        title={proxima ? TIPO_ACAO_LABEL[proxima] : "Registrar"}
      />

      {obsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-primary">
              <FileText className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Ocorrência da Ronda</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Descreva algum acontecimento durante a ronda (opcional). Se não houve ocorrência, basta
              prosseguir.
            </p>
            <textarea
              className="w-full h-32 p-3 text-sm border border-border rounded-lg bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ex.: portão lateral aberto, luz da recepção apagada..."
              value={obsText}
              onChange={(e) => setObsText(e.target.value)}
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => confirmarObs(false)}>
                Não (enviar sem ocorrência)
              </Button>
              <Button className="flex-1" onClick={() => confirmarObs(true)}>
                Enviar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
