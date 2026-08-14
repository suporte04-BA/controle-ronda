-- =====================================================
-- Corrigir pg_cron: jobs separados CD e LOJA
-- =====================================================

-- 1. Limpar jobs antigos
DO $$
DECLARE
  job RECORD;
BEGIN
  FOR job IN SELECT jobid, jobname FROM cron.job
    WHERE jobname IN ('ba-report-daily', 'ba-report-daily-cd', 'ba-report-daily-loja')
  LOOP
    BEGIN
      PERFORM cron.unschedule(job.jobid);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;

-- 2. Job DIÁRIO CD: 11:00 UTC = 07:00 Manaus
SELECT cron.schedule(
  'ba-report-daily-cd',
  '0 11 * * *',
  $job$
  SELECT net.http_post(
    url := 'https://rdmbayprbfqbjhfqcasp.supabase.co/functions/v1/send-daily-report',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkbWJheXByYmZxYmpoZnFjYXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODUwNDQsImV4cCI6MjA5NjU2MTA0NH0.GqxQya-VaOwqWM2_MFx4E3nWdzbXHtTlYKonMOw8Q_w"}'::jsonb,
    body := '{"modo":"diario","setor":"CD"}'::jsonb
  );
  $job$
);

-- 3. Job DIÁRIO LOJA: 11:02 UTC = 07:02 Manaus
SELECT cron.schedule(
  'ba-report-daily-loja',
  '2 11 * * *',
  $job$
  SELECT net.http_post(
    url := 'https://rdmbayprbfqbjhfqcasp.supabase.co/functions/v1/send-daily-report',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkbWJheXByYmZxYmpoZnFjYXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODUwNDQsImV4cCI6MjA5NjU2MTA0NH0.GqxQya-VaOwqWM2_MFx4E3nWdzbXHtTlYKonMOw8Q_w"}'::jsonb,
    body := '{"modo":"diario","setor":"LOJA"}'::jsonb
  );
  $job$
);

-- 4. Verificar jobs
SELECT jobid, jobname, schedule, active FROM cron.job ORDER BY jobid;
