export type Preset = "hoje" | "ontem" | "semana" | "semana_passada" | "mes" | "ultimos7" | "custom";

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function toInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function fromInput(s: string) {
  return new Date(s + "T00:00:00");
}

export function rangeFromPreset(p: Preset): { from: string; to: string } | null {
  const now = new Date();
  if (p === "hoje") return { from: toInput(now), to: toInput(now) };
  if (p === "ontem") {
    const y = addDays(now, -1);
    return { from: toInput(y), to: toInput(y) };
  }
  if (p === "ultimos7") return { from: toInput(addDays(now, -6)), to: toInput(now) };
  if (p === "semana" || p === "semana_passada") {
    const dow = now.getDay();
    const diffToMon = (dow + 6) % 7;
    const monThis = addDays(now, -diffToMon);
    if (p === "semana") return { from: toInput(monThis), to: toInput(addDays(monThis, 6)) };
    const monLast = addDays(monThis, -7);
    return { from: toInput(monLast), to: toInput(addDays(monLast, 6)) };
  }
  if (p === "mes") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: toInput(first), to: toInput(last) };
  }
  return null;
}
