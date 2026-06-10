import { supabase } from "@/integrations/supabase/client";

export async function sendTestReport() {
  const { data, error } = await supabase.functions.invoke("send-daily-report", {
    body: { modo: "teste" },
  });

  if (error) {
    throw new Error(error.message ?? "Erro ao invocar Edge Function");
  }

  if (!data?.ok) {
    const detail = data?.error ?? data?.message ?? "Falha desconhecida na Edge Function";
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
