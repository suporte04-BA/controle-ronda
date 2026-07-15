-- Estende o ciclo da ronda: Início, 7 fotos do meio, Fim
-- e adiciona campo de observações (ocorrências) por ciclo.

ALTER TYPE public.tipo_acao_ponto ADD VALUE IF NOT EXISTS 'meio1';
ALTER TYPE public.tipo_acao_ponto ADD VALUE IF NOT EXISTS 'meio2';
ALTER TYPE public.tipo_acao_ponto ADD VALUE IF NOT EXISTS 'meio3';
ALTER TYPE public.tipo_acao_ponto ADD VALUE IF NOT EXISTS 'meio4';
ALTER TYPE public.tipo_acao_ponto ADD VALUE IF NOT EXISTS 'meio5';
ALTER TYPE public.tipo_acao_ponto ADD VALUE IF NOT EXISTS 'meio6';
ALTER TYPE public.tipo_acao_ponto ADD VALUE IF NOT EXISTS 'meio7';
ALTER TYPE public.tipo_acao_ponto ADD VALUE IF NOT EXISTS 'meio8';

ALTER TABLE public.registros_ponto ADD COLUMN IF NOT EXISTS observacoes TEXT;
