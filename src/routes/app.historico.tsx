import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { formatData, formatHora, TIPO_ACAO_LABEL } from "@/lib/timezone";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/historico")({
  component: Historico,
});

interface Registro {
  id: string;
  tipo_acao: string;
  horario_acao: string;
  horario_foto: string;
  foto_url: string;
}

function Historico() {
  const { user } = useAuth();
  const [items, setItems] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("registros_ponto")
      .select("id,tipo_acao,horario_acao,horario_foto,foto_url")
      .eq("user_id", user.id)
      .order("horario_acao", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setItems((data ?? []) as Registro[]);
        setLoading(false);
      });
  }, [user]);

  const grupos = useMemo(() => {
    const m = new Map<string, Registro[]>();
    items.forEach((r) => {
      const k = formatData(r.horario_acao);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    });
    return Array.from(m.entries());
  }, [items]);

  return (
    <div className="px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold">Meu Histórico</h1>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : grupos.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">Nenhum registro ainda.</p>
      ) : (
        grupos.map(([data, regs]) => (
          <section key={data} className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{data}</h2>
            <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
              {regs.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-3">
                  <img
                    src={r.foto_url}
                    alt="foto"
                    className="w-12 h-12 rounded-lg object-cover bg-muted flex-shrink-0"
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{TIPO_ACAO_LABEL[r.tipo_acao]}</div>
                    <div className="text-xs text-muted-foreground">
                      Ação: {formatHora(r.horario_acao)} · Foto: {formatHora(r.horario_foto)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
