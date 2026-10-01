-- =============================================================================
-- Loja online, parte 2
--
-- * Reserva de estoque: os itens de pedidos em aberto (ainda não finalizados
--   no Kanban, onde acontece a baixa) seguram o saldo. O catálogo e a Edge
--   Function `catalogo-pedidos` descontam essa reserva para não aceitar pedido
--   sem estoque.
-- * Preço online por produto (null = preço do PDV/promocional) e preço de
--   atacado (null = preço de varejo).
-- * Atacado opcional por loja, com pedido mínimo.
-- * O visitante deixa de ler o custo dos produtos.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Preços do catálogo
-- -----------------------------------------------------------------------------
ALTER TABLE public.produtos
    ADD COLUMN IF NOT EXISTS preco_online numeric(10,2) CHECK (preco_online IS NULL OR preco_online > 0),
    ADD COLUMN IF NOT EXISTS preco_atacado numeric(10,2) CHECK (preco_atacado IS NULL OR preco_atacado > 0);

COMMENT ON COLUMN public.produtos.preco_online IS 'Preço nos pedidos do catálogo (varejo). null = preço do PDV (ou promocional)';
COMMENT ON COLUMN public.produtos.preco_atacado IS 'Preço no modo atacado do catálogo. null = preço de varejo do catálogo';

-- Visitante (catálogo público) lê o produto, mas não o custo.
-- ATENÇÃO: coluna nova em `produtos` que o catálogo precise ler tem de entrar aqui.
REVOKE SELECT ON public.produtos FROM anon;
GRANT SELECT (id, nome, descricao, preco, preco_promocional, preco_online, preco_atacado,
              categoria_id, categoria_nome, imagem_path, sabores_disponiveis, quantidade_sabores,
              ativo, criado_em, atualizado_em, permite_adicionais, requires_stock, codigo_barras,
              stock_item_id, estabelecimento_id)
    ON public.produtos TO anon;

-- -----------------------------------------------------------------------------
-- Atacado por loja
-- -----------------------------------------------------------------------------
ALTER TABLE public.config_loja_online
    ADD COLUMN IF NOT EXISTS atacado_ativo boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS atacado_pedido_minimo numeric(10,2) NOT NULL DEFAULT 0 CHECK (atacado_pedido_minimo >= 0);

GRANT SELECT (atacado_ativo, atacado_pedido_minimo) ON public.config_loja_online TO authenticated;
GRANT INSERT (atacado_ativo, atacado_pedido_minimo) ON public.config_loja_online TO authenticated;
GRANT UPDATE (atacado_ativo, atacado_pedido_minimo) ON public.config_loja_online TO authenticated;

ALTER TABLE public.pedidos
    ADD COLUMN IF NOT EXISTS tipo_venda text NOT NULL DEFAULT 'varejo' CHECK (tipo_venda IN ('varejo', 'atacado'));

CREATE OR REPLACE FUNCTION public.catalogo_config_publica(p_estabelecimento_id uuid)
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
        'max_parcelas', coalesce(c.max_parcelas, 1),
        'atacado_ativo', coalesce(c.atacado_ativo, false),
        'atacado_pedido_minimo', coalesce(c.atacado_pedido_minimo, 0)
    )
      FROM public.estabelecimentos e
      LEFT JOIN public.config_loja_online c ON c.estabelecimento_id = e.id
     WHERE e.id = p_estabelecimento_id;
$$;

-- -----------------------------------------------------------------------------
-- Reserva de estoque dos pedidos em aberto
-- A baixa física acontece quando o pedido vai para "Finalizado" no Kanban
-- (pedidoDeliveryService). Até lá os itens ficam reservados. Pagamento online
-- recusado/estornado não segura estoque. Itens antigos com ID que não é UUID
-- (ex.: combos personalizados) são ignorados.
-- -----------------------------------------------------------------------------
CREATE FUNCTION public.catalogo_estoque_reservado(p_estabelecimento_id uuid, p_produto_ids uuid[] DEFAULT NULL)
RETURNS TABLE (produto_id uuid, variante_id uuid, quantidade numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH brutos AS (
        SELECT coalesce(i->>'produto_id', i->'produto'->>'id') AS produto_txt,
               coalesce(i->>'variantId', i->>'variante_id') AS variante_txt,
               i->>'quantidade' AS qtd_txt
          FROM public.pedidos p
         CROSS JOIN LATERAL jsonb_array_elements(
                 CASE WHEN jsonb_typeof(p.itens) = 'array' THEN p.itens ELSE '[]'::jsonb END
               ) AS i
         WHERE p.estabelecimento_id = p_estabelecimento_id
           AND NOT coalesce(p.cancelado, false)
           AND p.status NOT IN ('Finalizado', 'Entregue', 'Retirado', 'Cancelado')
           AND coalesce(p.mercado_pago_status, '') NOT IN ('rejected', 'cancelled', 'refunded', 'charged_back', 'valor_divergente')
    ),
    -- Conversões dentro de CASE: o filtro do WHERE não garante a ordem de avaliação
    itens AS (
        SELECT CASE WHEN b.produto_txt ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                    THEN b.produto_txt::uuid END AS pid,
               CASE WHEN b.variante_txt ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                    THEN b.variante_txt::uuid END AS vid,
               CASE WHEN b.qtd_txt ~ '^[0-9]+(\.[0-9]+)?$' THEN b.qtd_txt::numeric END AS qtd
          FROM brutos b
    )
    SELECT it.pid, it.vid, sum(it.qtd)
      FROM itens it
     WHERE it.pid IS NOT NULL
       AND it.qtd > 0
       AND (p_produto_ids IS NULL OR it.pid = ANY (p_produto_ids))
     GROUP BY it.pid, it.vid;
$$;

REVOKE ALL ON FUNCTION public.catalogo_estoque_reservado(uuid, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.catalogo_estoque_reservado(uuid, uuid[]) TO service_role;

-- Estoque do catálogo já descontando a reserva
CREATE OR REPLACE FUNCTION public.catalogo_estoque_publico(p_estabelecimento_id uuid)
RETURNS TABLE (produto_id uuid, quantidade numeric, variante_id uuid, variante_nome text, variante_quantidade numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH reserva AS (
        SELECT r.produto_id AS rp, r.variante_id AS rv, r.quantidade AS rq
          FROM public.catalogo_estoque_reservado(p_estabelecimento_id, NULL) r
    ),
    por_produto AS (SELECT rp, sum(rq) AS q FROM reserva GROUP BY rp),
    por_variante AS (SELECT rv, sum(rq) AS q FROM reserva WHERE rv IS NOT NULL GROUP BY rv)
    SELECT si.product_id,
           greatest(coalesce(si.quantidade, 0) - coalesce(pp.q, 0), 0),
           sv.id,
           coalesce(nullif(sv.nome, ''), nullif(sv.label, ''), 'Opção')::text,
           greatest(coalesce(sv.quantidade, 0) - coalesce(pv.q, 0), 0)::numeric
      FROM public.stock_items si
      LEFT JOIN public.stock_variants sv ON sv.stock_item_id = si.id
      LEFT JOIN por_produto pp ON pp.rp = si.product_id
      LEFT JOIN por_variante pv ON pv.rv = sv.id
     WHERE si.estabelecimento_id = p_estabelecimento_id
       AND si.product_id IS NOT NULL
       AND public.fn_estabelecimento_ativo(p_estabelecimento_id)
     ORDER BY si.product_id, sv.nome;
$$;
