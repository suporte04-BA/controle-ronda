-- =====================================================
-- Recriar pg_cron para agendamento de relatórios
-- GitHub Actions faz SÓ keep-alive (banco não pausa)
-- pg_cron roda dentro do banco (mais confiável)
-- =====================================================

-- 1. Recriar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Limpar jobs antigos se existirem
DO $$
DECLARE
  job RECORD;
BEGIN
  FOR job IN SELECT jobid, jobname FROM cron.job
  LOOP
    BEGIN
      PERFORM cron.unschedule(job.jobid);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;

-- 3. Agendar relatório DIÁRIO: 11:00 UTC = 07:00 Manaus
SELECT cron.schedule(
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

-- 4. Agendar relatório MENSAL: 12:00 UTC = 08:00 Manaus, dia 1
SELECT cron.schedule(
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

-- 5. Verificar jobs criados
SELECT jobid, jobname, schedule, active FROM cron.job;
