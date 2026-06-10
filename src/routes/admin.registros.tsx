import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Loader2, Search, Download, Printer, FileText, X, Send, Copy, Terminal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatData, formatHora, TIPO_ACAO_LABEL, formatManaus } from "@/lib/timezone";
import { getSignedFotoUrl } from "@/lib/storage";
import { sendTestReport } from "@/lib/report.functions";
import { useAuth } from "@/lib/auth";

const SUPABASE_PROJECT_REF = import.meta.env.VITE_SUPABASE_PROJECT_ID || "hhrlgmqbcjzevpvmqisr";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

const CRON_SQL = `-- BA Elétrica — Agendamento diário do relatório de Controle de Ronda
-- Executar uma única vez no SQL Editor do Supabase
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove agendamento anterior (se existir) para evitar duplicidade
SELECT cron.unschedule('ba-report-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ba-report-daily');

-- Agenda para 11:00 UTC = 07:00 America/Manaus, todos os dias
SELECT cron.schedule(
  'ba-report-daily',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/send-daily-report',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer ${SUPABASE_ANON_KEY}"}'::jsonb,
    body := '{"modo":"diario"}'::jsonb
  );
  $$
);`;

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
  email: string;
  setor: string | null;
}

type Preset = "hoje" | "ontem" | "semana" | "semana_passada" | "mes" | "ultimos7" | "custom";

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23,59,59,999); return x; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function toInput(d: Date) {
  const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,"0"); const dd = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${dd}`;
}
function fromInput(s: string) { return new Date(s + "T00:00:00"); }

function rangeFromPreset(p: Preset): { from: string; to: string } | null {
  const now = new Date();
  if (p === "hoje") return { from: toInput(now), to: toInput(now) };
  if (p === "ontem") { const y = addDays(now, -1); return { from: toInput(y), to: toInput(y) }; }
  if (p === "ultimos7") return { from: toInput(addDays(now, -6)), to: toInput(now) };
  if (p === "semana" || p === "semana_passada") {
    const dow = now.getDay(); // 0 sun .. 6 sat
    const diffToMon = (dow + 6) % 7;
    const monThis = addDays(now, -diffToMon);
    if (p === "semana") return { from: toInput(monThis), to: toInput(addDays(monThis, 6)) };
    const monLast = addDays(monThis, -7);
    return { from: toInput(monLast), to: toInput(addDays(monLast, 6)) };
  }
  if (p === "mes") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth()+1, 0);
    return { from: toInput(first), to: toInput(last) };
  }
  return null;
}

function TodosRegistros() {
  const { baseRole } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [busca, setBusca] = useState("");
  const [setorFiltro, setSetorFiltro] = useState<string>("all");
  const [preset, setPreset] = useState<Preset>("hoje");
  const initial = rangeFromPreset("hoje")!;
  const [dataDe, setDataDe] = useState<string>(initial.from);
  const [dataAte, setDataAte] = useState<string>(initial.to);
  const [setores, setSetores] = useState<{ id: string; nome: string }[]>([]);
  const [detalhe, setDetalhe] = useState<Row | null>(null);
  const [mostrarSql, setMostrarSql] = useState(false);

  const dispararTeste = async () => {
    setEnviando(true);
    const id = toast.loading("Enviando relatório de teste...");
    try {
      const r = await sendTestReport();
      if (!r?.ok) {
        toast.error(`Falha no Resend: ${r?.error ?? r?.message ?? "domínio não verificado ou chave inválida"}`, { id, duration: 12000 });
      } else {
        toast.success(`Enviado para: ${(r.recipients ?? []).join(", ") || "(ninguém)"}`, { id });
      }
    } catch (e: any) {
      toast.error(`Falha no Resend: ${e?.message ?? "erro desconhecido"}`, { id, duration: 12000 });
    } finally {
      setEnviando(false);
    }
  };

  const copiarSql = async () => {
    try {
      await navigator.clipboard.writeText(CRON_SQL);
      toast.success("Script SQL copiado. Cole no SQL Editor do Supabase.");
    } catch {
      toast.error("Não foi possível copiar — selecione e copie manualmente.");
    }
  };

  useEffect(() => {
    (async () => {
      const [{ data: regs }, { data: profs }, { data: sets }] = await Promise.all([
        supabase.from("registros_ponto")
          .select("id,tipo_acao,horario_acao,horario_foto,foto_url,user_id")
          .order("horario_acao", { ascending: false })
          .limit(5000),
        supabase.from("profiles").select("id,nome,email,setor_id"),
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
          email: p?.email ?? "",
          setor: p?.setor_id ? setMap.get(p.setor_id) ?? null : null,
        };
      });
      setRows(merged);
      setLoading(false);
    })();
  }, []);

  const aplicarPreset = (p: Preset) => {
    setPreset(p);
    if (p !== "custom") {
      const r = rangeFromPreset(p);
      if (r) { setDataDe(r.from); setDataAte(r.to); }
    }
  };

  const filtrados = useMemo(() => {
    const de = dataDe ? startOfDay(fromInput(dataDe)).getTime() : null;
    const ate = dataAte ? endOfDay(fromInput(dataAte)).getTime() : null;
    return rows.filter((r) => {
      if (busca && !r.nome.toLowerCase().includes(busca.toLowerCase())) return false;
      if (setorFiltro !== "all" && r.setor !== setorFiltro) return false;
      const t = new Date(r.horario_acao).getTime();
      if (de !== null && t < de) return false;
      if (ate !== null && t > ate) return false;
      return true;
    });
  }, [rows, busca, setorFiltro, dataDe, dataAte]);

  const intervaloValido = !!(dataDe && dataAte);

  const exportarExcel = () => {
    if (!intervaloValido) {
      toast.error("Selecione um período de datas antes de exportar.");
      return;
    }
    if (filtrados.length === 0) {
      toast.error("Nenhum registro no período selecionado.");
      return;
    }
    const data = filtrados.map((r) => ({
      Colaborador: r.nome,
      Email: r.email,
      Setor: r.setor ?? "—",
      "Tipo de Ronda": TIPO_ACAO_LABEL[r.tipo_acao] ?? r.tipo_acao,
      "Horário da Foto (Manaus)": `${formatData(r.horario_acao)} ${formatHora(r.horario_acao)}`,
      "Horário de Envio (Manaus)": `${formatData(r.horario_foto)} ${formatHora(r.horario_foto)}`,
      "Caminho do Arquivo": r.foto_url,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [
      { wch: 28 }, { wch: 28 }, { wch: 22 }, { wch: 22 }, { wch: 26 }, { wch: 26 }, { wch: 60 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rondas");
    XLSX.writeFile(wb, `controle_ronda_${dataDe}_a_${dataAte}.xlsx`);
  };

  const imprimirRelatorio = () => {
    if (!intervaloValido) {
      toast.error("Selecione um período de datas antes de imprimir.");
      return;
    }
    if (filtrados.length === 0) {
      toast.error("Nenhum registro no período selecionado.");
      return;
    }
    window.print();
  };

  return (
    <div className="p-8 space-y-6">
      <header className="no-print flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Controle de Ronda</h1>
          <p className="text-sm text-muted-foreground">{filtrados.length} registro(s) no período</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {baseRole === "admin" && (
            <Button onClick={dispararTeste} disabled={enviando} variant="default" className="bg-[color:var(--brand-red)] hover:bg-[color:var(--brand-red)]/90 text-white">
              {enviando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Enviar Relatório de Teste
            </Button>
          )}
          {baseRole === "admin" && (
            <Button onClick={() => setMostrarSql((v) => !v)} variant="outline">
              <Terminal className="w-4 h-4 mr-2" /> {mostrarSql ? "Ocultar SQL do Cron" : "Agendar Cron Diário (SQL)"}
            </Button>
          )}
          <Button onClick={exportarExcel} disabled={!intervaloValido}>
            <Download className="w-4 h-4 mr-2" /> Exportar Excel
          </Button>
          <Button onClick={imprimirRelatorio} variant="secondary" disabled={!intervaloValido}>
            <Printer className="w-4 h-4 mr-2" /> Imprimir Relatório (PDF)
          </Button>
        </div>
      </header>

      {mostrarSql && baseRole === "admin" && (
        <div className="no-print bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold flex items-center gap-2"><Terminal className="w-4 h-4" /> Agendamento Automático (pg_cron + pg_net)</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Cole o script abaixo no <b>SQL Editor</b> do Supabase e execute uma única vez.
                Ele dispara a Edge Function <code>send-daily-report</code> todos os dias às <b>07:00 (America/Manaus)</b>.
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={copiarSql}><Copy className="w-4 h-4 mr-2" /> Copiar SQL</Button>
          </div>
          <pre className="text-xs bg-muted text-foreground p-3 rounded-lg overflow-auto max-h-72 whitespace-pre"><code>{CRON_SQL}</code></pre>
        </div>
      )}



      <div className="no-print bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {([
            ["hoje","Hoje"],["ontem","Ontem"],["ultimos7","Últimos 7 dias"],
            ["semana","Semana atual"],["semana_passada","Semana passada"],["mes","Mês atual"],["custom","Personalizado"],
          ] as [Preset,string][]).map(([k,l]) => (
            <Button key={k} size="sm" variant={preset===k?"default":"outline"} onClick={() => aplicarPreset(k)}>{l}</Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">De</label>
            <Input type="date" value={dataDe} onChange={(e) => { setPreset("custom"); setDataDe(e.target.value); }} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Até</label>
            <Input type="date" value={dataAte} onChange={(e) => { setPreset("custom"); setDataAte(e.target.value); }} />
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nome..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
          </div>
          <Select value={setorFiltro} onValueChange={setSetorFiltro}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Setor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os setores</SelectItem>
              {setores.map((s) => <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="print-area bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="hidden print:flex items-center justify-between gap-4 px-6 py-4 border-b">
          <img src="/logo.png" className="h-12 object-contain" alt="BA Elétrica" />
          <div className="text-right">
            <h2 className="text-xl font-bold">Folha Oficial de Controle de Ronda</h2>
            <p className="text-xs text-muted-foreground">BA Elétrica — Fuso America/Manaus</p>
            <p className="text-xs text-muted-foreground">
              Período: {dataDe} a {dataAte} — {filtrados.length} registro(s) — emitido em {formatData(new Date())} {formatHora(new Date())}
            </p>
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Colaborador</th>
                  <th className="text-left px-4 py-3">Setor</th>
                  <th className="text-left px-4 py-3">Tipo de Ronda</th>
                  <th className="text-left px-4 py-3">Data</th>
                  <th className="text-left px-4 py-3">Horário da Foto</th>
                  <th className="text-left px-4 py-3">Horário do Envio</th>
                  <th className="text-right px-4 py-3 no-print">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtrados.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-muted/30 align-middle cursor-pointer"
                    onClick={() => setDetalhe(r)}
                  >
                    <td className="px-4 py-3 font-medium">{r.nome}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.setor ?? "—"}</td>
                    <td className="px-4 py-3">{TIPO_ACAO_LABEL[r.tipo_acao] ?? r.tipo_acao}</td>
                    <td className="px-4 py-3">{formatData(r.horario_acao)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatHora(r.horario_acao)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatHora(r.horario_foto)}</td>
                    <td className="px-4 py-3 text-right no-print">
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setDetalhe(r); }}>
                        <FileText className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum registro no período</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DetalheModal row={detalhe} onClose={() => setDetalhe(null)} todos={rows} />
    </div>
  );
}

function DetalheModal({ row, onClose, todos }: { row: Row | null; onClose: () => void; todos: Row[] }) {
  const [ciclo, setCiclo] = useState<Row[]>([]);
  const [signed, setSigned] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!row) { setCiclo([]); setSigned(new Map()); return; }
    setLoading(true);
    // Reconstrói o ciclo cronológico do usuário até o registro clicado
    const userRows = todos
      .filter((r) => r.user_id === row.user_id)
      .slice() // copy
      .sort((a, b) => new Date(a.horario_acao).getTime() - new Date(b.horario_acao).getTime());
    const idxClicked = userRows.findIndex((r) => r.id === row.id);
    if (idxClicked < 0) { setCiclo([row]); setLoading(false); return; }

    // Encontra início do ciclo: o último check_in antes/no clicado, depois do último check_out_2 anterior
    let inicio = idxClicked;
    for (let i = idxClicked; i >= 0; i--) {
      if (userRows[i].tipo_acao === "check_in") { inicio = i; break; }
      if (i < idxClicked && userRows[i].tipo_acao === "check_out_2") { inicio = i + 1; break; }
    }
    const cicloRows = userRows.slice(inicio, idxClicked + 1);
    setCiclo(cicloRows);

    (async () => {
      const map = new Map<string, string>();
      await Promise.all(cicloRows.map(async (r) => {
        const u = await getSignedFotoUrl(r.foto_url, 600);
        if (u) map.set(r.id, u);
      }));
      setSigned(map);
      setLoading(false);
    })();
  }, [row, todos]);

  const guardarPdf = () => {
    document.body.classList.add("printing-modal");
    const cleanup = () => {
      document.body.classList.remove("printing-modal");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    setTimeout(() => window.print(), 50);
  };

  if (!row) return null;

  return (
    <Dialog open={!!row} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto print-modal">
        <DialogTitle className="sr-only">Detalhes do ciclo de ronda</DialogTitle>

        <header className="flex items-start justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <img src="/logo.png" className="h-12 object-contain" alt="BA Elétrica" />
            <div>
              <h2 className="text-lg font-bold">BA Elétrica — Controle de Ronda</h2>
              <p className="text-xs text-muted-foreground">Documento de auditoria</p>
            </div>
          </div>
          <Button size="icon" variant="ghost" className="no-print" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-3 py-4 text-sm">
          <div><div className="text-xs text-muted-foreground">Funcionário</div><div className="font-semibold">{row.nome}</div></div>
          <div><div className="text-xs text-muted-foreground">E-mail</div><div className="font-medium break-all">{row.email || "—"}</div></div>
          <div><div className="text-xs text-muted-foreground">Setor</div><div className="font-medium">{row.setor ?? "—"}</div></div>
          <div className="md:col-span-3"><div className="text-xs text-muted-foreground">Data do ciclo</div><div className="font-medium">{formatData(row.horario_acao)}</div></div>
        </section>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <ol className="relative border-l-2 border-primary/30 ml-3 space-y-6 py-2">
            {ciclo.map((r, idx) => (
              <li key={r.id} className="pl-6 relative">
                <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-primary border-4 border-background" />
                <div className="flex flex-wrap items-baseline gap-3">
                  <h3 className="font-semibold">{idx + 1}. {TIPO_ACAO_LABEL[r.tipo_acao] ?? r.tipo_acao}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mt-2">
                  <div>
                    <div className="text-xs text-muted-foreground">Horário da captura</div>
                    <div className="tabular-nums">{formatManaus(r.horario_acao)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Horário de envio</div>
                    <div className="tabular-nums">{formatManaus(r.horario_foto)}</div>
                  </div>
                </div>
                {signed.get(r.id) ? (
                  <img
                    src={signed.get(r.id)}
                    alt={`Foto ${TIPO_ACAO_LABEL[r.tipo_acao]}`}
                    className="mt-3 w-full max-w-sm rounded-lg border border-border object-cover"
                  />
                ) : (
                  <div className="mt-3 w-full max-w-sm aspect-[4/3] rounded-lg border border-border bg-muted animate-pulse" />
                )}
              </li>
            ))}
          </ol>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border mt-4 no-print">
          <p className="text-xs text-muted-foreground">Gerado em {formatManaus(new Date())} · Fuso America/Manaus</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Fechar</Button>
            <Button onClick={guardarPdf}>
              <Printer className="w-4 h-4 mr-2" /> Guardar como PDF
            </Button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
