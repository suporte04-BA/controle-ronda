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
const DASHBOARD_URL = "https://controle-ronda.suporte04.workers.dev";

const TIPO_LABEL: Record<string, string> = {
  check_in: "Início de Ronda",
  check_out_1: "Meio de Ronda",
  check_out_2: "Fim de Ronda",
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

async function fetchPhotoAsBase64(fotoUrl: string, supabaseUrl: string, serviceKey: string): Promise<string | null> {
  try {
    if (!fotoUrl) return null;
    const marker = "/fotos_ponto/";
    const idx = fotoUrl.indexOf(marker);
    const path = idx >= 0 ? fotoUrl.substring(idx + marker.length) : fotoUrl;
    if (!path) return null;

    const signUrl = `${supabaseUrl}/storage/v1/object/sign/fotos_ponto`;
    const signedRes = await fetch(signUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        "apikey": serviceKey,
      },
      body: JSON.stringify({ path, expiresIn: 3600 }),
      signal: AbortSignal.timeout(10000),
    });
    if (!signedRes.ok) {
      console.error("[photo] monthly sign failed:", signedRes.status);
      return null;
    }
    const signedData = await signedRes.json();
    const signedUrl = signedData.signedUrl;
    if (!signedUrl) return null;

    const fullUrl = signedUrl.startsWith("http") ? signedUrl : `${supabaseUrl}${signedUrl}`;
    const imgRes = await fetch(fullUrl, { signal: AbortSignal.timeout(15000) });
    if (!imgRes.ok) {
      console.error("[photo] monthly download failed:", imgRes.status);
      return null;
    }
    const imgBytes = new Uint8Array(await imgRes.arrayBuffer());
    return toBase64(imgBytes);
  } catch (e) {
    console.error("[photo] monthly exception:", e);
    return null;
  }
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
  const marginX = 36;
  const tableW = pageW - marginX * 2;
  const colWidths = [100, 65, 105, 65, 85, 103];
  const headers = ["COLABORADOR", "SETOR", "TIPO DE RONDA", "DATA", "HOR. FOTO", "HOR. ENVIO"];
  const rowH = 20;
  const headerH = 22;

  // Professional color palette
  const brandRed = rgb(0.83, 0.15, 0.12);
  const darkRed = rgb(0.65, 0.10, 0.09);
  const navyBlue = rgb(0.12, 0.17, 0.33);
  const darkText = rgb(0.07, 0.09, 0.15);
  const grayText = rgb(0.45, 0.48, 0.53);
  const lightGray = rgb(0.96, 0.97, 0.98);
  const lineColor = rgb(0.83, 0.86, 0.90);
  const borderColor = rgb(0.88, 0.90, 0.93);
  const white = rgb(1, 1, 1);

  let page = pdf.addPage([pageW, pageH]);
  let pageNum = 1;
  let y = pageH - 36;

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
    if (isNew || y - needed < 70) {
      drawPageFooter(pageNum);
      page = pdf.addPage([pageW, pageH]);
      pageNum++;
      y = pageH - 36;
      page.drawRectangle({ x: 0, y: pageH - 8, width: pageW, height: 8, color: brandRed });
      draw("BA Elétrica — Controle de Ronda", marginX, pageH - 28, 8, true, navyBlue);
      draw(`Período: ${periodo}`, pageW / 2 + 20, pageH - 28, 7, false, grayText);
      y = pageH - 44;
    }
  };

  // ═══ PAGE 1: COVER ═══

  page.drawRectangle({ x: 0, y: pageH - 10, width: pageW, height: 10, color: brandRed });
  y = pageH - 40;

  // Logo
  let logoW = 0;
  try {
    const logoRes = await fetch("https://controle-ronda.suporte04.workers.dev/logo.png");
    if (logoRes.ok) {
      const logoBytes = new Uint8Array(await logoRes.arrayBuffer());
      const logoImg = await pdf.embedPng(logoBytes);
      logoW = 55;
      const logoH = (logoImg.height / logoImg.width) * logoW;
      page.drawImage(logoImg, { x: marginX, y: y - logoH + 5, width: logoW, height: logoH });
    }
  } catch (_) { /* logo opcional */ }

  const titleX = marginX + logoW + 16;
  draw("BA ELÉTRICA", titleX, y, 18, true, brandRed);
  y -= 16;
  draw("Sistema de Controle de Ronda", titleX, y, 10, false, navyBlue);
  y -= 14;
  draw("Relatório Mensal Consolidado", titleX, y, 9, false, grayText);
  y -= 20;

  lineH(marginX, pageW - marginX, y, 2, brandRed);
  y -= 6;
  lineH(marginX, pageW - marginX, y, 0.5, lineColor);
  y -= 24;

  // Info card
  const cardH = 80;
  page.drawRectangle({
    x: marginX, y: y - cardH, width: tableW, height: cardH,
    borderColor: borderColor, borderWidth: 0.8, color: lightGray,
  });
  page.drawRectangle({ x: marginX, y: y - cardH, width: 4, height: cardH, color: brandRed });

  const cardPad = marginX + 16;
  let cy = y - 16;
  draw("PERÍODO DO RELATÓRIO", cardPad, cy, 7, true, grayText);
  cy -= 12;
  draw(periodo, cardPad, cy, 10, true, darkText);
  cy -= 18;
  draw("MÊS DE REFERÊNCIA", cardPad + 260, cy + 18, 7, true, grayText);
  draw(monthName, cardPad + 260, cy + 6, 10, true, brandRed);
  draw("TOTAL DE REGISTROS", cardPad + 420, cy + 18, 7, true, grayText);
  draw(String(stats.total), cardPad + 420, cy + 6, 12, true, brandRed);

  y -= cardH + 24;

  // ── Stats dashboard ──
  draw("PAINEL ESTATÍSTICO", marginX, y, 10, true, brandRed);
  y -= 16;

  const statCards = [
    { label: "TOTAL", value: String(stats.total), color: brandRed },
    { label: "INÍCIOS", value: String(stats.checkIns), color: rgb(0.16, 0.63, 0.33) },
    { label: "MEIOS", value: String(stats.checkOuts1), color: rgb(0.20, 0.55, 0.85) },
    { label: "FIMES", value: String(stats.checkOuts2), color: rgb(0.85, 0.55, 0.10) },
    { label: "COLABORADORES", value: String(stats.uniqueUsers), color: navyBlue },
    { label: "SETORES", value: String(stats.uniqueSetores), color: darkRed },
    { label: "CICLOS", value: String(stats.ciclos), color: rgb(0.45, 0.20, 0.65) },
  ];
  const statCardW = (tableW - 18) / 7;
  statCards.forEach((s, i) => {
    const sx = marginX + i * (statCardW + 3);
    page.drawRectangle({
      x: sx, y: y - 48, width: statCardW, height: 48,
      borderColor: borderColor, borderWidth: 0.5, color: white,
    });
    page.drawRectangle({ x: sx, y: y, width: statCardW, height: 3, color: s.color });
    const valLen = s.value.length;
    draw(s.value, sx + statCardW / 2 - (valLen * 4), y - 22, 14, true, s.color);
    draw(s.label, sx + 3, y - 40, 5, true, grayText);
  });
  y -= 64;

  // ── Table header ──
  const tableX = marginX;
  page.drawRectangle({ x: tableX, y: y - 2, width: tableW, height: headerH, color: navyBlue });
  let x = tableX;
  for (let i = 0; i < headers.length; i++) {
    draw(headers[i], x + 4, y, 6.5, true, white);
    x += colWidths[i];
  }
  y -= headerH + 2;
  lineH(tableX, tableX + tableW, y, 0.5, navyBlue);
  y -= 2;

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
      String(r.nome ?? "—").slice(0, 20),
      String(r.setor ?? "—").slice(0, 13),
      tipoLabel,
      data,
      horaFoto,
      horaEnvio,
    ];

    if (rowIdx % 2 === 0) {
      page.drawRectangle({ x: tableX, y: y - 4, width: tableW, height: rowH, color: lightGray });
    }

    const accentColor = r.tipo_acao === "check_in" ? rgb(0.16, 0.63, 0.33)
      : r.tipo_acao === "check_out_1" ? rgb(0.20, 0.55, 0.85)
      : rgb(0.85, 0.55, 0.10);
    page.drawRectangle({ x: tableX, y: y - 4, width: 2, height: rowH, color: accentColor });

    x = tableX;
    for (let i = 0; i < cells.length; i++) {
      draw(cells[i], x + 6, y, 7.5, false, darkText);
      x += colWidths[i];
    }
    y -= rowH;
    lineH(tableX, tableX + tableW, y, 0.3, borderColor);
    y -= 4;
    rowIdx++;
  }

  drawPageFooter(pageNum);

  // ═══ PHOTO EVIDENCE SECTION ═══
  if (rows.some((r: any) => r._photoBase64)) {
    page = pdf.addPage([pageW, pageH]);
    pageNum++;
    page.drawRectangle({ x: 0, y: pageH - 10, width: pageW, height: 10, color: brandRed });
    y = pageH - 36;

    draw("EVIDÊNCIA FOTOGRÁFICA — MENSAL", marginX, y, 14, true, brandRed);
    y -= 14;
    draw(`Período: ${periodo} — ${rows.length} registro(s)`, marginX, y, 8, false, grayText);
    y -= 8;
    lineH(marginX, pageW - marginX, y, 1.5, brandRed);
    y -= 16;

    const thumbW = 90;
    const thumbH = 68;
    let evidenceCount = 0;

    for (const r of rows) {
      if (!r._photoBase64) continue;
      ensurePage(thumbH + 50, false);

      const photoB64 = r._photoBase64;
      const photoLabel = TIPO_LABEL[r.tipo_acao] ?? r.tipo_acao;
      const photoTime = fmtManaus(r.horario_foto);

      const cardHeight = thumbH + 24;
      page.drawRectangle({
        x: marginX, y: y - cardHeight + 8, width: tableW, height: cardHeight,
        borderColor: borderColor, borderWidth: 0.5, color: white,
      });
      const accentColor = r.tipo_acao === "check_in" ? rgb(0.16, 0.63, 0.33)
        : r.tipo_acao === "check_out_1" ? rgb(0.20, 0.55, 0.85)
        : rgb(0.85, 0.55, 0.10);
      page.drawRectangle({ x: marginX, y: y - cardHeight + 8, width: 3, height: cardHeight, color: accentColor });

      const badgeNum = String(evidenceCount + 1);
      page.drawCircle({ x: marginX + 18, y: y - 2, size: 9, color: accentColor });
      draw(badgeNum, marginX + (badgeNum.length === 1 ? 15.5 : 12), y - 5, 8, true, white);

      try {
        const imgBytes = Uint8Array.from(atob(photoB64), c => c.charCodeAt(0));
        let img;
        const isJpeg = imgBytes[0] === 0xFF && imgBytes[1] === 0xD8;
        const isPng = imgBytes[0] === 0x89 && imgBytes[1] === 0x50 && imgBytes[2] === 0x4E && imgBytes[3] === 0x47;
        if (isJpeg) {
          img = await pdf.embedJpg(imgBytes);
        } else if (isPng) {
          img = await pdf.embedPng(imgBytes);
        } else {
          try { img = await pdf.embedJpg(imgBytes); } catch { img = await pdf.embedPng(imgBytes); }
        }
        const scale = Math.min(thumbW / img.width, thumbH / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const offsetX = marginX + 34 + (thumbW - drawW) / 2;
        const offsetY = y - thumbH + (thumbH - drawH) / 2;
        page.drawRectangle({
          x: marginX + 32, y: y - thumbH - 2, width: thumbW + 4, height: thumbH + 4,
          borderColor: borderColor, borderWidth: 0.5,
        });
        page.drawImage(img, { x: offsetX, y: offsetY, width: drawW, height: drawH });
      } catch {
        page.drawRectangle({
          x: marginX + 32, y: y - thumbH - 2, width: thumbW + 4, height: thumbH + 4,
          borderColor: borderColor, borderWidth: 0.5, color: lightGray,
        });
        draw("Foto indisponível", marginX + 55, y - thumbH / 2, 7, false, grayText);
      }

      const labelX = marginX + thumbW + 50;
      draw(photoLabel, labelX, y - 4, 9, true, darkText);
      draw(`Data: ${photoTime}`, labelX, y - 16, 7, false, grayText);
      draw(`Colaborador: ${r.nome ?? "—"}`, labelX, y - 26, 7, false, grayText);
      draw(`Setor: ${r.setor ?? "—"}`, labelX, y - 36, 7, false, grayText);

      y -= cardHeight + 10;
      evidenceCount++;

      if (evidenceCount < rows.length) {
        lineH(marginX, pageW - marginX, y, 0.3, borderColor);
        y -= 8;
      }
    }

    drawPageFooter(pageNum);
  }

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

  // Buscar setor GESTOR
  const { data: sets } = await admin.from("setores").select("id,nome");
  const gestorSetores = (sets ?? []).filter((s: any) => s.nome?.toUpperCase().includes("GESTOR"));
  const gestorIds = new Set(gestorSetores.map((s: any) => s.id));

  const { data: allProfiles } = await admin.from("profiles").select("id,nome,email,setor_id");

  if (allProfiles?.length) {
    for (const p of allProfiles) {
      const email = normalizeEmail(p.email);
      if (!email || !isCorporateEmail(email) || seen.has(email)) continue;
      if (!p.setor_id || !gestorIds.has(p.setor_id)) continue;
      seen.add(email);
      recipients.push(email);
    }
  }

  const suporte = normalizeEmail("suporte04@baeletrica.com.br");
  if (suporte && !seen.has(suporte)) {
    seen.add(suporte);
    recipients.push(suporte);
  }

  return recipients;
}

async function sendResend(to: string[], subject: string, html: string, attachments: { filename: string; content: string }[]) {
  const resendKey = Deno.env.get("RESEND_API_KEY") || "";
  if (!resendKey) throw new Error("RESEND_API_KEY não configurada.");

  const payload = { from: SENDER, to, reply_to: REPLY_TO, subject, html, attachments };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
    body: JSON.stringify(payload),
  });
  const text = await res.text();

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

    const { fromUtc, toUtc, monthName, startDate, endDate } = getLastMonthRange();
    const periodo = `${startDate} a ${endDate} (America/Manaus)`;

    const rows = await fetchRows(admin, fromUtc.toISOString(), toUtc.toISOString());

    const photoResults = await Promise.allSettled(
      rows.map(async (r: any) => {
        const b64 = await fetchPhotoAsBase64(r.foto_url, SUPABASE_URL, SERVICE_KEY);
        return { id: r.id, photoBase64: b64 };
      })
    );
    const photoMap = new Map<string, string | null>();
    for (const pr of photoResults) {
      if (pr.status === "fulfilled") {
        photoMap.set(pr.value.id, pr.value.photoBase64);
      }
    }
    for (const r of rows) {
      r._photoBase64 = photoMap.get(r.id) ?? null;
    }

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

    return new Response(JSON.stringify({ ok: true, monthName, periodo, count: rows.length, stats, recipients, id: (result as any)?.id ?? null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });

  } catch (e: any) {
    console.error("ERROR MONTHLY:", e?.message);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});
