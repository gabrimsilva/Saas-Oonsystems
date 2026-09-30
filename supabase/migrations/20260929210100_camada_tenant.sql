-- ============================================================================
-- OONSYSTEMS SAAS: CAMADA MULTI-TENANT
-- ============================================================================
-- Arquivo: 20260929210100_camada_tenant.sql
-- Descrição: Encaixa o schema herdado do LIRI (multi-estabelecimento) sob a
--            tabela tenants. Hierarquia final:
--
--              tenants (CPF/CNPJ) -> estabelecimentos -> dados de domínio
--
--            O isolamento das tabelas de domínio continua passando por
--            fn_estabelecimentos_do_usuario(); ela passa a devolver apenas
--            estabelecimentos do tenant do usuário (e só com o tenant ativo).
-- Data: 29/09/2026
-- ============================================================================
-- Semântica dos perfis (usuarios_estabelecimento.perfil) no SaaS:
--   * administrador_geral           -> administra TODOS os estabelecimentos
--                                      do SEU tenant (antes: do banco inteiro)
--   * administrador_estabelecimento -> administra o seu estabelecimento
--   * operador                      -> opera o seu estabelecimento
-- A administração da plataforma (criar tenants etc.) é feita com service_role.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Vínculo com tenants
-- ----------------------------------------------------------------------------
ALTER TABLE public.estabelecimentos
    ADD COLUMN tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT;

-- Nome passa a ser único por tenant (dois clientes podem ter uma "Matriz").
-- O slug continua único global: é a rota pública do estabelecimento.
ALTER TABLE public.estabelecimentos DROP CONSTRAINT estabelecimentos_nome_unico;
ALTER TABLE public.estabelecimentos
    ADD CONSTRAINT estabelecimentos_nome_unico_por_tenant UNIQUE (tenant_id, nome);

-- Alvo das FKs compostas abaixo
ALTER TABLE public.estabelecimentos
    ADD CONSTRAINT estabelecimentos_id_tenant_unico UNIQUE (id, tenant_id);

CREATE INDEX idx_estabelecimentos_tenant ON public.estabelecimentos (tenant_id);

COMMENT ON COLUMN public.estabelecimentos.tenant_id IS 'Cliente (tenant) dono do estabelecimento';

ALTER TABLE public.usuarios_estabelecimento
    ADD COLUMN tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT;

-- Garante no banco que estabelecimento_id / ultimo_estabelecimento_id
-- pertencem ao mesmo tenant do usuário (MATCH SIMPLE: NULL é permitido).
ALTER TABLE public.usuarios_estabelecimento
    ADD CONSTRAINT usuarios_estab_estab_mesmo_tenant
        FOREIGN KEY (estabelecimento_id, tenant_id)
        REFERENCES public.estabelecimentos (id, tenant_id),
    ADD CONSTRAINT usuarios_estab_ultimo_estab_mesmo_tenant
        FOREIGN KEY (ultimo_estabelecimento_id, tenant_id)
        REFERENCES public.estabelecimentos (id, tenant_id);

CREATE INDEX idx_usuarios_estabelecimento_tenant ON public.usuarios_estabelecimento (tenant_id);

COMMENT ON COLUMN public.usuarios_estabelecimento.tenant_id IS 'Cliente (tenant) ao qual o usuário pertence';

-- ----------------------------------------------------------------------------
-- 2. Funções de apoio à RLS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_tenant_do_usuario()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT ue.tenant_id
    FROM public.usuarios_estabelecimento ue
    JOIN public.tenants t ON t.id = ue.tenant_id
    WHERE ue.user_id = auth.uid()
      AND ue.ativo = true
      AND t.status IN ('trial', 'ativo');
$$;

COMMENT ON FUNCTION public.fn_tenant_do_usuario() IS 'Tenant do usuário logado; NULL se inativo ou se o tenant estiver suspenso/cancelado';

CREATE OR REPLACE FUNCTION public.fn_estabelecimentos_do_usuario()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT e.id
    FROM public.estabelecimentos e
    WHERE e.tenant_id = public.fn_tenant_do_usuario()
      AND (
            public.fn_is_admin_geral()
         OR e.id = (
                SELECT ue.estabelecimento_id
                FROM public.usuarios_estabelecimento ue
                WHERE ue.user_id = auth.uid()
                  AND ue.ativo = true
            )
      );
$$;

-- Fluxos públicos (anon): estabelecimento ativo E tenant ativo
CREATE OR REPLACE FUNCTION public.fn_estabelecimento_ativo(p_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.estabelecimentos e
        JOIN public.tenants t ON t.id = e.tenant_id
        WHERE e.id = p_id
          AND e.ativo = true
          AND t.status IN ('trial', 'ativo')
    );
$$;

-- ----------------------------------------------------------------------------
-- 3. tenants: o usuário enxerga o próprio tenant
-- ----------------------------------------------------------------------------
CREATE POLICY tenants_select ON public.tenants
    FOR SELECT TO authenticated
    USING (id = public.fn_tenant_do_usuario());

-- ----------------------------------------------------------------------------
-- 4. estabelecimentos: admin geral limitado ao próprio tenant
-- ----------------------------------------------------------------------------
DROP POLICY estabelecimentos_select ON public.estabelecimentos;
DROP POLICY estabelecimentos_insert ON public.estabelecimentos;
DROP POLICY estabelecimentos_update ON public.estabelecimentos;
DROP POLICY estabelecimentos_delete ON public.estabelecimentos;

CREATE POLICY estabelecimentos_select ON public.estabelecimentos
    FOR SELECT TO authenticated
    USING (id IN (SELECT public.fn_estabelecimentos_do_usuario()));

CREATE POLICY estabelecimentos_insert ON public.estabelecimentos
    FOR INSERT TO authenticated
    WITH CHECK (public.fn_is_admin_geral() AND tenant_id = public.fn_tenant_do_usuario());

CREATE POLICY estabelecimentos_update ON public.estabelecimentos
    FOR UPDATE TO authenticated
    USING (public.fn_is_admin_geral() AND tenant_id = public.fn_tenant_do_usuario())
    WITH CHECK (public.fn_is_admin_geral() AND tenant_id = public.fn_tenant_do_usuario());

CREATE POLICY estabelecimentos_delete ON public.estabelecimentos
    FOR DELETE TO authenticated
    USING (public.fn_is_admin_geral() AND tenant_id = public.fn_tenant_do_usuario());

-- Público (catálogo por slug): também exige tenant ativo
DROP POLICY estabelecimentos_select_publico ON public.estabelecimentos;
CREATE POLICY estabelecimentos_select_publico ON public.estabelecimentos
    FOR SELECT TO anon
    USING (public.fn_estabelecimento_ativo(id));

-- ----------------------------------------------------------------------------
-- 5. usuarios_estabelecimento: tudo restrito ao próprio tenant
-- ----------------------------------------------------------------------------
DROP POLICY usuarios_estab_select ON public.usuarios_estabelecimento;
DROP POLICY usuarios_estab_insert ON public.usuarios_estabelecimento;
DROP POLICY usuarios_estab_update ON public.usuarios_estabelecimento;
DROP POLICY usuarios_estab_delete ON public.usuarios_estabelecimento;

CREATE POLICY usuarios_estab_select ON public.usuarios_estabelecimento
    FOR SELECT TO authenticated
    USING (
        user_id = (SELECT auth.uid())
        OR (
            tenant_id = public.fn_tenant_do_usuario()
            AND (
                public.fn_is_admin_geral()
                OR (public.fn_is_admin_estabelecimento()
                    AND estabelecimento_id IN (SELECT public.fn_estabelecimentos_do_usuario()))
            )
        )
    );

CREATE POLICY usuarios_estab_insert ON public.usuarios_estabelecimento
    FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.fn_tenant_do_usuario()
        AND (
            public.fn_is_admin_geral()
            OR (public.fn_is_admin_estabelecimento()
                AND estabelecimento_id IN (SELECT public.fn_estabelecimentos_do_usuario()))
        )
        AND (perfil <> 'administrador_geral' OR public.fn_is_admin_geral())
    );

CREATE POLICY usuarios_estab_update ON public.usuarios_estabelecimento
    FOR UPDATE TO authenticated
    USING (
        tenant_id = public.fn_tenant_do_usuario()
        AND (
            public.fn_is_admin_geral()
            OR (public.fn_is_admin_estabelecimento()
                AND estabelecimento_id IN (SELECT public.fn_estabelecimentos_do_usuario()))
        )
    )
    WITH CHECK (
        tenant_id = public.fn_tenant_do_usuario()
        AND (
            public.fn_is_admin_geral()
            OR (public.fn_is_admin_estabelecimento()
                AND estabelecimento_id IN (SELECT public.fn_estabelecimentos_do_usuario()))
        )
        AND (perfil <> 'administrador_geral' OR public.fn_is_admin_geral())
    );

CREATE POLICY usuarios_estab_delete ON public.usuarios_estabelecimento
    FOR DELETE TO authenticated
    USING (
        tenant_id = public.fn_tenant_do_usuario()
        AND (
            public.fn_is_admin_geral()
            OR (public.fn_is_admin_estabelecimento()
                AND estabelecimento_id IN (SELECT public.fn_estabelecimentos_do_usuario()))
        )
    );

-- ----------------------------------------------------------------------------
-- 6. logs_auditoria: leitura e escrita só no próprio tenant
-- ----------------------------------------------------------------------------
DROP POLICY logs_auditoria_select ON public.logs_auditoria;
DROP POLICY logs_auditoria_insert ON public.logs_auditoria;

CREATE POLICY logs_auditoria_select ON public.logs_auditoria
    FOR SELECT TO authenticated
    USING (
        estabelecimento_id IN (SELECT public.fn_estabelecimentos_do_usuario())
        AND (public.fn_is_admin_geral() OR public.fn_is_admin_estabelecimento())
    );

CREATE POLICY logs_auditoria_insert ON public.logs_auditoria
    FOR INSERT TO authenticated
    WITH CHECK (
        usuario_id = (SELECT auth.uid())
        AND estabelecimento_id IN (SELECT public.fn_estabelecimentos_do_usuario())
    );

-- ----------------------------------------------------------------------------
-- 7. profile (modelo antigo de "administrador"): no LIRI qualquer usuário
--    logado lia/alterava/apagava qualquer profile. Agora: o próprio registro,
--    ou o admin geral para usuários do mesmo tenant.
-- ----------------------------------------------------------------------------
DROP POLICY "Usuários autenticados podem ler profiles" ON public.profile;
DROP POLICY "Usuários autenticados podem inserir profiles" ON public.profile;
DROP POLICY "Usuários autenticados podem atualizar profiles" ON public.profile;
DROP POLICY "Usuários autenticados podem deletar profiles" ON public.profile;

CREATE OR REPLACE FUNCTION public.fn_usuario_no_meu_tenant(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.usuarios_estabelecimento ue
        WHERE ue.user_id = p_user_id
          AND ue.tenant_id = public.fn_tenant_do_usuario()
    );
$$;

COMMENT ON FUNCTION public.fn_usuario_no_meu_tenant(UUID) IS 'Indica se o usuário informado pertence ao mesmo tenant do usuário logado';

CREATE POLICY profile_select ON public.profile
    FOR SELECT TO authenticated
    USING (
        user_id = (SELECT auth.uid())
        OR (public.fn_is_admin_geral() AND public.fn_usuario_no_meu_tenant(user_id))
    );

CREATE POLICY profile_insert ON public.profile
    FOR INSERT TO authenticated
    WITH CHECK (public.fn_is_admin_geral() AND public.fn_usuario_no_meu_tenant(user_id));

CREATE POLICY profile_update ON public.profile
    FOR UPDATE TO authenticated
    USING (
        user_id = (SELECT auth.uid())
        OR (public.fn_is_admin_geral() AND public.fn_usuario_no_meu_tenant(user_id))
    )
    WITH CHECK (
        user_id = (SELECT auth.uid())
        OR (public.fn_is_admin_geral() AND public.fn_usuario_no_meu_tenant(user_id))
    );

CREATE POLICY profile_delete ON public.profile
    FOR DELETE TO authenticated
    USING (public.fn_is_admin_geral() AND public.fn_usuario_no_meu_tenant(user_id));

-- ----------------------------------------------------------------------------
-- 8. Higiene: search_path fixo nas funções herdadas que não o definiam
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    f RECORD;
BEGIN
    FOR f IN
        SELECT p.oid::regprocedure AS assinatura
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.prokind = 'f'
          AND NOT EXISTS (
              SELECT 1 FROM unnest(coalesce(p.proconfig, '{}')) c
              WHERE c LIKE 'search_path=%'
          )
    LOOP
        EXECUTE format('ALTER FUNCTION %s SET search_path = public', f.assinatura);
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 9. Realtime: tabelas escutadas pelo app
-- ----------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos, public.historico_pedidos;

-- ============================================================================
-- FIM DO ARQUIVO
-- ============================================================================
