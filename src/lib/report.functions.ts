import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SENDER = "BA Elétrica <relatorio@baeletrica.com.br>";
const MANAUS_OFFSET_MS = -4 * 60 * 60 * 1000;

function toManausDate(d: Date) {
  return new Date(d.getTime() + MANAUS_OFFSET_MS);
}
function fmtManaus(iso: string, withSec = true) {
  const d = toManausDate(new Date(iso));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}${withSec ? ":" + pad(d.getUTCSeconds()) : ""}`;
}
function manausDayRange(mode: "yesterday" | "today_and_yesterday") {
  const now = new Date();
  const m = toManausDate(now);
  const startToday = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), m.getUTCDate(), 0, 0, 0));
  const startYday = new Date(startToday.getTime() - 86400000);
  const endToday = new Date(startToday.getTime() + 86400000 - 1);
  // converter de "Manaus midnight" para UTC: somar +4h
  const fromManausToUtc = (d: Date) => new Date(d.getTime() - MANAUS_OFFSET_MS);
  if (mode === "yesterday") {
    return { fromUtc: fromManausToUtc(startYday), toUtc: fromManausToUtc(new Date(startToday.getTime() - 1)) };
  }
  return { fromUtc: fromManausToUtc(startYday), toUtc: fromManausToUtc(endToday) };
}

const TIPO_LABEL: Record<string, string> = {
  check_in: "Check-in da Ronda",
  check_out_1: "Check-out 1 da Ronda",
  check_out_2: "Check-out 2 da Ronda",
};

async function buildXlsx(rows: any[]): Promise<Uint8Array> {
  const XLSX = await import("xlsx");
  const data = rows.map((r) => ({
    Colaborador: r.nome,
    Email: r.email,
    Setor: r.setor ?? "—",
    "Tipo de Ronda": TIPO_LABEL[r.tipo_acao] ?? r.tipo_acao,
    "Horário da Foto": fmtManaus(r.horario_acao),
    "Horário do Envio": fmtManaus(r.horario_foto),
    "Caminho do Arquivo": r.foto_url,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [{ wch: 28 }, { wch: 28 }, { wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 60 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rondas");
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new Uint8Array(out as ArrayBuffer);
}

async function buildPdf(rows: any[], periodo: string): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontB = await pdf.embedFont(StandardFonts.HelveticaBold);

  // agregações
  const porSetor = new Map<string, number>();
  const porUser = new Map<string, { nome: string; setor: string; ciclos: number; eventos: number }>();
  const eventosPorUser = new Map<string, number>();
  rows.forEach((r) => {
    eventosPorUser.set(r.user_id, (eventosPorUser.get(r.user_id) ?? 0) + 1);
    if (r.tipo_acao === "check_out_2") {
      porSetor.set(r.setor ?? "—", (porSetor.get(r.setor ?? "—") ?? 0) + 1);
      const cur = porUser.get(r.user_id) ?? { nome: r.nome, setor: r.setor ?? "—", ciclos: 0, eventos: 0 };
      cur.ciclos += 1;
      porUser.set(r.user_id, cur);
    }
  });
  porUser.forEach((v, k) => { v.eventos = eventosPorUser.get(k) ?? 0; });

  let page = pdf.addPage([595, 842]);
  let y = 800;
  const draw = (txt: string, x: number, size = 10, bold = false, color = rgb(0.04, 0.07, 0.14)) => {
    page.drawText(txt, { x, y, size, font: bold ? fontB : font, color });
  };
  const newLine = (h = 14) => {
    y -= h;
    if (y < 60) { page = pdf.addPage([595, 842]); y = 800; }
  };

  draw("BA Eletrica — Relatorio de Controle de Ronda", 40, 16, true);
  newLine(20);
  draw(`Periodo: ${periodo}`, 40, 10);
  newLine();
  draw(`Total de eventos: ${rows.length}   |   Ciclos concluidos: ${Array.from(porUser.values()).reduce((s, v) => s + v.ciclos, 0)}`, 40, 10);
  newLine(22);

  draw("Ciclos concluidos por setor", 40, 12, true, rgb(0.85, 0.15, 0.15));
  newLine(18);
  Array.from(porSetor.entries()).sort((a, b) => b[1] - a[1]).forEach(([s, n]) => {
    draw(`• ${s}`, 50, 10); draw(`${n}`, 500, 10, true);
    newLine();
  });
  newLine(10);

  draw("Ranking de Vigilantes (ciclos concluidos)", 40, 12, true, rgb(0.85, 0.15, 0.15));
  newLine(18);
  draw("Colaborador", 50, 10, true);
  draw("Setor", 260, 10, true);
  draw("Eventos", 420, 10, true);
  draw("Ciclos", 510, 10, true);
  newLine(14);
  Array.from(porUser.values()).sort((a, b) => b.ciclos - a.ciclos).forEach((u) => {
    draw(String(u.nome).slice(0, 36), 50, 10);
    draw(String(u.setor).slice(0, 24), 260, 10);
    draw(String(u.eventos), 420, 10);
    draw(String(u.ciclos), 510, 10, true);
    newLine();
  });

  return pdf.save();
}

function toBase64(u8: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < u8.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + chunk)) as any);
  }
  // btoa works in worker runtime
  // @ts-ignore
  return btoa(bin);
}

async function fetchRowsBetween(supabaseAdmin: any, fromIso: string, toIso: string) {
  const [{ data: regs }, { data: profs }, { data: sets }] = await Promise.all([
    supabaseAdmin.from("registros_ponto")
      .select("id,user_id,tipo_acao,horario_acao,horario_foto,foto_url")
      .gte("horario_acao", fromIso).lte("horario_acao", toIso)
      .order("horario_acao", { ascending: true }),
    supabaseAdmin.from("profiles").select("id,nome,email,setor_id"),
    supabaseAdmin.from("setores").select("id,nome"),
  ]);
  const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
  const setMap = new Map((sets ?? []).map((s: any) => [s.id, s.nome]));
  return (regs ?? []).map((r: any) => {
    const p: any = profMap.get(r.user_id);
    return {
      ...r,
      nome: p?.nome ?? "—",
      email: p?.email ?? "",
      setor: p?.setor_id ? setMap.get(p.setor_id) ?? null : null,
    };
  });
}

async function fetchGestorAdmins(supabaseAdmin: any): Promise<{ email: string; nome: string }[]> {
  const { data: setor } = await supabaseAdmin
    .from("setores").select("id,nome").ilike("nome", "gestor").maybeSingle();
  if (!setor) return [];
  const { data: profs } = await supabaseAdmin
    .from("profiles").select("id,nome,email").eq("setor_id", setor.id);
  if (!profs?.length) return [];
  const ids = profs.map((p: any) => p.id);
  const { data: roles } = await supabaseAdmin
    .from("user_roles").select("user_id").eq("role", "admin").in("user_id", ids);
  const adminSet = new Set((roles ?? []).map((r: any) => r.user_id));
  return profs.filter((p: any) => adminSet.has(p.id)).map((p: any) => ({ email: p.email, nome: p.nome }));
}

async function sendViaResend(to: string[], subject: string, html: string, attachments: { filename: string; content: string }[]) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY ausente.");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from: SENDER, to, subject, html, attachments }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Resend ${res.status}: ${txt}`);
  }
  return res.json();
}

async function runReport(mode: "yesterday" | "today_and_yesterday") {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { fromUtc, toUtc } = manausDayRange(mode);
  const periodo = `${fmtManaus(fromUtc.toISOString(), false)} a ${fmtManaus(toUtc.toISOString(), false)} (America/Manaus)`;

  const rows = await fetchRowsBetween(supabaseAdmin, fromUtc.toISOString(), toUtc.toISOString());
  const recipients = await fetchGestorAdmins(supabaseAdmin);
  if (!recipients.length) {
    return { ok: false, message: "Nenhum admin do setor GESTOR cadastrado.", recipients: [], count: rows.length };
  }

  const xlsx = await buildXlsx(rows);
  const pdf = await buildPdf(rows, periodo);

  // sumário
  const ciclos = rows.filter((r: any) => r.tipo_acao === "check_out_2").length;
  const ag = new Set(rows.map((r: any) => r.user_id)).size;
  const html = `
    <div style="font-family:Arial,sans-serif;color:#0B1120">
      <h2 style="color:#0B1120;margin:0 0 8px">BA Elétrica — Relatório de Controle de Ronda</h2>
      <p style="color:#475569;margin:0 0 16px">Período: <strong>${periodo}</strong></p>
      <table style="border-collapse:collapse">
        <tr><td style="padding:6px 12px;background:#f1f5f9;border-radius:6px"><b>Eventos:</b> ${rows.length}</td></tr>
        <tr><td style="padding:6px 12px"><b>Ciclos concluídos:</b> ${ciclos}</td></tr>
        <tr><td style="padding:6px 12px"><b>Agentes ativos:</b> ${ag}</td></tr>
      </table>
      <p style="margin-top:16px">Anexos: <b>relatorio.xlsx</b> (detalhado) e <b>relatorio.pdf</b> (gerencial).</p>
    </div>`;

  const result = await sendViaResend(
    recipients.map((r) => r.email),
    `BA Elétrica — Controle de Ronda (${periodo})`,
    html,
    [
      { filename: `controle_ronda_${Date.now()}.xlsx`, content: toBase64(xlsx) },
      { filename: `controle_ronda_${Date.now()}.pdf`, content: toBase64(pdf) },
    ],
  );

  return { ok: true, recipients: recipients.map((r) => r.email), count: rows.length, id: (result as any)?.id };
}

export const sendTestReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // admin only
    const { data } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!data) throw new Error("Acesso negado: apenas administradores.");
    return runReport("today_and_yesterday");
  });

export const __runDailyReport = runReport;
