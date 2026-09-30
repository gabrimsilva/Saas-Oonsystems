-- ============================================================================
-- OONSYSTEMS SAAS: PERÍODO DE TESTE (TRIAL) E ORIGEM DO CADASTRO
-- ============================================================================
-- Arquivo: 20260930180000_trial_e_origem.sql
-- Descrição:
--   * tenants.trial_ate: fim do período de teste. Um tenant em 'trial' com
--     trial_ate vencido perde o acesso na hora (sem depender de job agendado):
--     a regra fica em fn_tenant_liberado, usada pelas funções de RLS.
--   * tenants.origem: 'plataforma' (cadastrado pela OonSystems) ou 'site'
--     (autocadastro em /cadastro).
--   * plataforma_criar_cliente passa a gravar origem e prazo do teste.
--   * plataforma_listar_clientes passa a devolver trial_ate e origem.
-- Data: 30/09/2026
-- ============================================================================

ALTER TABLE public.tenants
    ADD COLUMN trial_ate TIMESTAMPTZ,
    ADD COLUMN origem VARCHAR(20) NOT NULL DEFAULT 'plataforma',
    ADD CONSTRAINT tenants_origem_valida CHECK (origem IN ('plataforma', 'site'));

COMMENT ON COLUMN public.tenants.trial_ate IS 'Fim do período de teste; após essa data um tenant em trial perde o acesso';
COMMENT ON COLUMN public.tenants.origem IS 'Como o cliente foi cadastrado: plataforma (OonSystems) ou site (autocadastro)';

-- ----------------------------------------------------------------------------
-- Regra única de "tenant pode usar o sistema"
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_tenant_liberado(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.tenants t
        WHERE t.id = p_tenant_id
          AND (
                t.status = 'ativo'
             OR (t.status = 'trial' AND (t.trial_ate IS NULL OR t.trial_ate > now()))
          )
    );
$$;

COMMENT ON FUNCTION public.fn_tenant_liberado(UUID) IS 'True se o tenant está ativo ou em teste dentro do prazo';

REVOKE EXECUTE ON FUNCTION public.fn_tenant_liberado(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.fn_tenant_do_usuario()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT ue.tenant_id
    FROM public.usuarios_estabelecimento ue
    WHERE ue.user_id = auth.uid()
      AND ue.ativo = true
      AND public.fn_tenant_liberado(ue.tenant_id);
$$;

CREATE OR REPLACE FUNCTION public.fn_estabelecimento_ativo(p_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.estabelecimentos e
        WHERE e.id = p_id
          AND e.ativo = true
          AND public.fn_tenant_liberado(e.tenant_id)
    );
$$;

-- ----------------------------------------------------------------------------
-- Onboarding com origem e prazo de teste
-- ----------------------------------------------------------------------------
DROP FUNCTION public.plataforma_criar_cliente(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE FUNCTION public.plataforma_criar_cliente(
    p_documento TEXT,
    p_razao_social TEXT,
    p_slug TEXT,
    p_admin_email TEXT,
    p_admin_nome TEXT,
    p_estabelecimento_nome TEXT,
    p_estabelecimento_slug TEXT,
    p_nome_fantasia TEXT DEFAULT NULL,
    p_cor_tema TEXT DEFAULT '#111827',
    p_status TEXT DEFAULT 'trial',
    p_origem TEXT DEFAULT 'plataforma',
    p_dias_trial INT DEFAULT 14
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_tenant_id UUID;
    v_estab_id UUID;
BEGIN
    SELECT u.id INTO v_user_id
    FROM auth.users u
    WHERE lower(u.email) = lower(btrim(p_admin_email));

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Login % não existe no Auth. Crie o usuário antes (Authentication > Add user).', p_admin_email;
    END IF;

    IF EXISTS (SELECT 1 FROM public.usuarios_estabelecimento ue WHERE ue.user_id = v_user_id) THEN
        RAISE EXCEPTION 'O login % já está vinculado a um cliente.', p_admin_email;
    END IF;

    INSERT INTO public.tenants (documento, razao_social, nome_fantasia, slug, email, status, origem, trial_ate)
    VALUES (
        p_documento, p_razao_social, p_nome_fantasia, p_slug, lower(btrim(p_admin_email)),
        p_status, p_origem,
        CASE WHEN p_status = 'trial' THEN now() + make_interval(days => p_dias_trial) END
    )
    RETURNING id INTO v_tenant_id;

    INSERT INTO public.estabelecimentos (tenant_id, nome, slug, cor_tema)
    VALUES (v_tenant_id, p_estabelecimento_nome, p_estabelecimento_slug, p_cor_tema)
    RETURNING id INTO v_estab_id;

    INSERT INTO public.usuarios_estabelecimento
        (user_id, tenant_id, nome, email, perfil, estabelecimento_id, ultimo_estabelecimento_id)
    VALUES
        (v_user_id, v_tenant_id, p_admin_nome, lower(btrim(p_admin_email)),
         'administrador_geral', NULL, v_estab_id);

    RETURN v_tenant_id;
END;
$$;

COMMENT ON FUNCTION public.plataforma_criar_cliente IS
    'Onboarding (uso da plataforma/Edge Functions): cria tenant + 1º estabelecimento + vínculo do admin geral a um login já existente';

REVOKE EXECUTE ON FUNCTION public.plataforma_criar_cliente FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Listagem da plataforma com prazo do teste e origem
-- ----------------------------------------------------------------------------
DROP FUNCTION public.plataforma_listar_clientes();

CREATE FUNCTION public.plataforma_listar_clientes()
RETURNS TABLE (
    id UUID,
    documento TEXT,
    tipo_pessoa CHAR(2),
    razao_social VARCHAR,
    nome_fantasia VARCHAR,
    slug VARCHAR,
    email VARCHAR,
    status VARCHAR,
    origem VARCHAR,
    trial_ate TIMESTAMPTZ,
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
           t.slug, t.email, t.status, t.origem, t.trial_ate, t.criado_em,
           (SELECT count(*) FROM public.estabelecimentos e WHERE e.tenant_id = t.id),
           (SELECT count(*) FROM public.usuarios_estabelecimento ue WHERE ue.tenant_id = t.id)
    FROM public.tenants t
    ORDER BY t.criado_em DESC;
END;
$$;

COMMENT ON FUNCTION public.plataforma_listar_clientes() IS 'Lista os clientes com prazo de teste, origem e totais (apenas admin da plataforma)';

REVOKE EXECUTE ON FUNCTION public.plataforma_listar_clientes() FROM PUBLIC, anon;

-- ============================================================================
-- FIM DO ARQUIVO
-- ============================================================================
