-- ============================================================================
-- OONSYSTEMS SAAS: RESTRINGIR EXECUÇÃO DE FUNÇÕES SECURITY DEFINER
-- ============================================================================
-- Arquivo: 20260929210528_revogar_execute_funcoes.sql
-- Descrição: Funções SECURITY DEFINER no schema public ficam expostas em
--            /rest/v1/rpc/<nome>. Aqui cada uma fica só com quem precisa dela.
-- Data: 29/09/2026
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Funções de trigger: ninguém precisa chamá-las diretamente.
--    (O privilégio EXECUTE só é checado no CREATE TRIGGER, não no disparo.)
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION
    public.atualizar_timestamp(),
    public.sync_pedido_status_to_historico(),
    public.update_comandas_updated_at(),
    public.update_tamanhos_updated_at(),
    public.update_updated_at_column()
FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. Funções de apoio à RLS: as políticas de "authenticated" as executam em
--    nome do usuário, então ele precisa de EXECUTE. Visitantes (anon) só usam
--    fn_estabelecimento_ativo, nas políticas públicas.
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION
    public.fn_estabelecimentos_do_usuario(),
    public.fn_is_admin_estabelecimento(),
    public.fn_is_admin_geral(),
    public.fn_tenant_do_usuario(),
    public.fn_usuario_no_meu_tenant(UUID)
FROM PUBLIC, anon;

-- ============================================================================
-- FIM DO ARQUIVO
-- ============================================================================
