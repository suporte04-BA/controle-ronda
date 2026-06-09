import { supabase } from "@/integrations/supabase/client";

export async function sendTestReport() {
  const { data, error } = await supabase.functions.invoke("send-daily-report", {
    body: { modo: "teste" },
  });
  if (error) {
    // Tenta extrair mensagem detalhada do corpo da resposta da Edge Function
    let detail = error.message ?? "Erro desconhecido";
    try {
      const ctx: any = (error as any).context;
      if (ctx && typeof ctx.json === "function") {
        const j = await ctx.json();
        if (j?.error) detail = j.error;
        else if (j?.message) detail = j.message;
      }
    } catch { /* ignore */ }
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
