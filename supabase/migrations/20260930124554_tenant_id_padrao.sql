-- ============================================================================
-- OONSYSTEMS SAAS: tenant_id PREENCHIDO PELO BANCO
-- ============================================================================
-- Arquivo: 20260930124554_tenant_id_padrao.sql
-- Descrição: O frontend herdado não conhece tenants. Em vez de cada
--            tela enviar tenant_id, o banco assume o tenant de quem está
--            logado. As políticas RLS continuam exigindo que o valor seja o
--            tenant do usuário (quem informar outro valor é barrado).
--            Inserções com service_role (auth.uid() nulo) precisam informar
--            tenant_id explicitamente — o default resulta em NULL e a coluna
--            é NOT NULL.
-- Data: 30/09/2026
-- ============================================================================

ALTER TABLE public.estabelecimentos
    ALTER COLUMN tenant_id SET DEFAULT public.fn_tenant_do_usuario();

ALTER TABLE public.usuarios_estabelecimento
    ALTER COLUMN tenant_id SET DEFAULT public.fn_tenant_do_usuario();

-- ============================================================================
-- FIM DO ARQUIVO
-- ============================================================================
