import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatData, formatHora, TIPO_ACAO_LABEL } from "@/lib/timezone";

export const Route = createFileRoute("/admin/registros")({
  component: TodosRegistros,
});

interface Row {
  id: string;
  tipo_acao: string;
  horario_acao: string;
  horario_foto: string;
  foto_url: string;
  user_id: string;
  nome: string;
  setor: string | null;
}

function TodosRegistros() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [setorFiltro, setSetorFiltro] = useState<string>("all");
  const [dataFiltro, setDataFiltro] = useState<string>("");
  const [setores, setSetores] = useState<{ id: string; nome: string }[]>([]);
  const [fotoOpen, setFotoOpen] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: regs }, { data: profs }, { data: sets }] = await Promise.all([
        supabase.from("registros_ponto")
          .select("id,tipo_acao,horario_acao,horario_foto,foto_url,user_id")
          .order("horario_acao", { ascending: false })
          .limit(500),
        supabase.from("profiles").select("id,nome,setor_id"),
        supabase.from("setores").select("id,nome"),
      ]);
      const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
      const setMap = new Map((sets ?? []).map((s: any) => [s.id, s.nome]));
      setSetores(sets ?? []);
      const merged: Row[] = (regs ?? []).map((r: any) => {
        const p: any = profMap.get(r.user_id);
        return {
          ...r,
          nome: p?.nome ?? "—",
          setor: p?.setor_id ? setMap.get(p.setor_id) ?? null : null,
        };
      });
      setRows(merged);
      setLoading(false);
    })();
  }, []);

  const filtrados = useMemo(() => {
    return rows.filter((r) => {
      if (busca && !r.nome.toLowerCase().includes(busca.toLowerCase())) return false;
      if (setorFiltro !== "all" && r.setor !== setorFiltro) return false;
      if (dataFiltro) {
        const d = new Date(dataFiltro + "T12:00:00");
        if (formatData(r.horario_acao) !== formatData(d)) return false;
      }
      return true;
    });
  }, [rows, busca, setorFiltro, dataFiltro]);

  return (
    <div className="p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Todos os Registros</h1>
        <p className="text-sm text-muted-foreground">{filtrados.length} registro(s)</p>
      </header>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nome..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
        </div>
        <Input type="date" value={dataFiltro} onChange={(e) => setDataFiltro(e.target.value)} className="w-auto" />
        <Select value={setorFiltro} onValueChange={setSetorFiltro}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Setor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os setores</SelectItem>
            {setores.map((s) => <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Funcionário</th>
                  <th className="text-left px-4 py-3">Setor</th>
                  <th className="text-left px-4 py-3">Ação</th>
                  <th className="text-left px-4 py-3">Data</th>
                  <th className="text-left px-4 py-3">Horário (Ação)</th>
                  <th className="text-left px-4 py-3">Horário (Foto)</th>
                  <th className="text-right px-4 py-3">Foto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtrados.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{r.nome}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.setor ?? "—"}</td>
                    <td className="px-4 py-3">{TIPO_ACAO_LABEL[r.tipo_acao]}</td>
                    <td className="px-4 py-3">{formatData(r.horario_acao)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatHora(r.horario_acao)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatHora(r.horario_foto)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setFotoOpen(r.foto_url)}>
                        <ImageIcon className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum registro encontrado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={!!fotoOpen} onOpenChange={(v) => !v && setFotoOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogTitle>Foto do registro</DialogTitle>
          {fotoOpen && <img src={fotoOpen} alt="Foto" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
