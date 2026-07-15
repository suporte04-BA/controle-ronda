CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ba-report-monthly') THEN
    PERFORM cron.unschedule('ba-report-monthly');
  END IF;
  PERFORM cron.schedule(
    'ba-report-monthly',
    '0 12 1 * *',
    $job$
    SELECT net.http_post(
      url := 'https://rdmbayprbfqbjhfqcasp.supabase.co/functions/v1/send-monthly-report',
      headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkbWJheXByYmZxYmpoZnFjYXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODUwNDQsImV4cCI6MjA5NjU2MTA0NH0.GqxQya-VaOwqWM2_MFx4E3nWdzbXHtTlYKonMOw8Q_w"}'::jsonb,
      body := '{}'::jsonb
    );
    $job$
  );
END $$;
