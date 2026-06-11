// Supabase Edge Function: send-monthly-report
// Executa no dia 1 de cada mês via pg_cron
// Gera relatório consolidado do mês anterior

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SENDER = "BA Elétrica <relatorio@baeletrica.com.br>";
const REPLY_TO = "suporte04@baeletrica.com.br";
const MANAUS_OFFSET_MS = -4 * 60 * 60 * 1000;
const CORPORATE_DOMAINS = ["baeletrica.com", "baeletrica.com.br"];
// ATUALIZAR com o domínio do Cloudflare Pages após o primeiro deploy
const DASHBOARD_URL = "https://controle-ronda.pages.dev";

const TIPO_LABEL: Record<string, string> = {
  check_in: "Check-in da Ronda",
  check_out_1: "Check-out 1 da Ronda",
  check_out_2: "Check-out 2 da Ronda",
};

function toManaus(d: Date) { return new Date(d.getTime() + MANAUS_OFFSET_MS); }
function pad(n: number) { return String(n).padStart(2, "0"); }
function fmtManaus(iso: string, withSec = true) {
  const d = toManaus(new Date(iso));
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}${withSec ? ":" + pad(d.getUTCSeconds()) : ""}`;
}

function normalizeEmail(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return null;
  return normalized;
}

function isCorporateEmail(email: string) {
  const domain = email.split("@")[1] ?? "";
  return CORPORATE_DOMAINS.includes(domain);
}

function getLastMonthRange() {
  const now = new Date();
  const m = toManaus(now);
  const currentYear = m.getUTCFullYear();
  const currentMonth = m.getUTCMonth();
  
  // Mês anterior
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  
  const startDate = new Date(Date.UTC(lastYear, lastMonth, 1, 0, 0, 0));
  const endDate = new Date(Date.UTC(lastYear, lastMonth + 1, 0, 23, 59, 59));
  
  const toUtc = (d: Date) => new Date(d.getTime() - MANAUS_OFFSET_MS);
  
  return {
    fromUtc: toUtc(startDate),
    toUtc: toUtc(endDate),
    monthName: startDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

function toBase64(u8: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < u8.length; i += chunk) {
    bin += String.fromCharCode(...u8.subarray(i, i + chunk));
  }
  return btoa(bin);
}

async function buildXlsx(rows: any[], monthName: string): Promise<Uint8Array> {
  const data = rows.map((r) => ({
    "Colaborador": r.nome,
    "Email": r.email ?? "—",
    "Setor": r.setor ?? "—",
    "Tipo de Ronda": TIPO_LABEL[r.tipo_acao] ?? r.tipo_acao,
    "Horário da Foto (Manaus)": fmtManaus(r.horario_foto),
    "Horário de Envio (Manaus)": fmtManaus(r.horario_acao),
    "Caminho do Arquivo": r.foto_url || "—",
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [{ wch: 28 }, { wch: 28 }, { wch: 22 }, { wch: 22 }, { wch: 26 }, { wch: 26 }, { wch: 60 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rondas");
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new Uint8Array(out as ArrayBuffer);
}

async function buildPdf(rows: any[], periodo: string, monthName: string, stats: any): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontB = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageW = 595;
  const pageH = 842;
  const marginX = 40;
  const tableW = pageW - marginX * 2;
  const colWidths = [100, 65, 115, 65, 90, 100];
  const headers = ["COLABORADOR", "SETOR", "TIPO DE RONDA", "DATA", "HORÁRIO DA FOTO", "HORÁRIO DO ENVIO"];
  const rowH = 20;
  const headerH = 22;
  const brandRed = rgb(0.85, 0.15, 0.15);
  const darkText = rgb(0.04, 0.07, 0.14);
  const grayText = rgb(0.5, 0.5, 0.5);
  const lightGray = rgb(0.94, 0.94, 0.94);
  const lineColor = rgb(0.82, 0.82, 0.82);

  let page = pdf.addPage([pageW, pageH]);
  let y = pageH - 36;

  const draw = (txt: string, xPos: number, yPos: number, size: number, bold = false, color = darkText) => {
    page.drawText(txt, { x: xPos, y: yPos, size, font: bold ? fontB : font, color });
  };
  const line = (x1: number, x2: number, yPos: number, thickness = 0.5, color = lineColor) => {
    page.drawLine({ start: { x: x1, y: yPos }, end: { x: x2, y: yPos }, thickness, color });
  };
  const ensurePage = (needed: number) => {
    if (y - needed < 60) {
      page = pdf.addPage([pageW, pageH]);
      y = pageH - 36;
    }
  };

  // ── Header: Logo top-left, company name top-right ──
  try {
    const logoRes = await fetch("https://controle-ronda.vercel.app/logo.png");
    if (logoRes.ok) {
      const logoBytes = new Uint8Array(await logoRes.arrayBuffer());
      const logoImg = await pdf.embedPng(logoBytes);
      const logoW = 45;
      const logoH = (logoImg.height / logoImg.width) * logoW;
      page.drawImage(logoImg, { x: marginX, y: y - logoH + 4, width: logoW, height: logoH });
    }
  } catch (_) { /* logo opcional */ }

  draw("BA Elétrica", pageW - marginX - 60, y, 12, true, brandRed);
  draw("Controle de Ronda", pageW - marginX - 70, y - 14, 9, false, grayText);
  y -= 18;
  line(marginX, pageW - marginX, y, 1.5, brandRed);
  y -= 20;

  // ── Titulo ──
  draw("Relatório Mensal — Controle de Ronda", marginX, y, 14, true, darkText);
  y -= 14;
  draw(`BA Elétrica — ${monthName}`, marginX, y, 10, false, grayText);
  y -= 12;
  draw(`Período: ${periodo} — ${rows.length} registro(s) — emitido em ${fmtManaus(new Date().toISOString(), false)}`, marginX, y, 8, false, grayText);
  y -= 10;
  line(marginX, pageW - marginX, y, 1.5, brandRed);
  y -= 20;

  // ── Resumo Estatístico ──
  draw("RESUMO DO MÊS", marginX, y, 10, true, brandRed);
  y -= 14;
  
  const statsData = [
    `Total de registros: ${stats.total}`,
    `Check-ins: ${stats.checkIns}`,
    `Check-outs 1: ${stats.checkOuts1}`,
    `Check-outs 2: ${stats.checkOuts2}`,
    `Colaboradores únicos: ${stats.uniqueUsers}`,
    `Setores ativos: ${stats.uniqueSetores}`,
    `Ciclos completos: ${stats.ciclos}`,
  ];
  
  for (const stat of statsData) {
    draw(stat, marginX + 10, y, 8, false, darkText);
    y -= 12;
  }
  y -= 8;
  line(marginX, pageW - marginX, y, 0.5, lineColor);
  y -= 16;

  // ── Table header ──
  const tableX = marginX;
  page.drawRectangle({
    x: tableX,
    y: y - 4,
    width: tableW,
    height: headerH,
    color: brandRed,
  });
  let x = tableX;
  for (let i = 0; i < headers.length; i++) {
    draw(headers[i], x + 4, y, 7, true, rgb(1, 1, 1));
    x += colWidths[i];
  }
  y -= headerH;
  line(tableX, tableX + tableW, y, 0.5, brandRed);
  y -= 4;

  // ── Table rows ──
  let rowIdx = 0;
  for (const r of rows) {
    ensurePage(rowH + 10);

    const tipoLabel = TIPO_LABEL[r.tipo_acao] ?? r.tipo_acao;
    const dataCompleta = fmtManaus(r.horario_acao);
    const data = dataCompleta.split(" ")[0] ?? "";
    const horaEnvio = dataCompleta.split(" ")[1] ?? "";
    const fotoCompleto = fmtManaus(r.horario_foto);
    const horaFoto = fotoCompleto.split(" ")[1] ?? "";

    const cells = [
      String(r.nome ?? "—").slice(0, 18),
      String(r.setor ?? "—").slice(0, 12),
      tipoLabel,
      data,
      horaFoto,
      horaEnvio,
    ];

    // Alternating row background
    if (rowIdx % 2 === 0) {
      page.drawRectangle({
        x: tableX,
        y: y - 4,
        width: tableW,
        height: rowH,
        color: lightGray,
      });
    }

    x = tableX;
    for (let i = 0; i < cells.length; i++) {
      draw(cells[i], x + 4, y, 8, false, darkText);
      x += colWidths[i];
    }
    y -= rowH;
    line(tableX, tableX + tableW, y, 0.3, lineColor);
    y -= 4;
    rowIdx++;
  }

  // ── Footer ──
  y -= 8;
  line(marginX, pageW - marginX, y, 0.5, brandRed);
  y -= 12;
  draw("Documento gerado automaticamente — BA Elétrica — Sistema de Controle de Ronda", marginX, y, 7, false, grayText);
  y -= 10;
  draw(`Fuso horário: America/Manaus (UTC-4) — Emitido em ${fmtManaus(new Date().toISOString())}`, marginX, y, 7, false, grayText);
  y -= 10;
  draw("CONFIDENCIAL — Uso interno da BA Elétrica", marginX, y, 7, true, brandRed);

  return pdf.save();
}

function buildEmailHtml(periodo: string, monthName: string, stats: any): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background-color:#f1f5f9">
<tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;max-width:600px;background-color:#FFFFFF;border-radius:8px;overflow:hidden">
  <tr><td style="background-color:#DC2626;padding:24px 32px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
    <tr>
      <td style="font-size:22px;font-weight:bold;color:#FFFFFF;line-height:28px;font-family:Arial,Helvetica,sans-serif">BA Elétrica</td>
      <td align="right" style="font-size:12px;color:#FCA5A5;font-family:Arial,Helvetica,sans-serif">Controle de Ronda</td>
    </tr>
    </table>
  </td></tr>
  <tr><td style="padding:32px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
      <tr><td style="font-size:16px;font-weight:bold;color:#0B1120;line-height:24px;padding:0 0 16px 0;font-family:Arial,Helvetica,sans-serif">Olá, Gestor.</td></tr>
      <tr><td style="font-size:14px;line-height:22px;color:#475569;padding:0 0 16px 0;font-family:Arial,Helvetica,sans-serif">O <strong>relatório mensal consolidado</strong> do <strong>Controle de Ronda da BA Elétrica</strong> referente a <strong>${monthName}</strong> foi processado com sucesso.</td></tr>
      <tr><td style="font-size:14px;line-height:22px;color:#475569;padding:0 0 20px 0;font-family:Arial,Helvetica,sans-serif">Em anexo a este e-mail, você encontrará o <strong>PDF gerencial</strong> com o resumo estatístico e a <strong>planilha Excel</strong> com a auditoria detalhada de todos os registros do mês.</td></tr>
      <tr><td style="padding:0 0 24px 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background-color:#F8FAFC;border-radius:6px;border:1px solid #E2E8F0">
        <tr><td style="padding:16px 20px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
          <tr>
            <td style="font-size:12px;color:#64748B;padding:0 0 4px 0;font-family:Arial,Helvetica,sans-serif">Mês</td>
            <td style="font-size:12px;color:#64748B;padding:0 0 4px 0;font-family:Arial,Helvetica,sans-serif" align="center">Registros</td>
            <td style="font-size:12px;color:#64748B;padding:0 0 4px 0;font-family:Arial,Helvetica,sans-serif" align="center">Colaboradores</td>
            <td style="font-size:12px;color:#64748B;padding:0 0 4px 0;font-family:Arial,Helvetica,sans-serif" align="center">Ciclos</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#0B1120;font-weight:bold;padding:0;font-family:Arial,Helvetica,sans-serif">${monthName}</td>
            <td style="font-size:13px;color:#0B1120;font-weight:bold;padding:0;text-align:center;font-family:Arial,Helvetica,sans-serif">${stats.total}</td>
            <td style="font-size:13px;color:#0B1120;font-weight:bold;padding:0;text-align:center;font-family:Arial,Helvetica,sans-serif">${stats.uniqueUsers}</td>
            <td style="font-size:13px;color:#0B1120;font-weight:bold;padding:0;text-align:center;font-family:Arial,Helvetica,sans-serif">${stats.ciclos}</td>
          </tr>
          </table>
        </td></tr>
        </table>
      </td></tr>
      <tr><td align="center" style="padding:0 0 24px 0">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
        <tr><td style="background-color:#DC2626;border-radius:6px">
          <a href="${DASHBOARD_URL}" target="_blank" style="display:inline-block;padding:12px 32px;font-size:14px;font-weight:bold;color:#FFFFFF;text-decoration:none;font-family:Arial,Helvetica,sans-serif">Acessar Dashboard</a>
        </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:0 0 8px 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background-color:#F8FAFC;border-radius:6px;border:1px solid #E2E8F0">
        <tr><td style="padding:12px 16px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
          <tr><td style="font-size:13px;color:#0B1120;font-weight:bold;font-family:Arial,Helvetica,sans-serif">Anexos do E-mail</td></tr>
          <tr><td style="font-size:12px;color:#64748B;padding:6px 0 0 0;font-family:Arial,Helvetica,sans-serif">
            Relatorio_Mensal_Ronda_BA_Eletrica.pdf — Resumo mensal com estatísticas<br>
            Auditoria_Mensal_Dados_Brutos.xlsx — Dados detalhados de todos os registros
          </td></tr>
          </table>
        </td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="background-color:#F1F5F9;padding:16px 32px;border-top:1px solid #E2E8F0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
    <tr><td style="font-size:11px;color:#94A3B8;line-height:16px;font-family:Arial,Helvetica,sans-serif">
      E-mail automático — Sistema de Controle de Ronda — BA Elétrica<br>Fuso horário: America/Manaus (UTC-4)
    </td></tr>
    </table>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

async function fetchRows(admin: any, fromIso: string, toIso: string) {
  const [{ data: regs }, { data: profs }, { data: sets }] = await Promise.all([
    admin.from("registros_ponto")
      .select("id,user_id,tipo_acao,horario_acao,horario_foto,foto_url")
      .gte("horario_acao", fromIso).lte("horario_acao", toIso)
      .order("horario_acao", { ascending: true }),
    admin.from("profiles").select("id,nome,email,setor_id"),
    admin.from("setores").select("id,nome"),
  ]);
  const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
  const setMap = new Map((sets ?? []).map((s: any) => [s.id, s.nome]));
  return (regs ?? []).map((r: any) => {
    const p: any = profMap.get(r.user_id);
    return { ...r, nome: p?.nome ?? "—", email: p?.email ?? "", setor: p?.setor_id ? setMap.get(p.setor_id) ?? null : null };
  });
}

function calculateStats(rows: any[]) {
  const checkIns = rows.filter(r => r.tipo_acao === "check_in").length;
  const checkOuts1 = rows.filter(r => r.tipo_acao === "check_out_1").length;
  const checkOuts2 = rows.filter(r => r.tipo_acao === "check_out_2").length;
  const uniqueUsers = new Set(rows.map(r => r.user_id)).size;
  const uniqueSetores = new Set(rows.filter(r => r.setor).map(r => r.setor)).size;
  const ciclos = Math.min(checkIns, checkOuts1, checkOuts2);
  
  return {
    total: rows.length,
    checkIns,
    checkOuts1,
    checkOuts2,
    uniqueUsers,
    uniqueSetores,
    ciclos,
  };
}

async function fetchRecipientEmails(admin: any): Promise<string[]> {
  const seen = new Set<string>();
  const recipients: string[] = [];

  const { data: allProfiles } = await admin.from("profiles").select("id,nome,email,setor_id");
  console.log("Total profiles:", allProfiles?.length ?? 0);

  if (allProfiles?.length) {
    const { data: sets } = await admin.from("setores").select("id,nome");
    const setMap = new Map((sets ?? []).map((s: any) => [s.id, s.nome]));

    for (const p of allProfiles) {
      const email = normalizeEmail(p.email);
      if (!email || !isCorporateEmail(email) || seen.has(email)) continue;
      seen.add(email);
      const setorNome = p.setor_id ? setMap.get(p.setor_id) ?? "—" : "—";
      console.log(`Destinatário: ${p.nome} (${email}) - Setor: ${setorNome}`);
      recipients.push(email);
    }
  }

  const suporte = normalizeEmail("suporte04@baeletrica.com.br");
  if (suporte && !seen.has(suporte)) {
    seen.add(suporte);
    recipients.push(suporte);
    console.log("Fallback: suporte04@baeletrica.com.br");
  }

  console.log("Total destinatários:", recipients.length);
  return recipients;
}

async function sendResend(to: string[], subject: string, html: string, attachments: { filename: string; content: string }[]) {
  const resendKey = Deno.env.get("RESEND_API_KEY") || "";
  if (!resendKey) throw new Error("RESEND_API_KEY não configurada.");

  const payload = { from: SENDER, to, reply_to: REPLY_TO, subject, html, attachments };
  console.log("Resend ->", JSON.stringify({ from: SENDER, to, subject }));

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  console.log("Resend response:", res.status, text);

  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text).message ?? text; } catch {}
    throw new Error(`Resend ${res.status}: ${msg}`);
  }
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    console.log("=== START MONTHLY REPORT ===", { url: SUPABASE_URL });

    const { fromUtc, toUtc, monthName, startDate, endDate } = getLastMonthRange();
    const periodo = `${startDate} a ${endDate} (America/Manaus)`;

    const rows = await fetchRows(admin, fromUtc.toISOString(), toUtc.toISOString());
    console.log("Rows:", rows.length);

    const recipients = await fetchRecipientEmails(admin);
    if (!recipients.length) {
      return new Response(JSON.stringify({ ok: false, message: "Nenhum destinatário.", recipients: [], count: rows.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    const stats = calculateStats(rows);
    const [xlsxBytes, pdfBytes] = await Promise.all([buildXlsx(rows, monthName), buildPdf(rows, periodo, monthName, stats)]);
    const html = buildEmailHtml(periodo, monthName, stats);

    const result = await sendResend(recipients, `BA Elétrica — Relatório Mensal (${monthName})`, html, [
      { filename: "Relatorio_Mensal_Ronda_BA_Eletrica.pdf", content: toBase64(pdfBytes) },
      { filename: "Auditoria_Mensal_Dados_Brutos.xlsx", content: toBase64(xlsxBytes) },
    ]);

    console.log("=== OK MONTHLY ===", (result as any)?.id);
    return new Response(JSON.stringify({ ok: true, monthName, periodo, count: rows.length, stats, recipients, id: (result as any)?.id ?? null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });

  } catch (e: any) {
    console.error("ERROR MONTHLY:", e?.message);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});
