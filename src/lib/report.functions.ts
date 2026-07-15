const REPORT_FUNCTION_URL = "https://rdmbayprbfqbjhfqcasp.supabase.co/functions/v1/send-daily-report";
const REPORT_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkbWJheXByYmZxYmpoZnFjYXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODUwNDQsImV4cCI6MjA5NjU2MTA0NH0.GqxQya-VaOwqWM2_MFx4E3nWdzbXHtTlYKonMOw8Q_w";

async function parseReportResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

export async function sendTestReport() {
  const response = await fetch(REPORT_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: REPORT_ANON_KEY,
      Authorization: `Bearer ${REPORT_ANON_KEY}`,
    },
    body: JSON.stringify({ modo: "teste" }),
  });

  const data = await parseReportResponse(response);
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
