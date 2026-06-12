import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { LogOut, Shield, User, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/app/perfil")({
  component: Perfil,
});

const SUPPORT_EMAIL = "suporte04@baeletrica.com.br";

function Perfil() {
  const { profile, role, baseRole, devViewRole, setDevViewRole, signOut, refreshProfile } = useAuth();
  const [setor, setSetor] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canToggleView =
    baseRole === "admin" || profile?.email?.toLowerCase() === SUPPORT_EMAIL;
  const currentView = devViewRole ?? role;

  const alternarVisao = () => {
    setDevViewRole(currentView === "admin" ? "user" : "admin");
  };

  useEffect(() => {
    if (!profile?.setor_id) return;
    supabase.from("setores").select("nome").eq("id", profile.setor_id).maybeSingle()
      .then(({ data }) => setSetor(data?.nome ?? null));
  }, [profile?.setor_id]);

  useEffect(() => {
    if (profile?.foto_url) {
      supabase.storage.from("avatars").createSignedUrl(profile.foto_url, 3600)
        .then(({ data }) => setAvatarUrl(data?.signedUrl ?? null));
    } else {
      setAvatarUrl(null);
    }
  }, [profile?.foto_url]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida");
      return;
    }
    setUploading(true);
    try {
      const path = `${profile.id}/avatar.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;

      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ foto_url: path })
        .eq("id", profile.id);
      if (dbErr) throw dbErr;

      toast.success("Foto de perfil atualizada!");
      await refreshProfile();
    } catch (err: any) {
      toast.error("Erro ao enviar foto", { description: err?.message });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold text-foreground tracking-tight">Perfil</h1>

      <div className="card-neon p-6 text-center space-y-4">
        <div className="relative inline-block">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="group relative block"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={profile?.nome}
                className="w-20 h-20 sm:w-28 sm:h-28 rounded-full object-cover border-2 border-primary/30 glow-cyan"
              />
            ) : (
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-primary/10 text-primary flex items-center justify-center glow-cyan">
                <User className="w-10 h-10 sm:w-14 sm:h-14" />
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {uploading ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
        <div>
          <div className="font-semibold text-lg text-foreground">{profile?.nome}</div>
          <div className="text-sm text-muted-foreground">{profile?.email}</div>
          {setor && <div className="text-xs text-muted-foreground mt-1">Setor: {setor}</div>}
          <div className="text-xs text-muted-foreground mt-1">Perfil: {role === "admin" ? "Administrador" : "Vigilante"}</div>
        </div>
      </div>

      <ThemeToggle className="w-full" />

      {canToggleView && (
        <Button onClick={alternarVisao} variant="ghost" className="w-full text-xs text-muted-foreground hover:bg-hover-subtle">
          <Shield className="w-4 h-4 mr-2" />
          {currentView === "admin" ? "Alternar para Visão Vigilante" : "Alternar para Visão Administrador"}
        </Button>
      )}

      <Button onClick={signOut} variant="outline" className="w-full border-border-subtle hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20">
        <LogOut className="w-4 h-4 mr-2" /> Sair
      </Button>
    </div>
  );
}
