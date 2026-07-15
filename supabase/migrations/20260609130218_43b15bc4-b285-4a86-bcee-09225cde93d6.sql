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
      url := 'https://rdmbayprbfqbjhfqcasp.supabase.co/functions/v1/send-daily-report',
      headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkbWJheXByYmZxYmpoZnFjYXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODUwNDQsImV4cCI6MjA5NjU2MTA0NH0.GqxQya-VaOwqWM2_MFx4E3nWdzbXHtTlYKonMOw8Q_w"}'::jsonb,
      body := '{"modo":"diario"}'::jsonb
    );
    $job$
  );
END $$;