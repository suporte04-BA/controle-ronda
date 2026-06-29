import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { formatData, formatHora, TIPO_ACAO_LABEL } from "@/lib/timezone";
import { Loader2, ImageOff, User } from "lucide-react";
import { getSignedFotoUrls } from "@/lib/storage";

export const Route = createFileRoute("/app/historico")({
  component: Historico,
});

interface Registro {
  id: string;
  tipo_acao: string;
  horario_acao: string;
  horario_foto: string;
  foto_url: string;
  nome?: string;
  avatar_url?: string | null;
}

function FotoThumbnail({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);
  if (error || !src) {
    return (
      <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
        <ImageOff className="w-5 h-5 text-muted-foreground" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className="w-12 h-12 rounded-lg object-cover bg-secondary flex-shrink-0"
      loading="lazy"
      onError={() => setError(true)}
    />
  );
}

function AvatarThumb({ src, nome }: { src: string | null; nome: string }) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center flex-shrink-0 border border-primary/20">
        <User className="w-5 h-5" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={nome}
      className="w-10 h-10 rounded-full object-cover bg-secondary flex-shrink-0 border border-border-subtle"
      loading="lazy"
      onError={() => setError(true)}
    />
  );
}

function Historico() {
  const { user } = useAuth();
  const [items, setItems] = useState<Registro[]>([]);
  const [signed, setSigned] = useState<Map<string, string>>(new Map());
  const [avatarUrls, setAvatarUrls] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("registros_ponto")
        .select("id,tipo_acao,horario_acao,horario_foto,foto_url,user_id")
        .eq("user_id", user.id)
        .order("horario_acao", { ascending: false })
        .limit(100);
      if (cancelled) return;

      const list = (data ?? []) as Registro[];

      const { data: prof } = await supabase
        .from("profiles")
        .select("id,nome,foto_url")
        .eq("id", user.id)
        .maybeSingle();

      const nome = prof?.nome ?? user.email ?? "";
      const avatarPath = prof?.foto_url ?? null;

      const listWithNome = list.map((r) => ({ ...r, nome }));

      setItems(listWithNome);

      const map = await getSignedFotoUrls(listWithNome.map((r) => r.foto_url));
      if (cancelled) return;
      setSigned(map);

      if (avatarPath) {
        const { data: urlData } = await supabase.storage
          .from("avatars")
          .createSignedUrl(avatarPath, 3600);
        if (urlData?.signedUrl && !cancelled) {
          setAvatarUrls(new Map([[user.id, urlData.signedUrl]]));
        }
      }

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

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
      <h1 className="text-xl font-bold text-foreground tracking-tight">Meu Histórico</h1>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-neon-cyan" />
        </div>
      ) : grupos.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">Nenhum registro ainda.</p>
      ) : (
        grupos.map(([data, regs]) => (
          <section key={data} className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {data}
            </h2>
            <div className="card-neon divide-y divide-subtle overflow-hidden">
              {regs.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 p-3 hover:bg-hover-subtle transition-colors"
                >
                  <AvatarThumb src={avatarUrls.get(r.user_id ?? "") ?? null} nome={r.nome ?? ""} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground">
                      {TIPO_ACAO_LABEL[r.tipo_acao]}
                    </div>
                    <div className="text-xs text-muted-foreground">{r.nome}</div>
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
