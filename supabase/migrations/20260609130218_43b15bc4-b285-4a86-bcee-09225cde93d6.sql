CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ba-report-daily') THEN
    PERFORM cron.unschedule('ba-report-daily');
  END IF;
  PERFORM cron.schedule(
    'ba-report-daily',
    '0 11 * * *',
    $job$
    SELECT net.http_post(
      url := 'https://hhrlgmqbcjzevpvmqisr.supabase.co/functions/v1/send-daily-report',
      headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhocmxnbXFiY2p6ZXZwdm1xaXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMTIxOTUsImV4cCI6MjA5NTg4ODE5NX0.R2sIvaFvBZbX-zgp5XSBJvcY92AtOV9TCCA2tKJEq_k"}'::jsonb,
      body := '{"modo":"diario"}'::jsonb
    );
    $job$
  );
END $$;