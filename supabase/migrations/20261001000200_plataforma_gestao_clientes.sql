-- ============================================================================
-- OONSYSTEMS SAAS: GESTÃO DE CLIENTES PELA PLATAFORMA
-- ============================================================================
-- Arquivo: 20261001000200_plataforma_gestao_clientes.sql
-- Descrição:
--   * planos / plano_modulos: planos comerciais (preço mensal e anual, limites
--     de estabelecimentos e usuários) e os módulos que cada plano libera.
--   * tenants: plano, ciclo de cobrança, vigência, cidade/UF, observações
--     internas e motivo do bloqueio.
--   * plataforma_auditoria: histórico de tudo o que muda nos clientes
--     (triggers em tenants e tenant_modulos + ações das Edge Functions).
--   * plataforma_definir_plano: troca plano/ciclo/vigência e sincroniza os
--     módulos do cliente com os do plano.
--   * plataforma_listar_clientes (v3) e plataforma_listar_usuarios.
--   * plataforma_excluir_cliente: apaga o cliente e todos os dados das lojas
--     (uso exclusivo da Edge Function, que também remove os logins).
-- Data: 01/10/2026
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Planos
-- ----------------------------------------------------------------------------
CREATE TABLE public.planos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(60) NOT NULL UNIQUE,
    descricao VARCHAR(300),
    preco_mensal NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (preco_mensal >= 0),
    preco_anual NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (preco_anual >= 0),
    max_estabelecimentos INT CHECK (max_estabelecimentos IS NULL OR max_estabelecimentos > 0),
    max_usuarios INT CHECK (max_usuarios IS NULL OR max_usuarios > 0),
    ativo BOOLEAN NOT NULL DEFAULT true,
    ordem INT NOT NULL DEFAULT 0,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.planos IS 'Planos comerciais da plataforma (null nos limites = ilimitado)';

CREATE TRIGGER trigger_planos_atualizado_em
    BEFORE UPDATE ON public.planos
    FOR EACH ROW EXECUTE FUNCTION public.atualizar_timestamp();

CREATE TABLE public.plano_modulos (
    plano_id UUID NOT NULL REFERENCES public.planos(id) ON DELETE CASCADE,
    modulo VARCHAR(40) NOT NULL REFERENCES public.modulos(codigo) ON DELETE CASCADE,
    PRIMARY KEY (plano_id, modulo)
);

COMMENT ON TABLE public.plano_modulos IS 'Módulos liberados por cada plano';

ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plano_modulos ENABLE ROW LEVEL SECURITY;

-- Clientes logados podem ver os planos (nome do próprio plano); só a plataforma altera
CREATE POLICY planos_select ON public.planos FOR SELECT TO authenticated USING (true);
CREATE POLICY planos_insert_plataforma ON public.planos FOR INSERT TO authenticated
    WITH CHECK (public.fn_is_plataforma_admin());
CREATE POLICY planos_update_plataforma ON public.planos FOR UPDATE TO authenticated
    USING (public.fn_is_plataforma_admin()) WITH CHECK (public.fn_is_plataforma_admin());
CREATE POLICY planos_delete_plataforma ON public.planos FOR DELETE TO authenticated
    USING (public.fn_is_plataforma_admin());

CREATE POLICY plano_modulos_select ON public.plano_modulos FOR SELECT TO authenticated USING (true);
CREATE POLICY plano_modulos_insert_plataforma ON public.plano_modulos FOR INSERT TO authenticated
    WITH CHECK (public.fn_is_plataforma_admin());
CREATE POLICY plano_modulos_delete_plataforma ON public.plano_modulos FOR DELETE TO authenticated
    USING (public.fn_is_plataforma_admin());

-- Planos iniciais (preços a definir na tela Planos)
INSERT INTO public.planos (nome, descricao, ordem) VALUES
    ('Essencial', 'PDV, estoque e métricas', 10),
    ('Completo', 'Todos os módulos', 20);

INSERT INTO public.plano_modulos (plano_id, modulo)
SELECT p.id, m.codigo
  FROM public.planos p
  JOIN public.modulos m ON p.nome = 'Completo' OR m.codigo IN ('pdv', 'estoque', 'metricas');

-- ----------------------------------------------------------------------------
-- 2. Dados comerciais do cliente
-- ----------------------------------------------------------------------------
ALTER TABLE public.tenants
    ADD COLUMN plano_id UUID REFERENCES public.planos(id) ON DELETE SET NULL,
    ADD COLUMN ciclo VARCHAR(10) NOT NULL DEFAULT 'mensal',
    ADD COLUMN vigencia_ate TIMESTAMPTZ,
    ADD COLUMN cidade VARCHAR(100),
    ADD COLUMN uf CHAR(2),
    ADD COLUMN observacoes TEXT,
    ADD COLUMN motivo_bloqueio VARCHAR(300),
    ADD CONSTRAINT tenants_ciclo_valido CHECK (ciclo IN ('mensal', 'anual'));

COMMENT ON COLUMN public.tenants.vigencia_ate IS 'Fim do período pago do plano (informativo: gera alertas, não bloqueia sozinho)';
COMMENT ON COLUMN public.tenants.observacoes IS 'Anotações internas da OonSystems sobre o cliente';

-- ----------------------------------------------------------------------------
-- 3. Auditoria da plataforma
-- ----------------------------------------------------------------------------
CREATE TABLE public.plataforma_auditoria (
    id BIGSERIAL PRIMARY KEY,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    autor_id UUID,
    autor_email TEXT,
    -- Sem FK: o histórico continua existindo depois que o cliente é excluído
    tenant_id UUID,
    tenant_nome TEXT,
    acao VARCHAR(60) NOT NULL,
    detalhes JSONB NOT NULL DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.plataforma_auditoria IS 'Histórico das alterações nos clientes (status, plano, vigência, módulos, usuários...)';

CREATE INDEX idx_plataforma_auditoria_criado ON public.plataforma_auditoria (criado_em DESC);
CREATE INDEX idx_plataforma_auditoria_tenant ON public.plataforma_auditoria (tenant_id, criado_em DESC);

ALTER TABLE public.plataforma_auditoria ENABLE ROW LEVEL SECURITY;

-- Só leitura pela plataforma; gravação só por triggers/funções e service_role
CREATE POLICY plataforma_auditoria_select ON public.plataforma_auditoria
    FOR SELECT TO authenticated
    USING (public.fn_is_plataforma_admin());

REVOKE INSERT, UPDATE, DELETE ON public.plataforma_auditoria FROM anon, authenticated;

-- Autor: usuário logado ou, nas Edge Functions, o informado em oon.autor_id
CREATE FUNCTION public.fn_auditar_plataforma(p_tenant_id UUID, p_tenant_nome TEXT, p_acao TEXT, p_detalhes JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_autor UUID := coalesce(auth.uid(), nullif(current_setting('oon.autor_id', true), '')::uuid);
BEGIN
    INSERT INTO public.plataforma_auditoria (autor_id, autor_email, tenant_id, tenant_nome, acao, detalhes)
    VALUES (
        v_autor,
        (SELECT u.email FROM auth.users u WHERE u.id = v_autor),
        p_tenant_id, p_tenant_nome, p_acao, coalesce(p_detalhes, '{}'::jsonb)
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_auditar_plataforma(UUID, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.fn_tenants_auditoria()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_campos TEXT[] := ARRAY['status', 'plano_id', 'ciclo', 'vigencia_ate', 'trial_ate', 'motivo_bloqueio',
                             'razao_social', 'nome_fantasia', 'documento', 'email', 'telefone', 'cidade', 'uf',
                             'slug', 'observacoes'];
    v_campo TEXT;
    v_de JSONB;
    v_para JSONB;
    v_mudancas JSONB := '{}'::jsonb;
    v_acao TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.fn_auditar_plataforma(NEW.id, coalesce(NEW.nome_fantasia, NEW.razao_social), 'cliente_criado',
            jsonb_build_object('origem', NEW.origem, 'status', NEW.status, 'trial_ate', NEW.trial_ate));
        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        PERFORM public.fn_auditar_plataforma(OLD.id, coalesce(OLD.nome_fantasia, OLD.razao_social), 'cliente_excluido',
            jsonb_build_object('documento', OLD.documento, 'slug', OLD.slug));
        RETURN OLD;
    END IF;

    FOREACH v_campo IN ARRAY v_campos LOOP
        v_de := to_jsonb(OLD) -> v_campo;
        v_para := to_jsonb(NEW) -> v_campo;
        IF v_de IS DISTINCT FROM v_para THEN
            v_mudancas := v_mudancas || jsonb_build_object(v_campo, jsonb_build_object('de', v_de, 'para', v_para));
        END IF;
    END LOOP;

    IF v_mudancas = '{}'::jsonb THEN
        RETURN NEW;
    END IF;

    v_acao := CASE
        WHEN v_mudancas ? 'status' THEN 'status_alterado'
        WHEN v_mudancas ?| ARRAY['plano_id', 'ciclo', 'vigencia_ate'] THEN 'plano_alterado'
        WHEN v_mudancas ? 'trial_ate' THEN 'teste_alterado'
        ELSE 'dados_alterados'
    END;

    PERFORM public.fn_auditar_plataforma(NEW.id, coalesce(NEW.nome_fantasia, NEW.razao_social), v_acao, v_mudancas);
    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_tenants_auditoria() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_tenants_auditoria
    AFTER INSERT OR UPDATE OR DELETE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION public.fn_tenants_auditoria();

-- Módulos ligados/desligados à mão (os da criação do cliente, da troca de plano
-- e da exclusão em cascata já ficam registrados no evento principal)
CREATE FUNCTION public.fn_tenant_modulos_auditoria()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_linha public.tenant_modulos;
BEGIN
    IF pg_trigger_depth() > 1 OR current_setting('oon.auditoria_silenciosa', true) = 'on' THEN
        RETURN NULL;
    END IF;
    v_linha := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
    PERFORM public.fn_auditar_plataforma(
        v_linha.tenant_id,
        (SELECT coalesce(t.nome_fantasia, t.razao_social) FROM public.tenants t WHERE t.id = v_linha.tenant_id),
        CASE WHEN TG_OP = 'DELETE' THEN 'modulo_desligado' ELSE 'modulo_ligado' END,
        jsonb_build_object('modulo', v_linha.modulo));
    RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_tenant_modulos_auditoria() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_tenant_modulos_auditoria
    AFTER INSERT OR DELETE ON public.tenant_modulos
    FOR EACH ROW EXECUTE FUNCTION public.fn_tenant_modulos_auditoria();

-- ----------------------------------------------------------------------------
-- 4. Troca de plano (sincroniza os módulos do cliente com os do plano)
-- ----------------------------------------------------------------------------
CREATE FUNCTION public.plataforma_definir_plano(
    p_tenant_id UUID,
    p_plano_id UUID,
    p_ciclo TEXT,
    p_vigencia_ate TIMESTAMPTZ,
    p_aplicar_modulos BOOLEAN DEFAULT true
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT public.fn_is_plataforma_admin() THEN
        RAISE EXCEPTION 'Acesso restrito à administração da plataforma' USING ERRCODE = '42501';
    END IF;

    UPDATE public.tenants
       SET plano_id = p_plano_id,
           ciclo = coalesce(p_ciclo, ciclo),
           vigencia_ate = p_vigencia_ate
     WHERE id = p_tenant_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cliente não encontrado';
    END IF;

    IF p_aplicar_modulos AND p_plano_id IS NOT NULL THEN
        -- A troca de plano já fica no histórico (plano_alterado)
        PERFORM set_config('oon.auditoria_silenciosa', 'on', true);
        DELETE FROM public.tenant_modulos tm
         WHERE tm.tenant_id = p_tenant_id
           AND NOT EXISTS (SELECT 1 FROM public.plano_modulos pm WHERE pm.plano_id = p_plano_id AND pm.modulo = tm.modulo);
        INSERT INTO public.tenant_modulos (tenant_id, modulo)
        SELECT p_tenant_id, pm.modulo FROM public.plano_modulos pm WHERE pm.plano_id = p_plano_id
        ON CONFLICT DO NOTHING;
        PERFORM set_config('oon.auditoria_silenciosa', 'off', true);
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.plataforma_definir_plano(UUID, UUID, TEXT, TIMESTAMPTZ, BOOLEAN) FROM PUBLIC, anon;

-- ----------------------------------------------------------------------------
-- 5. Listagens da plataforma
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
    telefone VARCHAR,
    cidade VARCHAR,
    uf CHAR(2),
    status VARCHAR,
    motivo_bloqueio VARCHAR,
    origem VARCHAR,
    trial_ate TIMESTAMPTZ,
    plano_id UUID,
    plano_nome VARCHAR,
    ciclo VARCHAR,
    vigencia_ate TIMESTAMPTZ,
    observacoes TEXT,
    criado_em TIMESTAMPTZ,
    qtd_estabelecimentos BIGINT,
    qtd_usuarios BIGINT,
    qtd_produtos BIGINT,
    ultimo_acesso TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT public.fn_is_plataforma_admin() THEN
        RAISE EXCEPTION 'Acesso restrito à administração da plataforma' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT t.id, t.documento, t.tipo_pessoa, t.razao_social, t.nome_fantasia,
           t.slug, t.email, t.telefone, t.cidade, t.uf, t.status, t.motivo_bloqueio,
           t.origem, t.trial_ate, t.plano_id, p.nome, t.ciclo, t.vigencia_ate, t.observacoes, t.criado_em,
           (SELECT count(*) FROM public.estabelecimentos e WHERE e.tenant_id = t.id),
           (SELECT count(*) FROM public.usuarios_estabelecimento ue WHERE ue.tenant_id = t.id),
           (SELECT count(*) FROM public.produtos pr
              JOIN public.estabelecimentos e ON e.id = pr.estabelecimento_id
             WHERE e.tenant_id = t.id),
           (SELECT max(u.last_sign_in_at) FROM public.usuarios_estabelecimento ue
              JOIN auth.users u ON u.id = ue.user_id
             WHERE ue.tenant_id = t.id)
      FROM public.tenants t
      LEFT JOIN public.planos p ON p.id = t.plano_id
     ORDER BY t.criado_em DESC;
END;
$$;

COMMENT ON FUNCTION public.plataforma_listar_clientes() IS 'Lista os clientes com plano, vigência e totais agregados (apenas admin da plataforma)';
REVOKE EXECUTE ON FUNCTION public.plataforma_listar_clientes() FROM PUBLIC, anon;

CREATE FUNCTION public.plataforma_listar_usuarios(p_tenant_id UUID)
RETURNS TABLE (
    user_id UUID,
    nome VARCHAR,
    email VARCHAR,
    perfil VARCHAR,
    ativo BOOLEAN,
    estabelecimento_nome VARCHAR,
    criado_em TIMESTAMPTZ,
    ultimo_acesso TIMESTAMPTZ,
    email_confirmado BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT public.fn_is_plataforma_admin() THEN
        RAISE EXCEPTION 'Acesso restrito à administração da plataforma' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT ue.user_id, ue.nome::VARCHAR, ue.email::VARCHAR, ue.perfil::VARCHAR, ue.ativo,
           coalesce(e.nome, 'Todos os estabelecimentos')::VARCHAR,
           ue.criado_em, u.last_sign_in_at, u.email_confirmed_at IS NOT NULL
      FROM public.usuarios_estabelecimento ue
      LEFT JOIN public.estabelecimentos e ON e.id = ue.estabelecimento_id
      LEFT JOIN auth.users u ON u.id = ue.user_id
     WHERE ue.tenant_id = p_tenant_id
     ORDER BY CASE ue.perfil WHEN 'administrador_geral' THEN 0 WHEN 'administrador_estabelecimento' THEN 1 ELSE 2 END,
              ue.nome;
END;
$$;

COMMENT ON FUNCTION public.plataforma_listar_usuarios(UUID) IS 'Usuários de um cliente com último acesso (apenas admin da plataforma)';
REVOKE EXECUTE ON FUNCTION public.plataforma_listar_usuarios(UUID) FROM PUBLIC, anon;

-- ----------------------------------------------------------------------------
-- 6. Exclusão completa do cliente (Edge Function plataforma-clientes)
-- Apaga os dados das lojas em ordem de dependência e, por segurança, varre
-- qualquer outra tabela com estabelecimento_id criada no futuro.
-- ----------------------------------------------------------------------------
CREATE FUNCTION public.plataforma_excluir_cliente(p_tenant_id UUID, p_autor_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_estabs UUID[];
    v_tabela TEXT;
    v_ordem TEXT[] := ARRAY[
        'combo_produtos', 'produto_sabores', 'tamanhos', 'sale_installments', 'sales',
        'stock_movements', 'stock_variants', 'pedidos', 'historico_pedidos', 'historico_geral',
        'historico_comandas', 'comandas', 'avaliacoes', 'clientes', 'combos', 'adicionais', 'sabores'
    ];
BEGIN
    PERFORM set_config('oon.autor_id', p_autor_id::text, true);
    -- Só o evento principal (cliente_excluido) vai para o histórico
    PERFORM set_config('oon.auditoria_silenciosa', 'on', true);

    IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = p_tenant_id) THEN
        RAISE EXCEPTION 'Cliente não encontrado';
    END IF;

    SELECT coalesce(array_agg(id), '{}') INTO v_estabs FROM public.estabelecimentos WHERE tenant_id = p_tenant_id;

    FOREACH v_tabela IN ARRAY v_ordem LOOP
        IF to_regclass('public.' || v_tabela) IS NOT NULL THEN
            EXECUTE format('DELETE FROM public.%I WHERE estabelecimento_id = ANY ($1)', v_tabela) USING v_estabs;
        END IF;
    END LOOP;

    -- produtos <-> stock_items se referenciam
    UPDATE public.produtos SET stock_item_id = NULL WHERE estabelecimento_id = ANY (v_estabs);
    DELETE FROM public.stock_items WHERE estabelecimento_id = ANY (v_estabs);
    DELETE FROM public.produtos WHERE estabelecimento_id = ANY (v_estabs);

    -- Demais tabelas com estabelecimento_id (categorias, configuracoes, funcionarios...)
    FOR v_tabela IN
        SELECT c.table_name
          FROM information_schema.columns c
          JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
         WHERE c.table_schema = 'public'
           AND c.column_name = 'estabelecimento_id'
           AND t.table_type = 'BASE TABLE'
           AND c.table_name NOT IN ('usuarios_estabelecimento')
    LOOP
        EXECUTE format('DELETE FROM public.%I WHERE estabelecimento_id = ANY ($1)', v_tabela) USING v_estabs;
    END LOOP;

    DELETE FROM public.usuarios_estabelecimento WHERE tenant_id = p_tenant_id;
    DELETE FROM public.estabelecimentos WHERE tenant_id = p_tenant_id;
    DELETE FROM public.tenants WHERE id = p_tenant_id;
END;
$$;

COMMENT ON FUNCTION public.plataforma_excluir_cliente(UUID, UUID) IS
    'Apaga o cliente e todos os dados das lojas (só service_role; os logins são removidos pela Edge Function)';
REVOKE EXECUTE ON FUNCTION public.plataforma_excluir_cliente(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.plataforma_excluir_cliente(UUID, UUID) TO service_role;

-- Registro de ações das Edge Functions (senha redefinida, usuário bloqueado...)
CREATE FUNCTION public.plataforma_registrar_auditoria(p_autor_id UUID, p_tenant_id UUID, p_acao TEXT, p_detalhes JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    PERFORM set_config('oon.autor_id', p_autor_id::text, true);
    PERFORM public.fn_auditar_plataforma(
        p_tenant_id,
        (SELECT coalesce(t.nome_fantasia, t.razao_social) FROM public.tenants t WHERE t.id = p_tenant_id),
        p_acao, p_detalhes);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.plataforma_registrar_auditoria(UUID, UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.plataforma_registrar_auditoria(UUID, UUID, TEXT, JSONB) TO service_role;

-- ============================================================================
-- FIM DO ARQUIVO
-- ============================================================================
