import { format, toZonedTime } from "date-fns-tz";

export const MANAUS_TZ = "America/Manaus";

export function nowManaus(): Date {
  return toZonedTime(new Date(), MANAUS_TZ);
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

export const TIPO_ACAO_LABEL: Record<string, string> = {
  check_in: "Check-in",
  check_out_1: "Check-out 1",
  check_out_2: "Check-out 2",
};

export type TipoAcao = "check_in" | "check_out_1" | "check_out_2";

export function proximaAcao(acoesHoje: string[]): TipoAcao | null {
  const ciclo: TipoAcao[] = ["check_in", "check_out_1", "check_out_2"];
  const posicao = acoesHoje.length % ciclo.length;
  return ciclo[posicao];
}

export function acoesDoCicloAtual(acoesHoje: string[]): string[] {
  const resto = acoesHoje.length % 3;
  if (resto === 0) return [];
  return acoesHoje.slice(-resto);
}
