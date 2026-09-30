-- ============================================================================
-- OONSYSTEMS SAAS: MÓDULOS POR CLIENTE
-- ============================================================================
-- Arquivo: 20260930200747_modulos_por_cliente.sql
-- Descrição: Cada cliente (tenant) tem um conjunto de módulos ligados. É a
--            base dos planos: um plano = um conjunto de módulos.
--
--   * modulos: catálogo dos módulos que podem ser ligados/desligados.
--   * tenant_modulos: módulos ligados de cada tenant (linha existe = ligado).
--   * Novo tenant nasce com todos os módulos ligados (trigger).
--
-- Bloqueio no banco (políticas RESTRICTIVE: somam-se às existentes, e com o
-- módulo desligado nenhuma gravação passa, nem de visitante):
--   * comandas            -> comandas, historico_comandas
--   * pedidos_online      -> pedidos, historico_pedidos, historico_geral
--   * sabores_adicionais  -> sabores, adicionais, tamanhos
--   * estoque             -> estoque (tabela legada)
-- PDV, estoque novo (stock_*) e métricas são bloqueados só na interface:
-- sales e stock_* também recebem gravações das vendas de Comandas/Pedidos,
-- e métricas não grava nada.
-- Data: 30/09/2026
-- ============================================================================

CREATE TABLE public.modulos (
    codigo VARCHAR(40) PRIMARY KEY,
    nome VARCHAR(80) NOT NULL,
    descricao VARCHAR(300),
    ordem INT NOT NULL DEFAULT 0
);

COMMENT ON TABLE public.modulos IS 'Catálogo de módulos que podem ser ligados por cliente';

INSERT INTO public.modulos (codigo, nome, descricao, ordem) VALUES
    ('pdv', 'PDV', 'Ponto de venda e histórico de vendas', 10),
    ('comandas', 'Comandas', 'Comandas de mesa/balcão e histórico', 20),
    ('pedidos_online', 'Pedidos online', 'Pedidos do catálogo/delivery, pagamento PIX e histórico', 30),
    ('estoque', 'Estoque', 'Controle de estoque e movimentações', 40),
    ('sabores_adicionais', 'Sabores e adicionais', 'Sabores, bordas, tamanhos e adicionais de produtos', 50),
    ('metricas', 'Métricas', 'Relatórios e métricas de vendas', 60);

ALTER TABLE public.modulos ENABLE ROW LEVEL SECURITY;

CREATE POLICY modulos_select ON public.modulos
    FOR SELECT TO authenticated
    USING (true);

CREATE TABLE public.tenant_modulos (
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    modulo VARCHAR(40) NOT NULL REFERENCES public.modulos(codigo) ON DELETE CASCADE,
    ligado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, modulo)
);

COMMENT ON TABLE public.tenant_modulos IS 'Módulos ligados de cada cliente (a linha existir = módulo ligado)';

ALTER TABLE public.tenant_modulos ENABLE ROW LEVEL SECURITY;

-- O cliente enxerga os próprios módulos; só a plataforma liga/desliga
CREATE POLICY tenant_modulos_select ON public.tenant_modulos
    FOR SELECT TO authenticated
    USING (tenant_id = public.fn_tenant_do_usuario() OR public.fn_is_plataforma_admin());

CREATE POLICY tenant_modulos_insert_plataforma ON public.tenant_modulos
    FOR INSERT TO authenticated
    WITH CHECK (public.fn_is_plataforma_admin());

CREATE POLICY tenant_modulos_delete_plataforma ON public.tenant_modulos
    FOR DELETE TO authenticated
    USING (public.fn_is_plataforma_admin());

-- ----------------------------------------------------------------------------
-- Novo tenant nasce com todos os módulos; tenants existentes recebem todos
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_tenant_modulos_iniciais()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.tenant_modulos (tenant_id, modulo)
    SELECT NEW.id, m.codigo FROM public.modulos m;
    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_tenant_modulos_iniciais() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_tenants_modulos_iniciais
    AFTER INSERT ON public.tenants
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_tenant_modulos_iniciais();

INSERT INTO public.tenant_modulos (tenant_id, modulo)
SELECT t.id, m.codigo FROM public.tenants t CROSS JOIN public.modulos m
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- Módulo ligado para o tenant dono de um estabelecimento
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_modulo_ativo(p_estabelecimento_id UUID, p_modulo TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.estabelecimentos e
        JOIN public.tenant_modulos tm ON tm.tenant_id = e.tenant_id
        WHERE e.id = p_estabelecimento_id
          AND tm.modulo = p_modulo
    );
$$;

COMMENT ON FUNCTION public.fn_modulo_ativo(UUID, TEXT) IS 'True se o módulo está ligado no cliente dono do estabelecimento';

-- Usada nas políticas de visitantes (pedidos) e de usuários logados
REVOKE EXECUTE ON FUNCTION public.fn_modulo_ativo(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_modulo_ativo(UUID, TEXT) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- Bloqueio de gravação por módulo (RESTRICTIVE: vale para anon e authenticated)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('comandas', 'comandas'),
            ('historico_comandas', 'comandas'),
            ('pedidos', 'pedidos_online'),
            ('historico_pedidos', 'pedidos_online'),
            ('historico_geral', 'pedidos_online'),
            ('sabores', 'sabores_adicionais'),
            ('adicionais', 'sabores_adicionais'),
            ('tamanhos', 'sabores_adicionais'),
            ('estoque', 'estoque')
        ) AS t(tabela, modulo)
    LOOP
        EXECUTE format(
            'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR INSERT TO anon, authenticated
                 WITH CHECK (public.fn_modulo_ativo(estabelecimento_id, %L))',
            'modulo_' || r.tabela || '_insert', r.tabela, r.modulo);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR UPDATE TO anon, authenticated
                 USING (public.fn_modulo_ativo(estabelecimento_id, %L))
                 WITH CHECK (public.fn_modulo_ativo(estabelecimento_id, %L))',
            'modulo_' || r.tabela || '_update', r.tabela, r.modulo, r.modulo);
    END LOOP;
END $$;

-- ============================================================================
-- FIM DO ARQUIVO
-- ============================================================================
