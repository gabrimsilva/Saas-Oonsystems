-- ============================================================================
-- OONSYSTEMS SAAS: "MAIS VENDIDOS" NO CATÁLOGO PÚBLICO
-- ============================================================================
-- Soma as quantidades vendidas por produto (PDV e pedidos online finalizados,
-- tabela sales) de UMA loja, para ordenar o catálogo por "Mais vendidos".
-- Consumo interno não conta. Devolve só o total por produto (nada de venda,
-- cliente ou valor), e só de loja ativa: pode ser chamada pelo visitante.
-- Veio do sistema da KOBE (kobbr), aqui separada por estabelecimento.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.catalogo_mais_vendidos(p_estabelecimento_id UUID)
RETURNS TABLE (produto_id UUID, quantidade NUMERIC)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT
        nullif(coalesce(i->'produto'->>'id', i->>'produto_id'), '')::uuid AS produto_id,
        sum(coalesce((i->>'quantidade')::numeric, 0)) AS quantidade
    FROM public.sales s
    CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(s.items) = 'array' THEN s.items ELSE '[]'::jsonb END
    ) AS i
    WHERE s.estabelecimento_id = p_estabelecimento_id
      AND public.fn_estabelecimento_ativo(p_estabelecimento_id)
      AND coalesce(s.sale_type::text, '') <> 'INTERNAL_CONSUMPTION'
      AND coalesce(s.payment_method::text, '') <> 'INTERNAL_CONSUMPTION'
      AND nullif(coalesce(i->'produto'->>'id', i->>'produto_id'), '') ~* '^[0-9a-f-]{36}$'
    GROUP BY 1;
$$;

REVOKE EXECUTE ON FUNCTION public.catalogo_mais_vendidos(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.catalogo_mais_vendidos(UUID) TO anon, authenticated;
