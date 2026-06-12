import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Loader2, Search, Download, Printer, FileText, X, Send, ImageOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatData, formatHora, TIPO_ACAO_LABEL, formatManaus, nowManaus } from "@/lib/timezone";
import { getSignedFotoUrl } from "@/lib/storage";
import { sendTestReport } from "@/lib/report.functions";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin/registros")({
  component: TodosRegistros,
});

const SUPPORT_EMAIL = "suporte04@baeletrica.com.br";

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
  setor_id: string | null;
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
  const { baseRole, profile } = useAuth();
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

  const dispararTeste = async () => {
    setEnviando(true);
    const id = toast.loading("Enviando relatório de teste...");
    try {
      const r = await sendTestReport();
      if (!r?.ok) {
        const errMsg = r?.error ?? r?.message ?? "Erro desconhecido";
        if (errMsg.includes("RESEND_API_KEY não configurada")) {
          toast.error("Chave RESEND_API_KEY não configurada. Configure via Supabase Dashboard > Edge Functions > Secrets.", { id, duration: 15000 });
        } else if (errMsg.includes("Domínio não verificado")) {
          toast.error("Domínio do remetente não verificado no Resend. Verifique baeletrica.com.br ou use onboarding@resend.dev.", { id, duration: 15000 });
        } else if (errMsg.includes("Nenhum admin")) {
          toast.error("Nenhum destinatário encontrado. Cadastre um admin no setor GESTOR.", { id, duration: 12000 });
        } else {
          toast.error(`Falha: ${errMsg}`, { id, duration: 12000 });
        }
      } else {
        toast.success(`Enviado para: ${(r.recipients ?? []).join(", ") || "(ninguém)"}`, { id });
      }
    } catch (e: any) {
      const errMsg = e?.message ?? "erro desconhecido";
      if (errMsg.includes("RESEND_API_KEY")) {
        toast.error("Chave RESEND_API_KEY não configurada no Supabase. Veja os logs da Edge Function.", { id, duration: 15000 });
      } else {
        toast.error(`Falha: ${errMsg}`, { id, duration: 12000 });
      }
    } finally {
      setEnviando(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: regs }, { data: profs }, { data: sets }] = await Promise.all([
        supabase.from("registros_ponto")
          .select("id,tipo_acao,horario_acao,horario_foto,foto_url,user_id")
          .order("horario_acao", { ascending: false })
          .limit(5000),
        supabase.from("profiles").select("id,nome,email,setor_id"),
        supabase.from("setores").select("id,nome"),
      ]);
      if (cancelled) return;
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
          setor_id: p?.setor_id ?? null,
        };
      });
      setRows(merged);
      setLoading(false);
    })();
    return () => { cancelled = true; };
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
      if (setorFiltro !== "all" && r.setor_id !== setorFiltro) return false;
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
      "Horário da Foto (Manaus)": `${formatData(r.horario_foto)} ${formatHora(r.horario_foto)}`,
      "Horário de Envio (Manaus)": `${formatData(r.horario_acao)} ${formatHora(r.horario_acao)}`,
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
          {baseRole === "admin" && profile?.email?.toLowerCase() === "suporte04@baeletrica.com.br" && (
            <Button onClick={dispararTeste} disabled={enviando} variant="default" className="bg-[color:var(--brand-red)] hover:bg-[color:var(--brand-red)]/90 text-white">
              {enviando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Enviar Relatório de Teste
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

      <div className="no-print card-neon p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {([
            ["hoje","Hoje"],["ontem","Ontem"],["ultimos7","Últimos 7 dias"],
            ["semana","Semana atual"],["semana_passada","Semana passada"],["mes","Mês atual"],["custom","Personalizado"],
          ] as [Preset,string][]).map(([k,l]) => (
            <Button key={k} size="sm" variant={preset===k?"default":"outline"}
              className={preset===k ? "bg-primary/15 text-primary border-primary/30 shadow-[0_0_8px_rgba(0,240,255,0.1)]" : "border-border-subtle text-muted-foreground hover:bg-hover-subtle"}
              onClick={() => aplicarPreset(k)}>{l}</Button>
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
              {setores.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="print-area card-neon overflow-hidden">
        <div className="hidden print:flex items-center justify-between gap-4 px-6 py-4 border-b print-header">
          <img src="/logo.png" className="h-12 object-contain" alt="BA Elétrica" />
          <div className="text-right">
            <h2 className="text-xl font-bold">Folha Oficial de Controle de Ronda</h2>
            <p className="text-xs text-muted-foreground">BA Elétrica — Fuso America/Manaus</p>
            <p className="text-xs text-muted-foreground">
              Período: {dataDe} a {dataAte} — {filtrados.length} registro(s) — emitido em {formatData(nowManaus())} {formatHora(nowManaus())}
            </p>
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-neon-cyan" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
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
              <tbody className="divide-y divide-subtle">
                {filtrados.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-hover-subtle align-middle cursor-pointer transition-colors"
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
        <div className="hidden print:block print-footer px-6 py-4">
          <p>Documento gerado automaticamente — BA Elétrica — Sistema de Controle de Ronda</p>
          <p>Fuso horário: America/Manaus (UTC-4) — Emitido em {formatManaus(nowManaus().toISOString())}</p>
          <p className="font-semibold text-foreground mt-2">CONFIDENCIAL — Uso interno da BA Elétrica</p>
        </div>
      </div>

      <DetalheModal row={detalhe} onClose={() => setDetalhe(null)} todos={rows} />
    </div>
  );
}

function DetalheModal({ row, onClose, todos }: { row: Row | null; onClose: () => void; todos: Row[] }) {
  const [ciclo, setCiclo] = useState<Row[]>([]);
  const [signed, setSigned] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [photoErrors, setPhotoErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!row) { setCiclo([]); setSigned(new Map()); setPhotoErrors(new Set()); return; }
    setLoading(true);
    setPhotoErrors(new Set());
    const userRows = todos
      .filter((r) => r.user_id === row.user_id)
      .slice()
      .sort((a, b) => new Date(a.horario_acao).getTime() - new Date(b.horario_acao).getTime());
    const idxClicked = userRows.findIndex((r) => r.id === row.id);
    if (idxClicked < 0) { setCiclo([row]); setLoading(false); return; }

    let inicio = idxClicked;
    for (let i = idxClicked; i >= 0; i--) {
      if (userRows[i].tipo_acao === "check_in") { inicio = i; break; }
      if (i < idxClicked && userRows[i].tipo_acao === "check_out_2") { inicio = i + 1; break; }
    }
    const cicloRows = userRows.slice(inicio, idxClicked + 1);
    setCiclo(cicloRows);

    (async () => {
      const map = new Map<string, string>();
      const errors = new Set<string>();
      await Promise.all(cicloRows.map(async (r) => {
        try {
          const u = await getSignedFotoUrl(r.foto_url, 3600);
          if (u) {
            map.set(r.id, u);
          } else {
            errors.add(r.id);
          }
        } catch {
          errors.add(r.id);
        }
      }));
      setSigned(map);
      setPhotoErrors(errors);
      setLoading(false);
    })();
  }, [row, todos]);

  const handlePhotoError = useCallback((id: string) => {
    setPhotoErrors(prev => new Set(prev).add(id));
  }, []);

  const gerarPdfIsolado = async () => {
    if (!row) return;
    const id = toast.loading("Gerando PDF...");
    try {
      const pdf = await PDFDocument.create();
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const fontB = await pdf.embedFont(StandardFonts.HelveticaBold);
      const pageW = 595;
      const pageH = 842;
      const marginX = 36;

      // Professional color palette
      const brandRed = rgb(0.83, 0.15, 0.12);
      const navyBlue = rgb(0.12, 0.17, 0.33);
      const darkText = rgb(0.07, 0.09, 0.15);
      const grayText = rgb(0.45, 0.48, 0.53);
      const lineColor = rgb(0.83, 0.86, 0.90);
      const borderColor = rgb(0.88, 0.90, 0.93);
      const lightGray = rgb(0.96, 0.97, 0.98);
      const white = rgb(1, 1, 1);
      const softRed = rgb(0.99, 0.93, 0.93);

      let page = pdf.addPage([pageW, pageH]);
      let pageNum = 1;
      let y = pageH - 40;

      const draw = (txt: string, xPos: number, yPos: number, size: number, bold = false, color = darkText) => {
        page.drawText(txt, { x: xPos, y: yPos, size, font: bold ? fontB : font, color });
      };
      const lineH = (x1: number, x2: number, yPos: number, thickness = 0.5, color = lineColor) => {
        page.drawLine({ start: { x: x1, y: yPos }, end: { x: x2, y: yPos }, thickness, color });
      };
      const drawPageFooter = (pg: number) => {
        lineH(marginX, pageW - marginX, 52, 0.4, borderColor);
        draw("BA Elétrica — Sistema de Controle de Ronda", marginX, 40, 6, false, grayText);
        draw(`Página ${pg}`, pageW - marginX - 40, 40, 6, false, grayText);
        draw("CONFIDENCIAL", pageW / 2 - 24, 40, 6, true, brandRed);
      };
      const ensurePage = (needed: number, isNew = false) => {
        if (isNew || y - needed < 80) {
          drawPageFooter(pageNum);
          page = pdf.addPage([pageW, pageH]);
          pageNum++;
          y = pageH - 36;
          page.drawRectangle({ x: 0, y: pageH - 8, width: pageW, height: 8, color: brandRed });
          draw("BA Elétrica — Controle de Ronda", marginX, pageH - 28, 8, true, navyBlue);
          y = pageH - 44;
        }
      };

      // ═══ COVER ═══

      page.drawRectangle({ x: 0, y: pageH - 10, width: pageW, height: 10, color: brandRed });
      y = pageH - 40;

      // Logo
      let logoW = 0;
      try {
        const logoRes = await fetch("/logo.png");
        if (logoRes.ok) {
          const logoBytes = new Uint8Array(await logoRes.arrayBuffer());
          const logoImg = await pdf.embedPng(logoBytes);
          logoW = 55;
          const logoH = (logoImg.height / logoImg.width) * logoW;
          page.drawImage(logoImg, { x: marginX, y: y - logoH + 5, width: logoW, height: logoH });
        }
      } catch (_) {}

      const titleX = marginX + logoW + 16;
      draw("BA ELÉTRICA", titleX, y, 18, true, brandRed);
      y -= 16;
      draw("Sistema de Controle de Ronda", titleX, y, 10, false, navyBlue);
      y -= 14;
      draw("Documento de Auditoria Individual", titleX, y, 9, false, grayText);
      y -= 20;

      lineH(marginX, pageW - marginX, y, 2, brandRed);
      y -= 6;
      lineH(marginX, pageW - marginX, y, 0.5, lineColor);
      y -= 24;

      // Info card
      const cardH = 100;
      const tableW = pageW - marginX * 2;
      page.drawRectangle({
        x: marginX, y: y - cardH, width: tableW, height: cardH,
        borderColor: borderColor, borderWidth: 0.8, color: lightGray,
      });
      page.drawRectangle({ x: marginX, y: y - cardH, width: 4, height: cardH, color: brandRed });

      const cardPad = marginX + 16;
      let cy = y - 16;

      draw("FUNCIONÁRIO", cardPad, cy, 7, true, grayText);
      draw("E-MAIL", cardPad + 200, cy, 7, true, grayText);
      draw("SETOR", cardPad + 400, cy, 7, true, grayText);
      cy -= 14;
      draw(row.nome, cardPad, cy, 11, true, darkText);
      draw((row.email || "—").slice(0, 30), cardPad + 200, cy, 8, false, darkText);
      draw(row.setor ?? "—", cardPad + 400, cy, 9, false, darkText);
      cy -= 22;

      draw("DATA DO CICLO", cardPad, cy, 7, true, grayText);
      draw("HORÁRIO CAPTURA", cardPad + 200, cy, 7, true, grayText);
      draw("TOTAL DE ETAPAS", cardPad + 400, cy, 7, true, grayText);
      cy -= 14;
      draw(formatData(row.horario_acao), cardPad, cy, 10, false, darkText);
      draw(formatManaus(row.horario_acao), cardPad + 200, cy, 9, false, darkText);
      draw(String(ciclo.length), cardPad + 400, cy, 12, true, brandRed);

      y -= cardH + 24;

      // ── Timeline ──
      draw("CRONOLOGIA DO CICLO", marginX, y, 10, true, brandRed);
      y -= 16;

      for (let idx = 0; idx < ciclo.length; idx++) {
        const r = ciclo[idx];

        const accentColor = r.tipo_acao === "check_in" ? rgb(0.16, 0.63, 0.33)
          : r.tipo_acao === "check_out_1" ? rgb(0.20, 0.55, 0.85)
          : rgb(0.85, 0.55, 0.10);

        ensurePage(120, false);

        // Step card
        const stepCardH = 88;
        page.drawRectangle({
          x: marginX + 20, y: y - stepCardH + 8, width: tableW - 20, height: stepCardH,
          borderColor: borderColor, borderWidth: 0.5, color: white,
        });
        page.drawRectangle({ x: marginX + 20, y: y - stepCardH + 8, width: 3, height: stepCardH, color: accentColor });

        // Step number circle
        page.drawCircle({ x: marginX + 14, y: y - 2, size: 10, color: accentColor });
        draw(String(idx + 1), marginX + (idx + 1 > 9 ? 10 : 11.5), y - 5, 9, true, white);

        draw(TIPO_ACAO_LABEL[r.tipo_acao] ?? r.tipo_acao, marginX + 34, y - 4, 10, true, darkText);
        y -= 16;
        draw(`Horário da captura: ${formatManaus(r.horario_acao)}`, marginX + 34, y, 8, false, grayText);
        draw(`Horário de envio: ${formatManaus(r.horario_foto)}`, marginX + 300, y, 8, false, grayText);
        y -= 16;

        // Photo
        const photoUrl = signed.get(r.id);
        if (photoUrl && !photoErrors.has(r.id)) {
          try {
            const imgRes = await fetch(photoUrl);
            if (imgRes.ok) {
              const imgBytes = new Uint8Array(await imgRes.arrayBuffer());
              let img;
              try { img = await pdf.embedJpg(imgBytes); } catch { img = await pdf.embedPng(imgBytes); }
              const maxW = tableW - 50;
              const maxH = 160;
              const scale = Math.min(maxW / img.width, maxH / img.height, 1);
              const drawW = img.width * scale;
              const drawH = img.height * scale;
              page.drawRectangle({
                x: marginX + 32, y: y - drawH - 2, width: drawW + 4, height: drawH + 4,
                borderColor: borderColor, borderWidth: 0.5,
              });
              page.drawImage(img, { x: marginX + 34, y: y - drawH, width: drawW, height: drawH });
              y -= drawH + 14;
            }
          } catch {
            draw("Foto: erro ao carregar", marginX + 34, y, 8, false, grayText);
            y -= 14;
          }
        } else {
          page.drawRectangle({
            x: marginX + 34, y: y - 80, width: 220, height: 80,
            borderColor: borderColor, borderWidth: 0.5, color: lightGray,
          });
          draw("Foto indisponível", marginX + 90, y - 38, 8, false, grayText);
          y -= 92;
        }

        y -= 12;
        if (idx < ciclo.length - 1) {
          // Vertical connector line
          page.drawLine({ start: { x: marginX + 14, y: y + 6 }, end: { x: marginX + 14, y: y - 6 }, thickness: 1.5, color: accentColor });
          y -= 8;
        }
      }

      drawPageFooter(pageNum);

      const pdfBytes = await pdf.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Relatorio_Ronda_${row.nome?.replace(/[\\/:*?"<>|\s]+/g, "_")}_${formatData(row.horario_acao).replace(/\//g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF baixado com sucesso!", { id });
    } catch (e: any) {
      toast.error(`Erro ao gerar PDF: ${e?.message ?? "desconhecido"}`, { id });
    }
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
                {signed.get(r.id) && !photoErrors.has(r.id) ? (
                  <img
                    src={signed.get(r.id)}
                    alt={`Foto ${TIPO_ACAO_LABEL[r.tipo_acao]}`}
                    className="mt-3 w-full max-w-sm rounded-lg border border-border object-cover"
                    onError={() => handlePhotoError(r.id)}
                    loading="lazy"
                  />
                ) : (
                  <div className="mt-3 w-full max-w-sm aspect-[4/3] rounded-lg border border-border bg-muted flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <ImageOff className="w-8 h-8 mx-auto mb-1 opacity-50" />
                      <span className="text-xs">Foto indisponível</span>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border mt-4 no-print">
          <p className="text-xs text-muted-foreground">Gerado em {formatManaus(nowManaus().toISOString())} · Fuso America/Manaus</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Fechar</Button>
            <Button onClick={gerarPdfIsolado}>
              <Download className="w-4 h-4 mr-2" /> Baixar PDF
            </Button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
