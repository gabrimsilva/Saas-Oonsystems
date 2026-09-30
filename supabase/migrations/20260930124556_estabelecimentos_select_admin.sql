-- ============================================================================
-- OONSYSTEMS SAAS: CORREÇÃO DA LEITURA DE ESTABELECIMENTOS PELO ADMIN GERAL
-- ============================================================================
-- Arquivo: 20260930124556_estabelecimentos_select_admin.sql
-- Descrição: estabelecimentos_select (camada_tenant) só liberava linhas
--            devolvidas por fn_estabelecimentos_do_usuario(). Essa função lê a
--            própria tabela estabelecimentos e não enxerga a linha que acabou
--            de ser inserida, então INSERT ... RETURNING (o que o app faz em
--            .insert().select()) falhava com "violates row-level security".
--            O admin geral passa a ler pela coluna tenant_id da própria linha.
-- Data: 30/09/2026
-- ============================================================================

DROP POLICY estabelecimentos_select ON public.estabelecimentos;

CREATE POLICY estabelecimentos_select ON public.estabelecimentos
    FOR SELECT TO authenticated
    USING (
        id IN (SELECT public.fn_estabelecimentos_do_usuario())
        OR (public.fn_is_admin_geral() AND tenant_id = public.fn_tenant_do_usuario())
    );

-- ============================================================================
-- FIM DO ARQUIVO
-- ============================================================================
