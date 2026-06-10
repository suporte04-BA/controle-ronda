import { supabase } from "@/integrations/supabase/client";

const PRODUCTION_PROJECT_REF = "rdmbayprbfqbjhfqcasp";
const PRODUCTION_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkbWJheXByYmZxYmpoZnFjYXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODUwNDQsImV4cCI6MjA5NjU2MTA0NH0.GqxQya-VaOwqWM2_MFx4E3nWdzbXHtTlYKonMOw8Q_w";

const REPORT_FUNCTION_URL = `https://${PRODUCTION_PROJECT_REF}.supabase.co/functions/v1/send-daily-report`;

export async function sendTestReport() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const response = await fetch(REPORT_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: PRODUCTION_ANON_KEY,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
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
