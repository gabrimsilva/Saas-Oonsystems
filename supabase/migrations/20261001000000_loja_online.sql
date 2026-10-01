-- =============================================================================
-- Loja online: pedidos pelo catálogo público, ligados/desligados pela loja
--
-- * config_loja_online (1 linha por estabelecimento): "Receber pedidos pelo
--   catálogo" e "Cobrar pagamento online" (Mercado Pago Checkout Pro).
--   O Access Token sai de `configuracoes` (legível por qualquer usuário do
--   cliente) e passa a ser uma coluna que o navegador só consegue gravar.
-- * Pedidos do catálogo são gravados pela Edge Function `catalogo-pedidos`
--   (service_role), que recalcula preços e confere o estoque no servidor. O
--   INSERT direto do visitante em `pedidos` deixa de existir.
-- * Funções públicas para o catálogo: configuração sem segredos e estoque.
-- =============================================================================

CREATE TABLE public.config_loja_online (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    estabelecimento_id uuid NOT NULL UNIQUE REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
    pedidos_ativos boolean NOT NULL DEFAULT false,
    pagamento_online boolean NOT NULL DEFAULT false,
    ambiente text NOT NULL DEFAULT 'producao' CHECK (ambiente IN ('teste', 'producao')),
    access_token text,
    webhook_secret text,
    token_configurado boolean GENERATED ALWAYS AS (coalesce(access_token, '') <> '') STORED,
    pix_ativo boolean NOT NULL DEFAULT true,
    credito_ativo boolean NOT NULL DEFAULT true,
    debito_ativo boolean NOT NULL DEFAULT true,
    max_parcelas integer NOT NULL DEFAULT 1 CHECK (max_parcelas BETWEEN 1 AND 12),
    criado_em timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trigger_config_loja_online_atualizado_em
    BEFORE UPDATE ON public.config_loja_online
    FOR EACH ROW EXECUTE FUNCTION public.atualizar_timestamp();

ALTER TABLE public.config_loja_online ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer usuário do estabelecimento (sem as colunas secretas, ver GRANTs)
CREATE POLICY config_loja_online_select_tenant ON public.config_loja_online
    FOR SELECT TO authenticated
    USING (estabelecimento_id IN (SELECT public.fn_estabelecimentos_do_usuario()));

-- Escrita: só administradores (as mesmas pessoas que acessam Configurações)
CREATE POLICY config_loja_online_insert_admin ON public.config_loja_online
    FOR INSERT TO authenticated
    WITH CHECK (
        estabelecimento_id IN (SELECT public.fn_estabelecimentos_do_usuario())
        AND (public.fn_is_admin_geral() OR public.fn_is_admin_estabelecimento())
    );

CREATE POLICY config_loja_online_update_admin ON public.config_loja_online
    FOR UPDATE TO authenticated
    USING (
        estabelecimento_id IN (SELECT public.fn_estabelecimentos_do_usuario())
        AND (public.fn_is_admin_geral() OR public.fn_is_admin_estabelecimento())
    )
    WITH CHECK (
        estabelecimento_id IN (SELECT public.fn_estabelecimentos_do_usuario())
        AND (public.fn_is_admin_geral() OR public.fn_is_admin_estabelecimento())
    );

-- Privilégios por coluna: access_token e webhook_secret podem ser gravados,
-- nunca lidos pelo navegador (só as Edge Functions, com service_role).
REVOKE ALL ON public.config_loja_online FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, estabelecimento_id, pedidos_ativos, pagamento_online, ambiente, token_configurado,
              pix_ativo, credito_ativo, debito_ativo, max_parcelas, criado_em, atualizado_em)
    ON public.config_loja_online TO authenticated;
GRANT INSERT (estabelecimento_id, pedidos_ativos, pagamento_online, ambiente, access_token,
              pix_ativo, credito_ativo, debito_ativo, max_parcelas)
    ON public.config_loja_online TO authenticated;
GRANT UPDATE (pedidos_ativos, pagamento_online, ambiente, access_token,
              pix_ativo, credito_ativo, debito_ativo, max_parcelas)
    ON public.config_loja_online TO authenticated;
GRANT ALL ON public.config_loja_online TO service_role;

-- Credenciais que já estavam em `configuracoes` mudam de lugar
INSERT INTO public.config_loja_online (estabelecimento_id, access_token, webhook_secret)
SELECT c.estabelecimento_id,
       max(c.valor) FILTER (WHERE c.chave = 'mercado_pago_access_token'),
       max(c.valor) FILTER (WHERE c.chave = 'mercado_pago_webhook_secret')
  FROM public.configuracoes c
 WHERE c.chave IN ('mercado_pago_access_token', 'mercado_pago_webhook_secret')
   AND c.estabelecimento_id IS NOT NULL
   AND coalesce(c.valor, '') <> ''
 GROUP BY c.estabelecimento_id
ON CONFLICT (estabelecimento_id) DO NOTHING;

DELETE FROM public.configuracoes
 WHERE chave IN ('mercado_pago_access_token', 'mercado_pago_webhook_secret');

-- -----------------------------------------------------------------------------
-- Pedidos: origem e preferência do Checkout Pro
-- -----------------------------------------------------------------------------
ALTER TABLE public.pedidos
    ADD COLUMN IF NOT EXISTS origem text,
    ADD COLUMN IF NOT EXISTS mercado_pago_preference_id text;

COMMENT ON COLUMN public.pedidos.origem IS 'catalogo = pedido feito pelo catálogo público (Edge Function catalogo-pedidos)';

-- Visitante não grava pedido direto: o total viria do navegador
DROP POLICY IF EXISTS pedidos_insert_publico ON public.pedidos;

-- Código do pedido do catálogo (curto, legível e único em todo o SaaS)
CREATE SEQUENCE IF NOT EXISTS public.pedidos_catalogo_codigo_seq START 1001;
REVOKE ALL ON SEQUENCE public.pedidos_catalogo_codigo_seq FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SEQUENCE public.pedidos_catalogo_codigo_seq TO service_role;

CREATE FUNCTION public.proximo_codigo_pedido_catalogo()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT nextval('public.pedidos_catalogo_codigo_seq')::text;
$$;

REVOKE ALL ON FUNCTION public.proximo_codigo_pedido_catalogo() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.proximo_codigo_pedido_catalogo() TO service_role;

-- -----------------------------------------------------------------------------
-- Configuração pública da loja online (sem segredos)
-- pedidos_ativos só é true quando tudo permite: a loja ligou, o cliente do
-- SaaS está liberado, o módulo "Pedidos online" está contratado e, se a loja
-- cobra online, o token está configurado.
-- -----------------------------------------------------------------------------
CREATE FUNCTION public.catalogo_config_publica(p_estabelecimento_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT jsonb_build_object(
        'estabelecimento_id', e.id,
        'pedidos_ativos',
            coalesce(c.pedidos_ativos, false)
            AND public.fn_estabelecimento_ativo(e.id)
            AND public.fn_modulo_ativo(e.id, 'pedidos_online')
            AND (NOT coalesce(c.pagamento_online, false) OR coalesce(c.token_configurado, false)),
        'pagamento_online', coalesce(c.pagamento_online, false),
        'pix', coalesce(c.pix_ativo, false),
        'credito', coalesce(c.credito_ativo, false),
        'debito', coalesce(c.debito_ativo, false),
        'max_parcelas', coalesce(c.max_parcelas, 1)
    )
      FROM public.estabelecimentos e
      LEFT JOIN public.config_loja_online c ON c.estabelecimento_id = e.id
     WHERE e.id = p_estabelecimento_id;
$$;

REVOKE ALL ON FUNCTION public.catalogo_config_publica(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.catalogo_config_publica(uuid) TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Estoque do catálogo público: o visitante não lê stock_items/stock_variants,
-- então o catálogo recebe só produto, variantes e saldo da loja informada.
-- -----------------------------------------------------------------------------
CREATE FUNCTION public.catalogo_estoque_publico(p_estabelecimento_id uuid)
RETURNS TABLE (produto_id uuid, quantidade numeric, variante_id uuid, variante_nome text, variante_quantidade numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT si.product_id,
           coalesce(si.quantidade, 0),
           sv.id,
           coalesce(nullif(sv.nome, ''), nullif(sv.label, ''), 'Opção')::text,
           coalesce(sv.quantidade, 0)::numeric
      FROM public.stock_items si
      LEFT JOIN public.stock_variants sv ON sv.stock_item_id = si.id
     WHERE si.estabelecimento_id = p_estabelecimento_id
       AND si.product_id IS NOT NULL
       AND public.fn_estabelecimento_ativo(p_estabelecimento_id)
     ORDER BY si.product_id, sv.nome;
$$;

REVOKE ALL ON FUNCTION public.catalogo_estoque_publico(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.catalogo_estoque_publico(uuid) TO anon, authenticated, service_role;
