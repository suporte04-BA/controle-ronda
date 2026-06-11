import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://rdmbayprbfqbjhfqcasp.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

const REPORT_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/send-daily-report`;

export async function sendTestReport() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(REPORT_FUNCTION_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ modo: "teste" }),
  });

  const text = await response.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { data = { error: text }; }

  if (!response.ok || data?.ok === false) {
    const detail = data?.error ?? data?.message ?? `Falha HTTP ${response.status}`;
    throw new Error(detail);
  }

  return data as {
    ok: boolean;
    message?: string;
    recipients?: string[];
    count?: number;
    periodo?: string;
    error?: string;
  };
}
