import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/perfil")({
  component: Perfil,
});

function Perfil() {
  const { profile, role, baseRole, devViewRole, setDevViewRole, signOut } = useAuth();
  const [setor, setSetor] = useState<string | null>(null);

  const alternarVisao = () => {
    if ((devViewRole ?? role) === "admin") setDevViewRole("user");
    else setDevViewRole("admin");
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
          <div className="text-xs text-muted-foreground mt-1">Perfil: {role === "admin" ? "Administrador" : "Funcionário"}</div>
        </div>
      </div>

      <Button onClick={alternarVisao} variant="ghost" className="w-full text-xs text-muted-foreground">
        <Shield className="w-4 h-4 mr-2" /> Alternar Visão (Dev)
        {devViewRole && <span className="ml-1">— base: {baseRole}</span>}
      </Button>

      <Button onClick={signOut} variant="outline" className="w-full">
        <LogOut className="w-4 h-4 mr-2" /> Sair
      </Button>
    </div>
  );
}
