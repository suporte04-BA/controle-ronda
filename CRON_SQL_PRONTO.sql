-- BA Elétrica — Agendamento de relatórios de Controle de Ronda
-- Executar uma única vez no SQL Editor do Supabase
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ══════════════════════════════════════════════════════════════════
-- RELATÓRIO DIÁRIO — Todos os dias às 07:00 America/Manaus
-- ══════════════════════════════════════════════════════════════════

-- Remove agendamento anterior (se existir) para evitar duplicidade
SELECT cron.unschedule('ba-report-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ba-report-daily');

-- Agenda para 11:00 UTC = 07:00 America/Manaus, todos os dias
SELECT cron.schedule(
  'ba-report-daily',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://rdmbayprbfqbjhfqcasp.supabase.co/functions/v1/send-daily-report',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkbWJheXByYmZxYmpoZnFjYXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODUwNDQsImV4cCI6MjA5NjU2MTA0NH0.GqxQya-VaOwqWM2_MFx4E3nWdzbXHtTlYKonMOw8Q_w"}'::jsonb,
    body := '{"modo":"diario"}'::jsonb
  );
  $$
);

-- ══════════════════════════════════════════════════════════════════
-- RELATÓRIO MENSAL — Dia 1 de cada mês às 08:00 America/Manaus
-- ══════════════════════════════════════════════════════════════════

-- Remove agendamento anterior (se existir) para evitar duplicidade
SELECT cron.unschedule('ba-report-monthly')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ba-report-monthly');

-- Agenda para 12:00 UTC = 08:00 America/Manaus, dia 1 de cada mês
SELECT cron.schedule(
  'ba-report-monthly',
  '0 12 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://rdmbayprbfqbjhfqcasp.supabase.co/functions/v1/send-monthly-report',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkbWJheXByYmZxYmpoZnFjYXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODUwNDQsImV4cCI6MjA5NjU2MTA0NH0.GqxQya-VaOwqWM2_MFx4E3nWdzbXHtTlYKonMOw8Q_w"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);