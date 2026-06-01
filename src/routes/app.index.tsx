import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Camera, CheckCircle2, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  formatData,
  formatHora,
  nowManaus,
  proximaAcao,
  TIPO_ACAO_LABEL,
  type TipoAcao,
} from "@/lib/timezone";
import { CameraCapture } from "@/components/CameraCapture";

export const Route = createFileRoute("/app/")({
  component: BaterPonto,
});

function BaterPonto() {
  const { user } = useAuth();
  const [now, setNow] = useState(nowManaus());
  const [acoesHoje, setAcoesHoje] = useState<string[]>([]);
  const [camOpen, setCamOpen] = useState(false);

  useEffect(() => {
    const i = setInterval(() => setNow(nowManaus()), 1000);
    return () => clearInterval(i);
  }, []);

  const carregarHoje = async () => {
    if (!user) return;
    const hojeStr = formatData(new Date());
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date();
    fim.setHours(23, 59, 59, 999);
    const { data } = await supabase
      .from("registros_ponto")
      .select("tipo_acao, horario_acao")
      .eq("user_id", user.id)
      .gte("horario_acao", inicio.toISOString())
      .lte("horario_acao", fim.toISOString());
    const filtrados = (data ?? []).filter((r) => formatData(r.horario_acao) === hojeStr);
    setAcoesHoje(filtrados.map((r) => r.tipo_acao));
  };

  useEffect(() => { carregarHoje(); }, [user]);

  const proxima = useMemo(() => proximaAcao(acoesHoje), [acoesHoje]);

  const handleCapture = async (blob: Blob) => {
    if (!user || !proxima) return;
    const horarioAcao = new Date().toISOString();
    const path = `${user.id}/${Date.now()}_${proxima}.jpg`;
    const { error: upErr } = await supabase.storage
      .from("fotos_ponto")
      .upload(path, blob, { contentType: "image/jpeg", upsert: false });
    if (upErr) {
      toast.error("Erro ao enviar foto", { description: upErr.message });
      return;
    }
    const { data: urlData } = supabase.storage.from("fotos_ponto").getPublicUrl(path);
    const { error: insErr } = await supabase.from("registros_ponto").insert({
      user_id: user.id,
      tipo_acao: proxima as TipoAcao,
      horario_acao: horarioAcao,
      horario_foto: new Date().toISOString(),
      foto_url: urlData.publicUrl,
    });
    if (insErr) {
      toast.error("Erro ao registrar ponto", { description: insErr.message });
      return;
    }
    toast.success(`${TIPO_ACAO_LABEL[proxima]} registrado com sucesso!`);
    setCamOpen(false);
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

      <div className="bg-card border border-border rounded-3xl p-8 text-center shadow-sm">
        <Clock className="w-6 h-6 mx-auto text-primary mb-2" />
        <div className="text-5xl font-bold tabular-nums tracking-tight">{formatHora(new Date())}</div>
        <div className="text-sm text-muted-foreground mt-2">{formatData(new Date())}</div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Hoje</h2>
        <div className="grid grid-cols-3 gap-2">
          {(["check_in", "check_out_1", "check_out_2"] as const).map((t) => {
            const done = acoesHoje.includes(t);
            return (
              <div
                key={t}
                className={`rounded-xl p-3 text-center border ${
                  done ? "bg-success/10 border-success/30 text-success" : "bg-muted border-border text-muted-foreground"
                }`}
              >
                {done && <CheckCircle2 className="w-4 h-4 mx-auto mb-1" />}
                <div className="text-[11px] font-medium">{TIPO_ACAO_LABEL[t]}</div>
              </div>
            );
          })}
        </div>
      </div>

      {proxima ? (
        <Button onClick={() => setCamOpen(true)} size="lg" className="w-full h-16 text-base rounded-2xl">
          <Camera className="w-5 h-5 mr-2" />
          Registrar {TIPO_ACAO_LABEL[proxima]}
        </Button>
      ) : (
        <div className="bg-success/10 border border-success/30 text-success rounded-2xl p-6 text-center">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-2" />
          <p className="font-semibold">Todos os registros do dia concluídos!</p>
          <p className="text-xs mt-1 text-success/80">Bom descanso. Volte amanhã.</p>
        </div>
      )}

      <CameraCapture
        open={camOpen}
        onCancel={() => setCamOpen(false)}
        onCapture={handleCapture}
        title={proxima ? TIPO_ACAO_LABEL[proxima] : "Registrar"}
      />
    </div>
  );
}
