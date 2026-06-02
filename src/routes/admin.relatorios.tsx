import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { Download, Printer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatData, formatHora, TIPO_ACAO_LABEL } from "@/lib/timezone";

export const Route = createFileRoute("/admin/relatorios")({
  component: Relatorios,
});

interface Linha {
  nome: string;
  email: string;
  setor: string;
  tipo: string;
  data: string;
  horarioFoto: string;
  horarioEnvio: string;
  foto: string;
}

function Relatorios() {
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [loading, setLoading] = useState(true);
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  const carregar = async () => {
    setLoading(true);
    let q = supabase.from("registros_ponto")
      .select("tipo_acao,horario_acao,horario_foto,foto_url,user_id")
      .order("horario_acao", { ascending: false })
      .limit(1000);
    if (de) q = q.gte("horario_acao", new Date(de + "T00:00:00").toISOString());
    if (ate) q = q.lte("horario_acao", new Date(ate + "T23:59:59").toISOString());
    const { data: regs } = await q;
    const { data: profs } = await supabase.from("profiles").select("id,nome,email,setor_id");
    const { data: sets } = await supabase.from("setores").select("id,nome");
    const pm = new Map((profs ?? []).map((p: any) => [p.id, p]));
    const sm = new Map((sets ?? []).map((s: any) => [s.id, s.nome]));
    const merged: Linha[] = (regs ?? []).map((r: any) => {
      const p: any = pm.get(r.user_id);
      return {
        nome: p?.nome ?? "—",
        email: p?.email ?? "—",
        setor: p?.setor_id ? sm.get(p.setor_id) ?? "—" : "—",
        tipo: TIPO_ACAO_LABEL[r.tipo_acao] ?? r.tipo_acao,
        data: formatData(r.horario_acao),
        horarioFoto: formatHora(r.horario_acao),
        horarioEnvio: formatHora(r.horario_foto),
        foto: r.foto_url,
      };
    });
    setLinhas(merged);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const exportarExcel = () => {
    const data = linhas.map((l) => ({
      Funcionário: l.nome,
      Setor: l.setor,
      "Tipo de Ação": l.tipo,
      "Horário da Foto": `${l.data} ${l.horarioFoto}`,
      "Horário do Envio": `${l.data} ${l.horarioEnvio}`,
      "Link da Imagem": l.foto,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pontos");
    XLSX.writeFile(wb, `relatorio_ponto_${Date.now()}.xlsx`);
  };

  return (
    <div className="p-8 space-y-6">
      <header className="no-print flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-sm text-muted-foreground">{linhas.length} registro(s)</p>
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="text-xs text-muted-foreground">De</label>
            <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Até</label>
            <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
          <Button variant="outline" onClick={carregar} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aplicar"}
          </Button>
          <Button onClick={exportarExcel}>
            <Download className="w-4 h-4 mr-2" /> Exportar para Excel
          </Button>
          <Button onClick={() => window.print()} variant="secondary">
            <Printer className="w-4 h-4 mr-2" /> Imprimir Relatório (PDF)
          </Button>
        </div>
      </header>

      <div className="print-area bg-card border border-border rounded-2xl p-6">
        <div className="hidden print:block mb-6 border-b pb-4">
          <div className="flex items-center justify-between gap-4">
            <img src="/logo.png" className="h-12 object-contain" alt="BA Elétrica" />
            <div className="text-right">
              <h2 className="text-xl font-bold">Folha de Ponto Oficial</h2>
              <p className="text-xs text-muted-foreground">BA Elétrica — Fuso America/Manaus</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {de && `De ${formatData(new Date(de + "T12:00:00"))} `}
            {ate && `até ${formatData(new Date(ate + "T12:00:00"))}`}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground border-b border-border">
              <tr>
                <th className="text-left py-2 pr-3">Funcionário</th>
                <th className="text-left py-2 pr-3">Setor</th>
                <th className="text-left py-2 pr-3">Tipo</th>
                <th className="text-left py-2 pr-3">Data</th>
                <th className="text-left py-2 pr-3">Horário da Foto</th>
                <th className="text-left py-2 pr-3">Horário do Envio</th>
                <th className="text-left py-2">Foto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {linhas.map((l, i) => (
                <tr key={i} className="align-middle">
                  <td className="py-2 pr-3 font-medium">{l.nome}</td>
                  <td className="py-2 pr-3">{l.setor}</td>
                  <td className="py-2 pr-3">{l.tipo}</td>
                  <td className="py-2 pr-3">{l.data}</td>
                  <td className="py-2 pr-3 tabular-nums">{l.horarioFoto}</td>
                  <td className="py-2 pr-3 tabular-nums">{l.horarioEnvio}</td>
                  <td className="py-2">
                    <img src={l.foto} alt={`Foto de ponto de ${l.nome}`} className="w-14 h-14 rounded object-cover border border-border" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
