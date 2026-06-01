import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Shield, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/usuarios")({
  component: Usuarios,
});

interface User {
  id: string;
  nome: string;
  email: string;
  setor_id: string | null;
  role: string;
}

function Usuarios() {
  const [users, setUsers] = useState<User[]>([]);
  const [setores, setSetores] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    setLoading(true);
    const [{ data: profs }, { data: roles }, { data: sets }] = await Promise.all([
      supabase.from("profiles").select("id,nome,email,setor_id"),
      supabase.from("user_roles").select("user_id,role"),
      supabase.from("setores").select("id,nome").order("nome"),
    ]);
    const roleMap = new Map<string, string>();
    (roles ?? []).forEach((r: any) => {
      if (r.role === "admin" || !roleMap.has(r.user_id)) roleMap.set(r.user_id, r.role);
    });
    setUsers((profs ?? []).map((p: any) => ({ ...p, role: roleMap.get(p.id) ?? "user" })));
    setSetores(sets ?? []);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const atualizarSetor = async (id: string, setor_id: string | null) => {
    const { error } = await supabase.from("profiles").update({ setor_id }).eq("id", id);
    if (error) toast.error("Erro ao atualizar setor");
    else { toast.success("Setor atualizado"); carregar(); }
  };

  const toggleAdmin = async (u: User) => {
    if (u.role === "admin") {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", u.id).eq("role", "admin");
      if (error) toast.error("Erro: " + error.message);
      else { toast.success("Admin removido"); carregar(); }
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: u.id, role: "admin" });
      if (error) toast.error("Erro: " + error.message);
      else { toast.success("Promovido a admin"); carregar(); }
    }
  };

  return (
    <div className="p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Usuários</h1>
        <p className="text-sm text-muted-foreground">{users.length} usuário(s) cadastrado(s)</p>
      </header>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-left px-4 py-3">E-mail</th>
                <th className="text-left px-4 py-3">Setor</th>
                <th className="text-left px-4 py-3">Função</th>
                <th className="text-right px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{u.nome}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <Select
                      value={u.setor_id ?? "none"}
                      onValueChange={(v) => atualizarSetor(u.id, v === "none" ? null : v)}
                    >
                      <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Sem setor —</SelectItem>
                        {setores.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.role === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}>{u.role === "admin" ? "Administrador" : "Funcionário"}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => toggleAdmin(u)}>
                      {u.role === "admin" ? (<><ShieldOff className="w-4 h-4 mr-1" /> Remover admin</>) : (<><Shield className="w-4 h-4 mr-1" /> Tornar admin</>)}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
