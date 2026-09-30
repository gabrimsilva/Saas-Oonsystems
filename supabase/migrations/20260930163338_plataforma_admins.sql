-- ============================================================================
-- OONSYSTEMS SAAS: ADMINISTRADORES DA PLATAFORMA
-- ============================================================================
-- Arquivo: 20260930163338_plataforma_admins.sql
-- Descrição: Papel de quem opera o SaaS (a OonSystems), separado dos perfis
--            dos clientes. O admin da plataforma:
--              * vê e gerencia a tabela tenants (cadastrar, suspender, reativar);
--              * NÃO enxerga dados internos dos clientes (vendas, pedidos,
--                produtos...): as políticas das tabelas de domínio continuam
--                dependendo exclusivamente de usuarios_estabelecimento.
--            Quem é admin da plataforma é definido só por service_role/SQL.
-- Data: 30/09/2026
-- ============================================================================

CREATE TABLE public.plataforma_admins (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.plataforma_admins IS 'Usuários que administram a plataforma OonSystems (não são usuários de clientes)';

ALTER TABLE public.plataforma_admins ENABLE ROW LEVEL SECURITY;

-- O próprio usuário consegue saber se é admin da plataforma (usado no login)
CREATE POLICY plataforma_admins_select_proprio ON public.plataforma_admins
    FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.fn_is_plataforma_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.plataforma_admins pa WHERE pa.user_id = auth.uid()
    );
$$;

COMMENT ON FUNCTION public.fn_is_plataforma_admin() IS 'True se o usuário logado for administrador da plataforma';

REVOKE EXECUTE ON FUNCTION public.fn_is_plataforma_admin() FROM PUBLIC, anon;

-- ----------------------------------------------------------------------------
-- tenants: leitura e alteração (ex.: status) pela plataforma
-- ----------------------------------------------------------------------------
CREATE POLICY tenants_plataforma_select ON public.tenants
    FOR SELECT TO authenticated
    USING (public.fn_is_plataforma_admin());

CREATE POLICY tenants_plataforma_update ON public.tenants
    FOR UPDATE TO authenticated
    USING (public.fn_is_plataforma_admin())
    WITH CHECK (public.fn_is_plataforma_admin());

-- ----------------------------------------------------------------------------
-- Listagem de clientes com números agregados (sem expor dados internos)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.plataforma_listar_clientes()
RETURNS TABLE (
    id UUID,
    documento TEXT,
    tipo_pessoa CHAR(2),
    razao_social VARCHAR,
    nome_fantasia VARCHAR,
    slug VARCHAR,
    email VARCHAR,
    status VARCHAR,
    criado_em TIMESTAMPTZ,
    qtd_estabelecimentos BIGINT,
    qtd_usuarios BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT public.fn_is_plataforma_admin() THEN
        RAISE EXCEPTION 'Acesso restrito à administração da plataforma'
            USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT t.id, t.documento, t.tipo_pessoa, t.razao_social, t.nome_fantasia,
           t.slug, t.email, t.status, t.criado_em,
           (SELECT count(*) FROM public.estabelecimentos e WHERE e.tenant_id = t.id),
           (SELECT count(*) FROM public.usuarios_estabelecimento ue WHERE ue.tenant_id = t.id)
    FROM public.tenants t
    ORDER BY t.criado_em DESC;
END;
$$;

COMMENT ON FUNCTION public.plataforma_listar_clientes() IS 'Lista os clientes com totais de estabelecimentos e usuários (apenas admin da plataforma)';

REVOKE EXECUTE ON FUNCTION public.plataforma_listar_clientes() FROM PUBLIC, anon;

-- ============================================================================
-- FIM DO ARQUIVO
-- ============================================================================
