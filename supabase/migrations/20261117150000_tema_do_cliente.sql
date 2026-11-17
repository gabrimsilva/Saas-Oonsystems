-- ============================================================================
-- OONSYSTEMS SAAS: TEMA DO PAINEL POR CLIENTE
-- ============================================================================
-- Cada cliente (tenant) escolhe um dos temas pré-definidos do painel; vale para
-- todas as lojas dele. O catálogo público não usa este tema.
--
--   * tenants.tema: id do tema (padrão 'azul').
--   * definir_tema_sistema: grava o tema do cliente do usuário logado; só o
--     administrador geral pode chamar (o usuário não altera tenants direto).
-- A cor por estabelecimento (estabelecimentos.cor_tema) deixa de ser usada no
-- painel; a coluna fica para não perder dados.
-- ============================================================================

ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS tema VARCHAR(20) NOT NULL DEFAULT 'azul';

ALTER TABLE public.tenants
    ADD CONSTRAINT tenants_tema_valido CHECK (tema IN ('azul', 'marinho', 'petroleo', 'grafite', 'ameixa'));

COMMENT ON COLUMN public.tenants.tema IS 'Tema do painel do cliente (azul, marinho, petroleo, grafite, ameixa)';

CREATE OR REPLACE FUNCTION public.definir_tema_sistema(p_tema VARCHAR)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_tenant UUID := public.fn_tenant_do_usuario();
BEGIN
    IF v_tenant IS NULL OR NOT public.fn_is_admin_geral() THEN
        RAISE EXCEPTION 'Só o administrador geral pode mudar o tema do sistema' USING ERRCODE = '42501';
    END IF;
    IF p_tema NOT IN ('azul', 'marinho', 'petroleo', 'grafite', 'ameixa') THEN
        RAISE EXCEPTION 'Tema inválido';
    END IF;

    UPDATE public.tenants SET tema = p_tema WHERE id = v_tenant;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.definir_tema_sistema(VARCHAR) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.definir_tema_sistema(VARCHAR) TO authenticated;
