import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/setores")({
  component: Setores,
});

function Setores() {
  const [items, setItems] = useState<{ id: string; nome: string }[]>([]);
  const [novo, setNovo] = useState("");
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    setLoading(true);
    const { data } = await supabase.from("setores").select("id,nome").order("nome");
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novo.trim()) return;
    const { error } = await supabase.from("setores").insert({ nome: novo.trim() });
    if (error) toast.error("Erro: " + error.message);
    else { toast.success("Setor criado"); setNovo(""); carregar(); }
  };

  const excluir = async (id: string) => {
    const { error } = await supabase.from("setores").delete().eq("id", id);
    if (error) toast.error("Erro: " + error.message);
    else { toast.success("Setor excluído"); carregar(); }
  };

  return (
    <div className="p-8 space-y-6 max-w-2xl">
      <header>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Setores</h1>
        <p className="text-sm text-muted-foreground">Organize os funcionários por área</p>
      </header>

      <form onSubmit={criar} className="flex gap-2">
        <Input placeholder="Nome do setor" value={novo} onChange={(e) => setNovo(e.target.value)}
          className="bg-secondary/50 border-border-subtle focus:border-primary/40 focus:ring-primary/20" />
        <Button type="submit" className="bg-primary text-primary-foreground hover:shadow-[0_0_16px_rgba(0,240,255,0.25)]"><Plus className="w-4 h-4 mr-1" /> Criar</Button>
      </form>

      <div className="card-neon overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-neon-cyan" /></div>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground text-sm">Nenhum setor criado.</p>
        ) : (
          <ul className="divide-y divide-subtle">
            {items.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-4 py-3 hover:bg-hover-subtle transition-colors">
                <span className="font-medium text-foreground">{s.nome}</span>
                <Button size="sm" variant="ghost" onClick={() => excluir(s.id)} className="hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
