import { format, toZonedTime } from "date-fns-tz";

export const MANAUS_TZ = "America/Manaus";
export const MANAUS_UTC_OFFSET = "-04:00";

export function nowManaus(): Date {
  return toZonedTime(new Date(), MANAUS_TZ);
}

/**
 * Converte data (AAAA-MM-DD) para ISO com offset de Manaus.
 * Usado em queries Supabase que filtram por horario_acao.
 * Ex: toManausISO("2026-08-19", "00:00:00") → "2026-08-19T00:00:00-04:00"
 */
export function toManausISO(dateStr: string, time: "00:00:00" | "23:59:59" = "00:00:00"): string {
  return `${dateStr}T${time}${MANAUS_UTC_OFFSET}`;
}

export function formatManaus(date: Date | string, pattern = "dd/MM/yyyy HH:mm:ss"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(toZonedTime(d, MANAUS_TZ), pattern, { timeZone: MANAUS_TZ });
}

export function formatHora(date: Date | string): string {
  return formatManaus(date, "HH:mm:ss");
}

export function formatData(date: Date | string): string {
  return formatManaus(date, "dd/MM/yyyy");
}

export function isSameDayManaus(a: Date | string, b: Date | string): boolean {
  return formatData(a) === formatData(b);
}

// Ordem completa de uma ronda: Início + 8 fotos do meio + Fim
export const CICLO_RONDA: TipoAcao[] = [
  "check_in",
  "meio1",
  "meio2",
  "meio3",
  "meio4",
  "meio5",
  "meio6",
  "meio7",
  "meio8",
  "check_out_2",
];

export const TIPO_ACAO_LABEL: Record<string, string> = {
  check_in: "Início de Ronda",
  meio1: "Meio 1 da Ronda",
  meio2: "Meio 2 da Ronda",
  meio3: "Meio 3 da Ronda",
  meio4: "Meio 4 da Ronda",
  meio5: "Meio 5 da Ronda",
  meio6: "Meio 6 da Ronda",
  meio7: "Meio 7 da Ronda",
  meio8: "Meio 8 da Ronda",
  check_out_1: "Check-out 1 da Ronda",
  check_out_2: "Fim de Ronda",
};

export const TIPO_ACAO_ORDEM: Record<string, number> = {
  check_in: 0,
  meio1: 1,
  meio2: 2,
  meio3: 3,
  meio4: 4,
  meio5: 5,
  meio6: 6,
  meio7: 7,
  meio8: 8,
  check_out_2: 9,
  check_out_1: 10,
};

export type TipoAcao =
  | "check_in"
  | "meio1"
  | "meio2"
  | "meio3"
  | "meio4"
  | "meio5"
  | "meio6"
  | "meio7"
  | "meio8"
  | "check_out_1"
  | "check_out_2";

export function proximaAcao(acoesHoje: string[]): TipoAcao | null {
  const posicao = acoesHoje.length % CICLO_RONDA.length;
  return CICLO_RONDA[posicao];
}

export function acoesDoCicloAtual(acoesHoje: string[]): string[] {
  const resto = acoesHoje.length % CICLO_RONDA.length;
  if (resto === 0) return [];
  return acoesHoje.slice(-resto);
}

/** @deprecated Utilizado apenas internamente se necessário no futuro */
export function contarCiclosConcluidos(tipos: string[]): number {
  return tipos.filter((t) => t === "check_out_2").length;
}
