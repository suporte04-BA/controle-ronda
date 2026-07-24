// Edge Function: health
// Keep-alive + health check. Chamar via GET a qualquer momento.
// Usado pelo cron-job.org pra manter o projeto Supabase ativo.

Deno.serve(async (_req) => {
  return new Response(
    JSON.stringify({ ok: true, timestamp: new Date().toISOString() }),
    { headers: { "Content-Type": "application/json" } },
  );
});
