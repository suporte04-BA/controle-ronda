-- =====================================================
-- DESTRUIR pg_cron DEFINITIVAMENTE
-- Cron dos relatórios agora é via GitHub Actions.
-- pg_cron no free tier é instável (pausa 7 dias, jobs somem).
-- =====================================================

-- 1. Remover TODOS os jobs do pg_cron
DO $$
DECLARE
  job RECORD;
BEGIN
  FOR job IN SELECT jobid, jobname FROM cron.job
  LOOP
    BEGIN
      PERFORM cron.unschedule(job.jobid);
      RAISE NOTICE 'Removido job: % (id: %)', job.jobname, job.jobid;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Erro ao remover job %: %', job.jobname, SQLERRM;
    END;
  END LOOP;
END $$;

-- 2. Remover todas as tarefas agendadas
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    DELETE FROM cron.job;
    DELETE FROM cron.job_run_details;
    RAISE NOTICE 'Todas as tarefas pg_cron removidas.';
  END IF;
END $$;

-- 3. Revogar permissões do schema cron (previne recriação)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA cron FROM PUBLIC, anon, authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA cron FROM PUBLIC, anon, authenticated;
    REVOKE USAGE ON SCHEMA cron FROM PUBLIC, anon, authenticated;
    RAISE NOTICE 'Permissões do schema cron revogadas.';
  END IF;
END $$;
