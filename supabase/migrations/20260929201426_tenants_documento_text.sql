-- ============================================================================
-- OONSYSTEMS SAAS: CORREÇÃO DO TIPO DE tenants.documento
-- ============================================================================
-- Arquivo: 20260929201426_tenants_documento_text.sql
-- Descrição: VARCHAR(14) recusava documentos com máscara (ex: 18 caracteres
--            em "12.ABC.345/01DE-35"), pois o limite é checado ANTES da trigger
--            que remove a pontuação. A coluna passa a ser TEXT; o tamanho final
--            (11 ou 14) continua garantido por tenants_documento_valido.
-- Data: 29/09/2026
-- ============================================================================

-- tipo_pessoa é gerada a partir de documento: precisa sair antes do ALTER TYPE
ALTER TABLE public.tenants DROP COLUMN tipo_pessoa;

ALTER TABLE public.tenants ALTER COLUMN documento TYPE TEXT;

ALTER TABLE public.tenants ADD COLUMN tipo_pessoa CHAR(2) GENERATED ALWAYS AS (
    CASE WHEN length(documento) = 11 THEN 'PF' ELSE 'PJ' END
) STORED;

COMMENT ON COLUMN public.tenants.tipo_pessoa IS 'PF (CPF) ou PJ (CNPJ), derivado automaticamente do documento';

-- ============================================================================
-- FIM DO ARQUIVO
-- ============================================================================
