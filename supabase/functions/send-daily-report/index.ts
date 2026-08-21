// Supabase Edge Function: send-daily-report
// Deployed on: rdmbayprbfqbjhfqcasp
// Body: { modo: "teste" | "diario" }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import { PDFDocument, StandardFonts, rgb, degrees } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://controle-ronda.suporte04.workers.dev",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SENDER = "BA Elétrica <relatorio@baeletrica.com.br>";
const REPLY_TO = "suporte04@baeletrica.com.br";
const MANAUS_OFFSET_MS = -4 * 60 * 60 * 1000;
const CORPORATE_DOMAINS = ["baeletrica.com", "baeletrica.com.br"];
const DASHBOARD_URL = "https://controle-ronda.suporte04.workers.dev";
const RESEND_API_KEY_FALLBACK = Deno.env.get("RESEND_API_KEY") || "";
const MAX_PHOTOS = 40;
const GAS_FALLBACK_URL = "https://script.google.com/macros/s/AKfycbyGy8uvHrF3cpCSbjTiATIPSq9SHFULwtOMYM2c6Lch6-SiYww0ZLrsmjK069LSnN4A/exec";

const TIPO_LABEL: Record<string, string> = {
  check_in: "Início de Ronda",
  meio1: "meio1 de Ronda",
  meio2: "meio2 de Ronda",
  meio3: "meio3 de Ronda",
  meio4: "meio4 de Ronda",
  meio5: "meio5 de Ronda",
  meio6: "meio6 de Ronda",
  meio7: "meio7 de Ronda",
  meio8: "meio8 de Ronda",
  check_out_2: "Fim de Ronda",
};

const CICLO_ORDEM: string[] = [
  "check_in", "meio1", "meio2", "meio3", "meio4", "meio5", "meio6", "meio7", "meio8", "check_out_2",
];

function toManaus(d: Date) {
  return new Date(d.getTime() + MANAUS_OFFSET_MS);
}
function pad(n: number) {
  return String(n).padStart(2, "0");
}
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

function sanitizeWinAnsi(text: string): string {
  return text
    .replace(/–/g, "-").replace(/—/g, "-")
    .replace(/\u00A0/g, " ")
    .replace(/[""]/g, '"').replace(/['']/g, "'")
    .replace(/[^\x20-\x7E\xC0-\xFF]/g, "");
}

function isCorporateEmail(email: string) {
  const domain = email.split("@")[1] ?? "";
  return CORPORATE_DOMAINS.includes(domain);
}

function rangeFor(modo: "teste" | "diario", periodo?: string) {
  const now = new Date();
  const m = toManaus(now);
  const startTodayManaus = new Date(
    Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), m.getUTCDate(), 0, 0, 0),
  );
  const startYdayManaus = new Date(startTodayManaus.getTime() - 86400000);
  let startManaus: Date;
  let endManaus: Date;

  // Suporta período customizado: "YYYY-MM-DD/YYYY-MM-DD"
  if (periodo && periodo.includes("/")) {
    const [startStr, endStr] = periodo.split("/");
    const [sy, sm, sd] = startStr.split("-").map(Number);
    const [ey, em, ed] = endStr.split("-").map(Number);
    startManaus = new Date(Date.UTC(sy, sm - 1, sd, 0, 0, 0));
    endManaus = new Date(Date.UTC(ey, em - 1, ed, 23, 59, 59));
  } else if (periodo === "hoje_ontem") {
    startManaus = startYdayManaus;
    endManaus = new Date(startTodayManaus.getTime() + 86400000 - 1);
  } else {
    startManaus = new Date(startYdayManaus.getTime() + 7 * 3600 * 1000);
    endManaus = new Date(startTodayManaus.getTime() + 7 * 3600 * 1000 - 1);
  }
  const toUtc = (d: Date) => new Date(d.getTime() - MANAUS_OFFSET_MS);
  return {
    fromUtc: toUtc(startManaus),
    toUtc: toUtc(endManaus),
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

async function buildXlsx(rows: any[]): Promise<Uint8Array> {
  const data = rows.map((r) => ({
    Colaborador: r.nome,
    Email: r.email ?? "—",
    Setor: r.setor ?? "—",
    "Tipo de Ronda": TIPO_LABEL[r.tipo_acao] ?? r.tipo_acao,
    "Horário da Foto (Manaus)": fmtManaus(r.horario_foto),
    "Horário de Envio (Manaus)": fmtManaus(r.horario_acao),
    Observação: r.observacoes ?? "",
    "Caminho do Arquivo": r.foto_url || "—",
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [
    { wch: 28 },
    { wch: 28 },
    { wch: 22 },
    { wch: 22 },
    { wch: 26 },
    { wch: 26 },
    { wch: 50 },
    { wch: 60 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rondas");
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new Uint8Array(out as ArrayBuffer);
}

// Gera anexos JPG individuais para cada foto da ronda
async function buildFotosAnexos(
  ronda: Ronda,
  photoMap: Map<string, string | null>,
  rondaIdx: number,
  setorKey: string,
): Promise<{ filename: string; content: string }[]> {
  const attachments: { filename: string; content: string }[] = [];
  const nome = ronda.nome.replace(/[\/\\:*?"<>|\s]+/g, "_");

  for (let i = 0; i < ronda.passos.length; i++) {
    const passo = ronda.passos[i];
    const b64 = photoMap.get(passo.id);
    if (!b64) continue;

    const tipoLabel = (TIPO_LABEL[passo.tipo] ?? passo.tipo).replace(/\s+/g, "_");
    const num = String(i + 1).padStart(2, "0");
    const filename = `R${rondaIdx}_${setorKey}_${nome}_${num}_${tipoLabel}.jpg`;

    attachments.push({ filename, content: b64 });
  }

  return attachments;
}

async function fetchPhotoAsBase64(
  fotoUrl: string,
  supabaseUrl: string,
  serviceKey: string,
): Promise<string | null> {
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
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        apikey: serviceKey,
      },
      body: JSON.stringify({ paths: [path], expiresIn: 3600 }),
      signal: AbortSignal.timeout(10000),
    });
    if (!signedRes.ok) {
      console.error("[photo] sign failed:", signedRes.status, "path:", path);
      return null;
    }
    const signedData = await signedRes.json();
    const item = Array.isArray(signedData) ? signedData[0] : signedData;
    const signedPath = item?.signedURL ?? item?.signedUrl ?? item?.signed_url;
    if (!signedPath) {
      console.error("[photo] no signed URL in response:", JSON.stringify(signedData).slice(0, 200));
      return null;
    }

    const fullUrl = signedPath.startsWith("http")
      ? signedPath
      : `${supabaseUrl}/storage/v1${signedPath}`;
    const imgRes = await fetch(fullUrl, { signal: AbortSignal.timeout(15000) });
    if (!imgRes.ok) {
      console.error("[photo] download failed:", imgRes.status);
      return null;
    }
    const imgBytes = new Uint8Array(await imgRes.arrayBuffer());
    return toBase64(imgBytes);
  } catch (e) {
    console.error("[photo] exception:", e);
    return null;
  }
}

async function buildPdf(
  rows: any[],
  rondas: any[],
  periodo: string,
  supabaseUrl: string,
  serviceKey: string,
  titulo?: string,
  subtitulo?: string,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontB = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontI = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const pageW = 595;
  const pageH = 842;
  const marginX = 36;
  const tableW = pageW - marginX * 2;
  const rowH = 18;
  const headerH = 22;

  // Professional color palette
  const brandRed = rgb(0.83, 0.15, 0.12);
  const darkRed = rgb(0.65, 0.1, 0.09);
  const navyBlue = rgb(0.12, 0.17, 0.33);
  const darkText = rgb(0.07, 0.09, 0.15);
  const grayText = rgb(0.45, 0.48, 0.53);
  const lightGray = rgb(0.96, 0.97, 0.98);
  const lineColor = rgb(0.83, 0.86, 0.9);
  const borderColor = rgb(0.88, 0.9, 0.93);
  const white = rgb(1, 1, 1);
  const softRed = rgb(0.99, 0.93, 0.93);

  // Cor do setor (consistente com dashboard): CD=azul, LOJA=âmbar
  const setorPdfColor = (setor: string | undefined | null): { r: number; g: number; b: number } => {
    const s = (setor ?? "").toUpperCase();
    if (s.includes("CD")) return { r: 0.055, g: 0.647, b: 0.914 }; // #0EA5E9
    if (s.includes("LOJA")) return { r: 0.961, g: 0.62, b: 0.043 }; // #F59E0B
    if (s.includes("TI") || s.includes("DEPARTAMENTO")) return { r: 0.659, g: 0.333, b: 0.969 };
    if (s.includes("GESTOR")) return { r: 0.063, g: 0.725, b: 0.506 };
    return { r: 0.392, g: 0.459, b: 0.545 };
  };

  let page = pdf.addPage([pageW, pageH]);
  let pageNum = 1;
  let y = pageH - 36;

  const draw = (
    txt: string,
    xPos: number,
    yPos: number,
    size: number,
    bold = false,
    color = darkText,
  ) => {
    page.drawText(sanitizeWinAnsi(txt), { x: xPos, y: yPos, size, font: bold ? fontB : font, color });
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
      // Top bar on new pages
      page.drawRectangle({ x: 0, y: pageH - 8, width: pageW, height: 8, color: brandRed });
      draw("BA Elétrica — Controle de Ronda", marginX, pageH - 28, 8, true, navyBlue);
      draw(`Período: ${periodo}`, pageW / 2 + 20, pageH - 28, 7, false, grayText);
      y = pageH - 44;
    }
  };

  // ═══ PAGE 1: COVER ═══

  // Top accent bar
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
  } catch (_) {
    /* logo opcional */
  }

  // Company name + title block
  const titleX = marginX + logoW + 16;
  draw(titulo ?? "BA ELÉTRICA", titleX, y, 18, true, brandRed);
  y -= 16;
  draw("Sistema de Controle de Ronda", titleX, y, 10, false, navyBlue);
  y -= 14;
  draw(subtitulo ?? "Folha Oficial de Registro e Auditoria", titleX, y, 9, false, grayText);
  y -= 20;

  // Divider
  lineH(marginX, pageW - marginX, y, 2, brandRed);
  y -= 6;
  lineH(marginX, pageW - marginX, y, 0.5, lineColor);
  y -= 24;

  // Info card
  const cardX = marginX;
  const cardW = tableW;
  const cardH = 80;
  page.drawRectangle({
    x: cardX,
    y: y - cardH,
    width: cardW,
    height: cardH,
    borderColor: borderColor,
    borderWidth: 0.8,
    color: lightGray,
  });
  // Red left accent on card
  page.drawRectangle({ x: cardX, y: y - cardH, width: 4, height: cardH, color: brandRed });

  const cardPad = cardX + 16;
  let cy = y - 16;
  draw("PERÍODO DO RELATÓRIO", cardPad, cy, 7, true, grayText);
  cy -= 12;
  draw(periodo, cardPad, cy, 10, true, darkText);
  cy -= 18;
  draw("EMITIDO EM", cardPad + 260, cy + 18, 7, true, grayText);
  draw(fmtManaus(new Date().toISOString(), false), cardPad + 260, cy + 6, 9, false, darkText);
  draw("TOTAL DE REGISTROS", cardPad + 420, cy + 18, 7, true, grayText);
  draw(String(rows.length), cardPad + 420, cy + 6, 12, true, brandRed);

  y -= cardH + 24;

  // ── Summary stats ──
  const checkIns = rows.filter((r) => r.tipo_acao === "check_in").length;
  const checkOuts2 = rows.filter((r) => r.tipo_acao === "check_out_2").length;
  const uniqueUsers = new Set(rows.map((r) => r.user_id)).size;
  const uniqueSetores = new Set(rows.filter((r) => r.setor).map((r) => r.setor)).size;

  draw("RESUMO OPERACIONAL", marginX, y, 10, true, brandRed);
  y -= 16;

  const statCards = [
    { label: "INÍCIOS", value: String(checkIns), color: rgb(0.16, 0.63, 0.33) },
    { label: "FINAIS", value: String(checkOuts2), color: rgb(0.85, 0.55, 0.1) },
    { label: "COLABORADORES", value: String(uniqueUsers), color: brandRed },
    { label: "SETORES", value: String(uniqueSetores), color: navyBlue },
  ];
  const statCardW = (tableW - 9) / 4;
  statCards.forEach((s, i) => {
    const sx = marginX + i * (statCardW + 3);
    page.drawRectangle({
      x: sx,
      y: y - 48,
      width: statCardW,
      height: 48,
      borderColor: borderColor,
      borderWidth: 0.5,
      color: white,
    });
    // Top color bar
    page.drawRectangle({ x: sx, y: y, width: statCardW, height: 3, color: s.color });
    draw(s.value, sx + statCardW / 2 - s.value.length * 4, y - 22, 14, true, s.color);
    draw(s.label, sx + 4, y - 40, 5.5, true, grayText);
  });
  y -= 64;

  // ── Table ──
  const colWidths = [30, 100, 65, 100, 62, 80, 80];
  const colHeaders = [
    "#",
    "COLABORADOR",
    "SETOR",
    "TIPO DE RONDA",
    "DATA",
    "HOR. FOTO",
    "HOR. ENVIO",
  ];
  const tableX = marginX;

  // Table header
  page.drawRectangle({ x: tableX, y: y - 2, width: tableW, height: headerH, color: navyBlue });
  let x = tableX;
  for (let i = 0; i < colHeaders.length; i++) {
    draw(colHeaders[i], x + 4, y, 6.5, true, white);
    x += colWidths[i];
  }
  y -= headerH + 2;
  lineH(tableX, tableX + tableW, y, 0.5, navyBlue);
  y -= 2;

  // Data rows
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
      String(rowIdx + 1),
      String(r.nome ?? "—").slice(0, 22),
      String(r.setor ?? "—").slice(0, 13),
      tipoLabel,
      data,
      horaFoto,
      horaEnvio,
    ];

    // Alternating row
    if (rowIdx % 2 === 0) {
      page.drawRectangle({ x: tableX, y: y - 4, width: tableW, height: rowH, color: lightGray });
    }

    // Row left accent for check-ins
    if (r.tipo_acao === "check_in") {
      page.drawRectangle({
        x: tableX,
        y: y - 4,
        width: 2,
        height: rowH,
        color: rgb(0.16, 0.63, 0.33),
      });
    } else if (r.tipo_acao === "check_out_2") {
      page.drawRectangle({
        x: tableX,
        y: y - 4,
        width: 2,
        height: rowH,
        color: rgb(0.85, 0.55, 0.1),
      });
    }

    x = tableX;
    for (let i = 0; i < cells.length; i++) {
      if (i === 2) {
        // Coluna SETOR: faixa de cor + texto em branco
        const sc = setorPdfColor(r.setor);
        const bandX = x + 4;
        const bandW = colWidths[i] - 8;
        page.drawRectangle({
          x: bandX,
          y: y - 4,
          width: bandW,
          height: rowH - 2,
          color: rgb(sc.r, sc.g, sc.b),
          borderRadius: 2,
        });
        draw(cells[i], bandX + 5, y + 1, 6.5, true, white);
      } else {
        draw(cells[i], x + 6, y, 7.5, false, darkText);
      }
      x += colWidths[i];
    }
    y -= rowH;
    lineH(tableX, tableX + tableW, y, 0.3, borderColor);
    y -= 4;
    rowIdx++;
  }

  // Page 1 footer
  drawPageFooter(pageNum);

  // ═══ DETALHAMENTO DAS RONDAS (fotos da ronda em ordem cronológica) ═══
  const embedImage = async (b64: string | null | undefined) => {
    if (!b64) return null;
    try {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
      const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
      if (isJpeg) return await pdf.embedJpg(bytes);
      if (isPng) return await pdf.embedPng(bytes);
      try { return await pdf.embedJpg(bytes); } catch { return await pdf.embedPng(bytes); }
    } catch {
      return null;
    }
  };

  const wrapText = (text: string, maxWidth: number, size: number): string[] => {
    const safe = sanitizeWinAnsi(text);
    const words = safe.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  };

  page = pdf.addPage([pageW, pageH]);
  pageNum++;
  page.drawRectangle({ x: 0, y: pageH - 10, width: pageW, height: 10, color: brandRed });
  y = pageH - 36;
  draw("DETALHAMENTO DAS RONDAS", marginX, y, 14, true, brandRed);
  y -= 14;
  draw(`Registro fotográfico completo por ronda — ${rondas.length} ronda(s) no período de ${periodo}`, marginX, y, 8, false, grayText);
  y -= 8;
  lineH(marginX, pageW - marginX, y, 1.5, brandRed);
  y -= 20;

  const cols = 2;
  const gap = 14;
  const pw = (tableW - gap) / cols;
  const photoH = 190;
  const captionBarH = 34;
  const ph = photoH + captionBarH;

  for (let ri = 0; ri < rondas.length; ri++) {
    const ronda = rondas[ri];
    const passos = [...(ronda.passos ?? [])].sort(
      (a: any, b: any) => CICLO_ORDEM.indexOf(a.tipo) - CICLO_ORDEM.indexOf(b.tipo),
    );
    if (passos.length === 0) continue;

    // Cabeçalho da ronda
    ensurePage(64);
    page.drawRectangle({ x: marginX, y: y - 30, width: tableW, height: 30, color: navyBlue });
    draw(`RONDA ${ri + 1} — ${ronda.nome ?? "—"}`, marginX + 10, y - 19, 10, true, white);
    draw(
      `${ronda.setor ?? "-"}  |  ${fmtManaus(ronda.inicio, false)} ${fmtManaus(ronda.inicio).split(" ")[1] ?? ""}`,
      marginX + 10,
      y - 9,
      7.5,
      false,
      rgb(0.82, 0.86, 0.95),
    );
    y -= 42;

    // Grade de fotos: início + meio1..8 + fim (em ordem cronológica)
    for (let i = 0; i < passos.length; i += cols) {
      ensurePage(ph + 14);
      for (let c = 0; c < cols; c++) {
        const p = passos[i + c];
        if (!p) continue;
        const px = marginX + c * (pw + gap);

        // Card background
        page.drawRectangle({
          x: px, y: y - ph, width: pw, height: ph,
          borderColor: borderColor, borderWidth: 0.8, color: white,
        });

        // Photo fills top portion of card
        const img = await embedImage((p as any)._photoBase64);
        if (img) {
          const scale = Math.min((pw - 8) / img.width, (photoH - 4) / img.height);
          const dw = img.width * scale;
          const dh = img.height * scale;
          page.drawImage(img, {
            x: px + (pw - dw) / 2,
            y: y - captionBarH - (photoH - dh) / 2 - dh,
            width: dw, height: dh,
          });
        } else {
          page.drawRectangle({
            x: px + 4, y: y - captionBarH - photoH + 4,
            width: pw - 8, height: photoH - 8, color: lightGray,
          });
          draw("Foto indisponível", px + pw / 2 - 36, y - captionBarH - photoH / 2, 7.5, false, grayText);
        }

        // Caption bar at bottom (dark overlay on top of photo)
        const accent = p.tipo === "check_in" ? rgb(0.16, 0.63, 0.33)
          : p.tipo === "check_out_2" ? rgb(0.85, 0.55, 0.1)
          : brandRed;
        page.drawRectangle({ x: px, y: y - ph, width: pw, height: captionBarH, color: navyBlue });
        page.drawRectangle({ x: px, y: y - ph + captionBarH, width: pw, height: 2, color: accent });

        // Caption text (on the overlay, not under the image)
        const capBaseY = y - ph + captionBarH;
        draw(`${TIPO_LABEL[p.tipo] ?? p.tipo}`, px + 8, capBaseY - 11, 7.5, true, white);
        draw(`Enviado: ${fmtManaus(p.horario_foto).split(" ")[1] ?? "—"}`, px + 8, capBaseY - 22, 6, false, rgb(0.8, 0.85, 0.95));
        draw(`Registro: ${fmtManaus(p.horario_acao).split(" ")[1] ?? "—"}`, px + pw / 2 + 4, capBaseY - 22, 6, false, rgb(0.8, 0.85, 0.95));
      }
      y -= ph + 14;
    }

    // Observação da ronda (bloco profissional com borda lateral)
    if (ronda.observacoes && ronda.observacoes.trim()) {
      const obsLines = wrapText(sanitizeWinAnsi(ronda.observacoes), tableW - 28, 8.5);
      const obsBlockH = obsLines.length * 13 + 30;
      ensurePage(obsBlockH + 10);

      page.drawRectangle({
        x: marginX, y: y - obsBlockH, width: tableW, height: obsBlockH,
        borderColor: brandRed, borderWidth: 0.8, color: softRed,
      });
      page.drawRectangle({
        x: marginX, y: y - obsBlockH, width: 4, height: obsBlockH, color: brandRed,
      });

      draw("OBSERVAÇÃO", marginX + 12, y - 12, 8, true, brandRed);
      draw(`${ronda.nome ?? "—"} — ${fmtManaus(ronda.fim, false)}`, marginX + 90, y - 12, 7, false, grayText);
      y -= 22;

      obsLines.forEach((ln, li) => {
        draw(ln, marginX + 12, y - li * 13, 8, false, darkText);
      });
      y -= obsLines.length * 13 + 12;
    }

    if (ri < rondas.length - 1) {
      ensurePage(20);
      lineH(marginX, pageW - marginX, y, 1, lineColor);
      y -= 18;
    }
  }

  drawPageFooter(pageNum);

  return pdf.save();
}

function buildEmailHtml(
  periodo: string,
  totalEventos: number,
  ciclos: number,
  agentes: number,
  setorLabel?: string,
): string {
  const setorInfo = setorLabel
    ? `<tr><td style="font-size:14px;line-height:22px;color:#475569;padding:0 0 20px 0;font-family:Arial,Helvetica,sans-serif">Em anexo a este e-mail, você encontrará o <strong>PDF gerencial do setor ${setorLabel}</strong> (com evidências fotográficas e registro de rondas). O arquivo reflete fielmente os dados extraídos do sistema.</td></tr>`
    : `<tr><td style="font-size:14px;line-height:22px;color:#475569;padding:0 0 20px 0;font-family:Arial,Helvetica,sans-serif">Em anexo a este e-mail, você encontrará os <strong>PDFs gerenciais</strong> (com gráficos, indicadores de conformidade e evidências fotográficas) dos setores CD e LOJA. Os arquivos refletem fielmente os dados extraídos do sistema.</td></tr>`;

  const subjectSuffix = setorLabel ? ` (${setorLabel})` : "";
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
      <tr><td style="font-size:14px;line-height:22px;color:#475569;padding:0 0 16px 0;font-family:Arial,Helvetica,sans-serif">O relatório diário consolidado do <strong>Controle de Ronda da BA Elétrica</strong> foi processado com sucesso pelo sistema de segurança.</td></tr>
      ${setorInfo}
      <tr><td style="padding:0 0 24px 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background-color:#F8FAFC;border-radius:6px;border:1px solid #E2E8F0">
        <tr><td style="padding:16px 20px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
          <tr>
            <td style="font-size:12px;color:#64748B;padding:0 0 4px 0;font-family:Arial,Helvetica,sans-serif">Período</td>
            <td style="font-size:12px;color:#64748B;padding:0 0 4px 0;font-family:Arial,Helvetica,sans-serif" align="center">Eventos</td>
            <td style="font-size:12px;color:#64748B;padding:0 0 4px 0;font-family:Arial,Helvetica,sans-serif" align="center">Ciclos</td>
            <td style="font-size:12px;color:#64748B;padding:0 0 4px 0;font-family:Arial,Helvetica,sans-serif" align="center">Agentes</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#0B1120;font-weight:bold;padding:0;font-family:Arial,Helvetica,sans-serif">${periodo}</td>
            <td style="font-size:13px;color:#0B1120;font-weight:bold;padding:0;text-align:center;font-family:Arial,Helvetica,sans-serif">${totalEventos}</td>
            <td style="font-size:13px;color:#0B1120;font-weight:bold;padding:0;text-align:center;font-family:Arial,Helvetica,sans-serif">${ciclos}</td>
            <td style="font-size:13px;color:#0B1120;font-weight:bold;padding:0;text-align:center;font-family:Arial,Helvetica,sans-serif">${agentes}</td>
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
            Relatorio_CD_GUARDAS.pdf — Relatório do setor CD - Guardas<br>
            Relatorio_LOJA_GUARDAS.pdf — Relatório do setor LOJA - Guardas<br>
            R1_CD_Nome_01_Inicio_de_Ronda.jpg — Fotos individuais de cada passo
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
    admin
      .from("registros_ponto")
      .select("id,user_id,tipo_acao,horario_acao,horario_foto,foto_url,observacoes")
      .gte("horario_acao", fromIso)
      .lte("horario_acao", toIso)
      .order("horario_acao", { ascending: true }),
    admin.from("profiles").select("id,nome,email,setor_id,foto_url"),
    admin.from("setores").select("id,nome"),
  ]);
  const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
  const setMap = new Map((sets ?? []).map((s: any) => [s.id, s.nome]));
  return (regs ?? []).map((r: any) => {
    const p: any = profMap.get(r.user_id);
    return {
      ...r,
      nome: p?.nome ?? "—",
      email: p?.email ?? "",
      setor: p?.setor_id ? (setMap.get(p.setor_id) ?? null) : null,
      avatar_url: p?.foto_url ?? null,
    };
  });
}

interface RondaPasso {
  id: string;
  tipo: string;
  horario_acao: string;
  horario_foto: string;
  foto_url: string;
}

interface Ronda {
  id: string;
  user_id: string;
  nome: string;
  setor: string;
  inicio: string;
  fim: string;
  passos: RondaPasso[];
  observacoes: string | null;
}

// Agrupa os registros planos em rondas (ciclo: check_in ... check_out_2).
function reconstructRondas(rows: any[]): Ronda[] {
  const porUser = new Map<string, any[]>();
  for (const r of rows) {
    if (!porUser.has(r.user_id)) porUser.set(r.user_id, []);
    porUser.get(r.user_id)!.push(r);
  }

  const rondas: Ronda[] = [];
  porUser.forEach((lista, userId) => {
    const primeiro = lista[0] ?? {};
    const nome = primeiro.nome ?? "—";
    const setor = primeiro.setor ?? "—";

    let ciclo: any[] = [];
    const flush = () => {
      if (ciclo.length === 0) return;
      const checkIn = ciclo[0];
      const checkOut = ciclo[ciclo.length - 1];
      rondas.push({
        id: checkOut.id,
        user_id: userId,
        nome,
        setor,
        inicio: checkIn.horario_acao,
        fim: checkOut.horario_acao,
        passos: ciclo.map((c) => ({
          id: c.id,
          tipo: c.tipo_acao,
          horario_acao: c.horario_acao,
          horario_foto: c.horario_foto,
          foto_url: c.foto_url,
        })),
        observacoes: checkOut.observacoes ?? null,
      });
      ciclo = [];
    };

    for (const r of lista) {
      if (r.tipo_acao === "check_in") {
        flush();
        ciclo = [r];
      } else if (r.tipo_acao === "check_out_2") {
        ciclo.push(r);
        flush();
      } else {
        ciclo.push(r);
      }
    }
    flush();
  });

  rondas.sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime());
  return rondas;
}

async function fetchAvatarAsBase64(
  avatarPath: string | null,
  supabaseUrl: string,
  serviceKey: string,
): Promise<string | null> {
  try {
    if (!avatarPath) return null;
    const signUrl = `${supabaseUrl}/storage/v1/object/sign/avatars`;
    const signedRes = await fetch(signUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        apikey: serviceKey,
      },
      body: JSON.stringify({ paths: [avatarPath], expiresIn: 3600 }),
      signal: AbortSignal.timeout(10000),
    });
    if (!signedRes.ok) return null;
    const signedData = await signedRes.json();
    const item = Array.isArray(signedData) ? signedData[0] : signedData;
    const signedPath = item?.signedURL ?? item?.signedUrl ?? item?.signed_url;
    if (!signedPath) return null;
    const fullUrl = signedPath.startsWith("http")
      ? signedPath
      : `${supabaseUrl}/storage/v1${signedPath}`;
    const imgRes = await fetch(fullUrl, { signal: AbortSignal.timeout(15000) });
    if (!imgRes.ok) return null;
    const imgBytes = new Uint8Array(await imgRes.arrayBuffer());
    return toBase64(imgBytes);
  } catch (e) {
    console.error("[avatar] exception:", e);
    return null;
  }
}

async function fetchRecipientEmails(admin: any, setorParam: string | null): Promise<string[]> {
  const seen = new Set<string>();
  const recipients: string[] = [];

  // Buscar IDs de admins
  const { data: adminRoles, error: adminErr } = await admin.from("user_roles").select("user_id").eq("role", "admin");
  console.log(`[recipients] user_roles query error:`, adminErr?.message ?? "none");
  console.log(`[recipients] admin roles found:`, (adminRoles ?? []).length);
  const adminIds = new Set((adminRoles ?? []).map((r: any) => r.user_id));
  console.log(`[recipients] admin IDs:`, [...adminIds].slice(0, 10));

  // Buscar setores e filtrar por GESTOR + setorParam
  const { data: sets, error: setsErr } = await admin.from("setores").select("id,nome");
  console.log(`[recipients] setores query error:`, setsErr?.message ?? "none");
  console.log(`[recipients] all setores:`, (sets ?? []).map((s: any) => `${s.id}=${s.nome}`));
  const gestorSetores = (sets ?? []).filter((s: any) => {
    const n = (s.nome ?? "").toUpperCase();
    if (!n.includes("GESTOR")) return false;
    if (setorParam === "CD") return !n.includes("LOJA");
    if (setorParam === "LOJA") return !n.includes("CD");
    return true; // teste: todos os GESTOR
  });
  const gestorIds = new Set(gestorSetores.map((s: any) => s.id));
  console.log(`[recipients] gestor setores for ${setorParam}:`, gestorSetores.map((s: any) => `${s.id}=${s.nome}`));
  console.log(`[recipients] gestor IDs:`, [...gestorIds]);

  const { data: allProfiles, error: profsErr } = await admin.from("profiles").select("id,nome,email,setor_id");
  console.log(`[recipients] profiles query error:`, profsErr?.message ?? "none");
  console.log(`[recipients] total profiles:`, (allProfiles ?? []).length);

  if (allProfiles?.length) {
    for (const p of allProfiles) {
      const email = normalizeEmail(p.email);
      if (!email || seen.has(email)) continue;
      if (!adminIds.has(p.id)) continue;
      if (!p.setor_id || !gestorIds.has(p.setor_id)) continue;
      seen.add(email);
      recipients.push(email);
      console.log(`[recipients] MATCH: ${p.nome} <${email}> setor_id=${p.setor_id}`);
    }
  }

  console.log(`[recipients] FINAL recipients (${setorParam}):`, recipients);
  return recipients;
}

async function sendResend(
  to: string[],
  subject: string,
  html: string,
  attachments: { filename: string; content: string }[],
) {
  const resendKey = Deno.env.get("RESEND_API_KEY") || RESEND_API_KEY_FALLBACK;
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
    try {
      msg = JSON.parse(text).message ?? text;
    } catch {}
    throw new Error(`Resend ${res.status}: ${msg}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const modo: "teste" | "diario" = body?.modo === "diario" ? "diario" : "teste";
    const periodoParam = body?.periodo as string | undefined;
    const setorParam = (body?.setor as string | undefined)?.toUpperCase() ?? null;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    const { fromUtc, toUtc } = rangeFor(modo, periodoParam);
    const periodo = `${fmtManaus(fromUtc.toISOString(), false)} a ${fmtManaus(toUtc.toISOString(), false)} (America/Manaus)`;

    const rows = await fetchRows(admin, fromUtc.toISOString(), toUtc.toISOString());
    console.log(`[main] modo=${modo} setor=${setorParam} rows=${rows.length} from=${fromUtc.toISOString()} to=${toUtc.toISOString()}`);

    // Log setor distribution
    const setorCounts: Record<string, number> = {};
    for (const r of rows) {
      const s = r.setor ?? "null";
      setorCounts[s] = (setorCounts[s] ?? 0) + 1;
    }
    console.log(`[main] rows by setor:`, setorCounts);

    // ── Fetch recipients FIRST (before expensive photo downloads) ──
    let recipients = await fetchRecipientEmails(admin, setorParam);
    if (modo === "teste") {
      recipients = recipients.filter((e) => e === "suporte04@baeletrica.com.br");
    }
    console.log(`[main] recipients after filter:`, recipients);
    if (!recipients.length) {
      console.warn(`[main] ⚠️ NO RECIPIENTS FOUND for setor=${setorParam}. Returning early.`);
      return new Response(
        JSON.stringify({
          ok: false,
          message: "Nenhum destinatário.",
          recipients: [],
          count: rows.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // ── Process each setor SEPARATELY to stay within memory limits ──
    // Photos are downloaded per-setor, not all upfront
    const ALL_SETORES = [
      { key: "LOJA", match: "LOJA", titulo: "BA ELÉTRICA LOJA - ( LOJA - GUARDAS)", subtitulo: "que conterá somente o registro das pessoas que fizeram a ronda com o setor ( LOJA - GUARDAS)", filePrefix: "LOJA_GUARDAS" },
      { key: "CD", match: "CD", titulo: "BA ELÉTRICA CD - ( CD - GUARDAS)", subtitulo: "que conterá somente o registro das pessoas que fizeram a ronda com o setor ( CD - GUARDAS)", filePrefix: "CD_GUARDAS" },
    ];
    const SETORES = setorParam
      ? ALL_SETORES.filter((s) => s.key === setorParam)
      : ALL_SETORES;

    console.log(`[main] SETORES to process:`, SETORES.map((s) => s.key));

    // ── MODO TESTE: email leve (sem fotos/PDF) para validar Resend + destinatários ──
    if (modo === "teste") {
      const htmlTeste = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:8px;overflow:hidden">
  <tr><td style="background:#DC2626;padding:20px 28px;font-size:18px;font-weight:bold;color:#fff">BA Elétrica — Teste de Envio</td></tr>
  <tr><td style="padding:28px">
    <p style="font-size:14px;color:#0B1120;margin:0 0 12px">Olá, Gestor.</p>
    <p style="font-size:14px;color:#475569;margin:0 0 16px">Este é um <strong>e-mail de teste</strong> do sistema de Controle de Ronda.</p>
    <table width="100%" style="background:#F8FAFC;border-radius:6px;border:1px solid #E2E8F0"><tr><td style="padding:16px">
      <p style="font-size:12px;color:#64748B;margin:0">Registros encontrados: <strong style="color:#0B1120">${rows.length}</strong></p>
      <p style="font-size:12px;color:#64748B;margin:4px 0 0">Destinatários: <strong style="color:#0B1120">${recipients.join(", ")}</strong></p>
      <p style="font-size:12px;color:#64748B;margin:4px 0 0">Período: <strong style="color:#0B1120">${periodo}</strong></p>
    </td></tr></table>
  </td></tr>
  <tr><td style="background:#F1F5F9;padding:14px 28px;font-size:11px;color:#94A3B8;border-top:1px solid #E2E8F0">
    E-mail automático — Sistema de Controle de Ronda — BA Elétrica
  </td></tr>
</table></td></tr></table></body></html>`;

      let result;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          result = await sendResend(recipients, `BA Elétrica — Teste de Envio (${periodo})`, htmlTeste, []);
          break;
        } catch (e: any) {
          if (attempt < 3) await new Promise((r) => setTimeout(r, 3000));
          else throw e;
        }
      }

      console.log(`[main] ✅ TESTE OK: id=${(result as any)?.id} rows=${rows.length} recipients=${recipients.length}`);
      return new Response(
        JSON.stringify({ ok: true, modo: "teste", rows: rows.length, recipients, id: (result as any)?.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // ── MODO DIÁRIO: full processing com fotos + PDF ──
    const attachments: { filename: string; content: string }[] = [];
    let totalRegistros = 0;
    let rondaIdx = 0;

    for (const setor of SETORES) {
      const setorRows = rows.filter((r: any) => {
        const s = (r.setor ?? "").toUpperCase();
        return s.includes(setor.match);
      });
      console.log(`[main] setor=${setor.key} match="${setor.match}" rows=${setorRows.length}`);
      if (setorRows.length === 0) continue;

      // Limitar a MAX_PHOTOS para não estourar memória do worker
      const limitedRows = setorRows.slice(0, MAX_PHOTOS);

      // Download photos ONLY for this setor's rows
      const photoMap = new Map<string, string | null>();
      console.log(`[main] downloading ${limitedRows.length} photos (limit=${MAX_PHOTOS}) for ${setor.key}...`);
      let photosOk = 0;
      let photosFail = 0;
      for (let i = 0; i < limitedRows.length; i++) {
        const r = limitedRows[i];
        const b64 = await fetchPhotoAsBase64(r.foto_url, SUPABASE_URL, SERVICE_KEY);
        photoMap.set(r.id, b64);
        if (b64) photosOk++; else photosFail++;
      }
      console.log(`[main] photos ${setor.key} done: ${photosOk} ok, ${photosFail} failed`);

      // Fetch avatars ONLY for limited setor's users
      const uniqueAvatarPaths = new Map<string, string>();
      for (const r of limitedRows) {
        if (r.avatar_url && !uniqueAvatarPaths.has(r.user_id)) {
          uniqueAvatarPaths.set(r.user_id, r.avatar_url);
        }
      }
      const avatarMap = new Map<string, string | null>();
      for (const [userId, path] of uniqueAvatarPaths) {
        const b64 = await fetchAvatarAsBase64(path, SUPABASE_URL, SERVICE_KEY);
        avatarMap.set(userId, b64);
      }

      // Attach photos/avatars to ALL setor rows (excedentes ficam sem foto)
      for (const r of setorRows) {
        r._photoBase64 = photoMap.get(r.id) ?? null;
        r._avatarBase64 = avatarMap.get(r.user_id) ?? null;
      }

      const setorRondas = reconstructRondas(setorRows);
      for (const ronda of setorRondas) {
        for (const passo of ronda.passos) {
          (passo as any)._photoBase64 = photoMap.get(passo.id) ?? null;
        }
      }

      const pdfBytes = await buildPdf(setorRows, setorRondas, periodo, SUPABASE_URL, SERVICE_KEY, setor.titulo, setor.subtitulo);
      attachments.push({
        filename: `Relatorio_${setor.filePrefix}.pdf`,
        content: toBase64(pdfBytes),
      });

      for (const ronda of setorRondas) {
        rondaIdx++;
        const fotos = await buildFotosAnexos(ronda, photoMap, rondaIdx, setor.key);
        attachments.push(...fotos);
      }

      totalRegistros += setorRows.length;

      // Free memory for this setor
      photoMap.clear();
      avatarMap.clear();
      for (const r of setorRows) {
        r._photoBase64 = null;
        r._avatarBase64 = null;
      }
    }

    // Anexos: PDFs + montagens de fotos
    console.log(`[main] total attachments: ${attachments.length}, totalRegistros: ${totalRegistros}`);
    if (attachments.length === 0) {
      const msg = setorParam
        ? `Nenhum registro no setor ${setorParam} no período.`
        : "Nenhum registro nos setores CD/LOJA.";
      console.warn(`[main] ⚠️ ${msg} setor=${setorParam}`);
      return new Response(
        JSON.stringify({ ok: true, message: msg, recipients: [], count: 0, setor: setorParam }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    const ciclos = rows.filter((r: any) => r.tipo_acao === "check_out_2").length;
    const ag = new Set(rows.map((r: any) => r.user_id)).size;
    const setorLabel = SETORES.length === 1 ? SETORES[0].titulo : undefined;
    const html = buildEmailHtml(periodo, totalRegistros, ciclos, ag, setorLabel);

    const subjectSuffix = setorLabel ? ` — ${setorLabel}` : "";
    console.log(`[main] sending email to ${recipients.length} recipients, ${attachments.length} attachments`);

    let result;
    let lastErr;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        result = await sendResend(
          recipients,
          `BA Elétrica — Relatório de Ronda${subjectSuffix} (${periodo})`,
          html,
          attachments,
        );
        console.log(`[main] email sent successfully on attempt ${attempt}:`, (result as any)?.id);
        break;
      } catch (e: any) {
        lastErr = e;
        console.error(`[main] send attempt ${attempt} failed:`, e?.message);
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 5000 * attempt));
        }
      }
    }
    if (!result) {
      // ── FALLBACK: Se Resend falhar, chama Google Apps Script ──
      console.warn(`[main] ⚠️ Resend falhou. Tentando fallback via GAS...`);
      try {
        const gasUrl = setorParam
          ? `${GAS_FALLBACK_URL}?setor=${setorParam}`
          : `${GAS_FALLBACK_URL}?setor=CD`;
        const gasRes = await fetch(gasUrl, { signal: AbortSignal.timeout(120000) });
        const gasData = await gasRes.json();
        console.log(`[main] ✅ GAS fallback OK:`, gasData);
        return new Response(
          JSON.stringify({
            ok: true,
            modo,
            setor: setorParam,
            periodo,
            count: rows.length,
            recipients,
            fallback: "gas",
            gasResult: gasData,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
        );
      } catch (gasErr: any) {
        console.error(`[main] ❌ GAS fallback também falhou:`, gasErr?.message);
        throw new Error(`Resend falhou: ${lastErr?.message}. GAS fallback falhou: ${gasErr?.message}`);
      }
    }

    console.log(`[main] ✅ SUCCESS: email sent. id=${(result as any)?.id} recipients=${recipients.length}`);
    return new Response(
      JSON.stringify({
        ok: true,
        modo,
        setor: setorParam,
        periodo,
        count: rows.length,
        recipients,
        id: (result as any)?.id ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (e: any) {
    console.error("[main] ERROR:", e?.message);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
