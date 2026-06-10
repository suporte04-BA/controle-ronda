import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/perfil")({
  component: Perfil,
});

const SUPPORT_EMAIL = "suporte04@baeletrica.com.br";

function Perfil() {
  const { profile, role, baseRole, devViewRole, setDevViewRole, signOut } = useAuth();
  const [setor, setSetor] = useState<string | null>(null);

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

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold">Perfil</h1>

      <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-3">
        <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <User className="w-10 h-10" />
        </div>
        <div>
          <div className="font-semibold text-lg">{profile?.nome}</div>
          <div className="text-sm text-muted-foreground">{profile?.email}</div>
          {setor && <div className="text-xs text-muted-foreground mt-1">Setor: {setor}</div>}
          <div className="text-xs text-muted-foreground mt-1">Perfil: {role === "admin" ? "Administrador" : "Vigilante"}</div>
        </div>
      </div>

      {canToggleView && (
        <Button onClick={alternarVisao} variant="ghost" className="w-full text-xs text-muted-foreground">
          <Shield className="w-4 h-4 mr-2" />
          {currentView === "admin" ? "Alternar para Visão Vigilante" : "Alternar para Visão Administrador"}
        </Button>
      )}

      <Button onClick={signOut} variant="outline" className="w-full">
        <LogOut className="w-4 h-4 mr-2" /> Sair
      </Button>
    </div>
  );
}
