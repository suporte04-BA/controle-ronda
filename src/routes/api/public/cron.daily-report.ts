import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cron/daily-report")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Autenticação simples via apikey (publishable). pg_cron envia o header.
        const apikey = request.headers.get("apikey");
        if (apikey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { __runDailyReport } = await import("@/lib/report.functions");
        try {
          const out = await __runDailyReport("yesterday");
          return Response.json(out);
        } catch (e: any) {
          return Response.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
        }
      },
    },
  },
});
