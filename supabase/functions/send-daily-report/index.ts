// Supabase Edge Function: send-daily-report
// Deno runtime. Invoked via supabase.functions.invoke('send-daily-report', { body: { modo } }).
// Body: { modo: "teste" | "diario" }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FALLBACK_SUPABASE_URL = "https://rdmbayprbfqbjhfqcasp.supabase.co";
const SENDER = Deno.env.get("REPORT_FROM_EMAIL") || "BA Elétrica <relatorio@baeletrica.com.br>";
const REPLY_TO = Deno.env.get("REPORT_REPLY_TO") || "suporte04@baeletrica.com";
const MANAUS_OFFSET_MS = -4 * 60 * 60 * 1000;
const CORPORATE_DOMAINS = ["baeletrica.com", "baeletrica.com.br"];

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

function rangeFor(modo: "teste" | "diario") {
  const now = new Date();
  const m = toManaus(now);
  const startTodayManaus = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), m.getUTCDate(), 0, 0, 0));
  const startYdayManaus = new Date(startTodayManaus.getTime() - 86400000);
  const endTodayManaus = new Date(startTodayManaus.getTime() + 86400000 - 1);
  const toUtc = (d: Date) => new Date(d.getTime() - MANAUS_OFFSET_MS);
  if (modo === "diario") {
    return { fromUtc: toUtc(startYdayManaus), toUtc: toUtc(new Date(startTodayManaus.getTime() - 1)) };
  }
  return { fromUtc: toUtc(startYdayManaus), toUtc: toUtc(endTodayManaus) };
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
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontB = await pdf.embedFont(StandardFonts.HelveticaBold);

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

  draw("BA Eletrica - Relatorio de Controle de Ronda", 40, 16, true);
  newLine(20);
  draw(`Periodo: ${periodo}`, 40, 10);
  newLine();
  draw(`Total de eventos: ${rows.length}   |   Ciclos concluidos: ${Array.from(porUser.values()).reduce((s, v) => s + v.ciclos, 0)}`, 40, 10);
  newLine(22);

  draw("Ciclos concluidos por setor", 40, 12, true, rgb(0.85, 0.15, 0.15));
  newLine(18);
  Array.from(porSetor.entries()).sort((a, b) => b[1] - a[1]).forEach(([s, n]) => {
    draw(`- ${s}`, 50, 10); draw(`${n}`, 500, 10, true);
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
    return {
      ...r,
      nome: p?.nome ?? "—",
      email: p?.email ?? "",
      setor: p?.setor_id ? setMap.get(p.setor_id) ?? null : null,
    };
  });
}

async function fetchGestorAdmins(admin: any): Promise<{ email: string; nome: string }[]> {
  const { data: setor } = await admin.from("setores").select("id,nome").ilike("nome", "gestor").maybeSingle();
  if (!setor) return [];
  const { data: profs } = await admin.from("profiles").select("id,nome,email").eq("setor_id", setor.id);
  if (!profs?.length) return [];
  const ids = profs.map((p: any) => p.id);
  const { data: roles } = await admin.from("user_roles").select("user_id").eq("role", "admin").in("user_id", ids);
  const adminSet = new Set((roles ?? []).map((r: any) => r.user_id));
  const seen = new Set<string>();
  return profs
    .filter((p: any) => adminSet.has(p.id))
    .map((p: any) => ({ email: normalizeEmail(p.email), nome: p.nome }))
    .filter((p: any): p is { email: string; nome: string } => Boolean(p.email) && isCorporateEmail(p.email))
    .filter((p) => {
      if (seen.has(p.email)) return false;
      seen.add(p.email);
      return true;
    });
}

async function sendResend(to: string[], subject: string, html: string, attachments: { filename: string; content: string }[]) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) throw new Error("RESEND_API_KEY não configurada no ambiente da função.");

  const payload = { from: SENDER, to, reply_to: REPLY_TO, subject, html, attachments };
  console.log("Resend request", { from: SENDER, reply_to: REPLY_TO, to, subject, attachments: attachments.map((a) => a.filename) });
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  console.log("Resend raw response", { status: res.status, body: text });
  if (!res.ok) {
    console.error("Resend delivery failed", { status: res.status, body: text });
    throw new Error(`Resend ${res.status}: ${text}`);
  }
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const modo: "teste" | "diario" = body?.modo === "diario" ? "diario" : "teste";

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || FALLBACK_SUPABASE_URL;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    console.log("send-daily-report start", { modo, supabaseUrl: SUPABASE_URL, sender: SENDER, replyTo: REPLY_TO });

    const { fromUtc, toUtc } = rangeFor(modo);
    const periodo = `${fmtManaus(fromUtc.toISOString(), false)} a ${fmtManaus(toUtc.toISOString(), false)} (America/Manaus)`;

    const rows = await fetchRows(admin, fromUtc.toISOString(), toUtc.toISOString());
    const recipients = await fetchGestorAdmins(admin);
    if (!recipients.length) {
      return new Response(JSON.stringify({ ok: false, message: "Nenhum admin do setor GESTOR cadastrado.", recipients: [], count: rows.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    const [xlsx, pdf] = await Promise.all([buildXlsx(rows), buildPdf(rows, periodo)]);

    const ciclos = rows.filter((r: any) => r.tipo_acao === "check_out_2").length;
    const ag = new Set(rows.map((r: any) => r.user_id)).size;
    const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;color:#0B1120;background-color:#FFFFFF"><tr><td style="padding:24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;max-width:640px"><tr><td style="font-size:20px;font-weight:bold;line-height:28px;padding:0 0 8px 0">BA Elétrica — Relatório de Controle de Ronda</td></tr><tr><td style="font-size:14px;line-height:22px;color:#475569;padding:0 0 16px 0">Período: <strong>${periodo}</strong></td></tr><tr><td style="font-size:14px;line-height:22px;padding:0 0 12px 0"><strong>Eventos:</strong> ${rows.length} &nbsp;|&nbsp; <strong>Ciclos concluídos:</strong> ${ciclos} &nbsp;|&nbsp; <strong>Agentes ativos:</strong> ${ag}</td></tr><tr><td style="font-size:14px;line-height:22px;padding:0">Anexos: <strong>relatorio.xlsx</strong> (detalhado) e <strong>relatorio.pdf</strong> (gerencial).</td></tr></table></td></tr></table>`;

    const result = await sendResend(
      recipients.map((r) => r.email),
      `BA Elétrica — Controle de Ronda (${periodo})`,
      html,
      [
        { filename: `controle_ronda_${Date.now()}.xlsx`, content: toBase64(xlsx) },
        { filename: `controle_ronda_${Date.now()}.pdf`, content: toBase64(pdf) },
      ],
    );

    return new Response(JSON.stringify({ ok: true, modo, periodo, count: rows.length, recipients: recipients.map((r) => r.email), id: (result as any)?.id ?? null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (e: any) {
    console.error("send-daily-report error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});
