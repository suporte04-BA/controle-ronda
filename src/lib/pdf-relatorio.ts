import { PDFDocument, StandardFonts, rgb, PDFPage } from "pdf-lib";
import { TIPO_ACAO_LABEL } from "./timezone";

interface PdfRow {
  nome: string;
  setor: string | null;
  tipo_acao: string;
  horario_acao: string;
  horario_foto: string;
}

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN_L = 40;
const MARGIN_R = 40;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;

function formatDataManual(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatHoraManual(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/Manaus" });
}

function drawText(
  page: PDFPage,
  txt: string,
  x: number,
  y: number,
  font: any,
  fontBold: any,
  size: number,
  bold = false,
  color = rgb(0.04, 0.07, 0.14)
) {
  page.drawText(txt, { x, y, size, font: bold ? fontBold : font, color });
}

export async function gerarPdfRelatorio(
  rows: PdfRow[],
  dataDe: string,
  dataAte: string
): Promise<void> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontB = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - 50;

  const ensureSpace = (needed: number) => {
    if (y - needed < 60) {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - 50;
    }
  };

  const line = (h = 14) => {
    y -= h;
    ensureSpace(10);
  };

  // Header
  drawText(page, "BA Eletrica", MARGIN_L, y, font, fontB, 18, true, rgb(0.16, 0.035, 0.265));
  line(10);
  drawText(page, "Folha Oficial de Controle de Ronda", MARGIN_L, y, font, fontB, 14, true);
  line(16);

  // Period info
  const periodo = `Periodo: ${formatDataManual(dataDe + "T00:00:00")} a ${formatDataManual(dataAte + "T00:00:00")}`;
  const emitido = `Emitido em: ${formatDataManual(new Date().toISOString())} ${formatHoraManual(new Date().toISOString())}`;
  drawText(page, periodo, MARGIN_L, y, font, fontB, 9);
  line(12);
  drawText(page, emitido, MARGIN_L, y, font, fontB, 9);
  line(12);
  drawText(page, `Total de registros: ${rows.length}`, MARGIN_L, y, font, fontB, 9);
  line(16);

  // Table header
  const colX = [
    MARGIN_L,
    MARGIN_L + 160,
    MARGIN_L + 270,
    MARGIN_L + 370,
    MARGIN_L + 440,
  ];
  const colW = [155, 105, 95, 65, 100];
  const headers = ["Colaborador", "Setor", "Tipo de Ronda", "Data", "Horario"];

  ensureSpace(40);

  // Header background
  page.drawRectangle({
    x: MARGIN_L - 4,
    y: y - 4,
    width: CONTENT_W + 8,
    height: 18,
    color: rgb(0.92, 0.92, 0.94),
  });

  headers.forEach((h, i) => {
    drawText(page, h, colX[i], y, font, fontB, 8, true);
  });
  line(18);

  // Table rows
  let rowIdx = 0;
  for (const r of rows) {
    ensureSpace(16);

    if (rowIdx % 2 === 0) {
      page.drawRectangle({
        x: MARGIN_L - 4,
        y: y - 4,
        width: CONTENT_W + 8,
        height: 14,
        color: rgb(0.96, 0.96, 0.97),
      });
    }

    const nome = String(r.nome).slice(0, 30);
    const setor = String(r.setor ?? "—").slice(0, 20);
    const tipo = (TIPO_ACAO_LABEL[r.tipo_acao] ?? r.tipo_acao).slice(0, 18);
    const data = formatDataManual(r.horario_acao);
    const hora = formatHoraManual(r.horario_acao);

    drawText(page, nome, colX[0], y, font, fontB, 8);
    drawText(page, setor, colX[1], y, font, fontB, 8);
    drawText(page, tipo, colX[2], y, font, fontB, 8);
    drawText(page, data, colX[3], y, font, fontB, 8);
    drawText(page, hora, colX[4], y, font, fontB, 8);

    line(14);
    rowIdx++;
  }

  // Footer line
  line(10);
  drawText(
    page,
    `BA Eletrica - Controle de Ronda - Fuso America/Manaus`,
    MARGIN_L,
    y,
    font,
    fontB,
    7,
    false,
    rgb(0.5, 0.5, 0.5)
  );

  const pdfBytes = await pdf.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `controle_ronda_${dataDe}_a_${dataAte}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
