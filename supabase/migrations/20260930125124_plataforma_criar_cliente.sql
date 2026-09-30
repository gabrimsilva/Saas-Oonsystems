-- ============================================================================
-- OONSYSTEMS SAAS: ONBOARDING DE CLIENTE PELA PLATAFORMA
-- ============================================================================
-- Arquivo: 20260930125124_plataforma_criar_cliente.sql
-- Descrição: Cria, numa única transação, o tenant (CPF/CNPJ), o primeiro
--            estabelecimento e o vínculo do administrador geral.
--            O login do administrador (auth.users) é criado antes, pelo painel
--            do Supabase ou pela Admin API; aqui ele só é vinculado.
--            Uso exclusivo da plataforma: sem EXECUTE para anon/authenticated.
-- Data: 30/09/2026
-- ============================================================================

CREATE OR REPLACE FUNCTION public.plataforma_criar_cliente(
    p_documento TEXT,
    p_razao_social TEXT,
    p_slug TEXT,
    p_admin_email TEXT,
    p_admin_nome TEXT,
    p_estabelecimento_nome TEXT,
    p_estabelecimento_slug TEXT,
    p_nome_fantasia TEXT DEFAULT NULL,
    p_cor_tema TEXT DEFAULT '#111827',
    p_status TEXT DEFAULT 'trial'
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

    INSERT INTO public.tenants (documento, razao_social, nome_fantasia, slug, email, status)
    VALUES (p_documento, p_razao_social, p_nome_fantasia, p_slug, lower(btrim(p_admin_email)), p_status)
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
    'Onboarding (uso da plataforma): cria tenant + 1º estabelecimento + vínculo do admin geral a um login já existente';

REVOKE EXECUTE ON FUNCTION public.plataforma_criar_cliente FROM PUBLIC, anon, authenticated;

-- ============================================================================
-- FIM DO ARQUIVO
-- ============================================================================
