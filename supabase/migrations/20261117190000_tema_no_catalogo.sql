-- ============================================================================
-- OONSYSTEMS SAAS: TEMA DO CLIENTE TAMBÉM NO CATÁLOGO PÚBLICO
-- ============================================================================
-- O catálogo (/:slug) segue o tema escolhido pelo cliente no painel. O visitante
-- não lê tenants (RLS), então esta função devolve só o id do tema da loja,
-- e apenas de loja ativa. Nenhum outro dado do cliente é exposto.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.catalogo_tema(p_estabelecimento_id UUID)
RETURNS VARCHAR
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT t.tema
      FROM public.estabelecimentos e
      JOIN public.tenants t ON t.id = e.tenant_id
     WHERE e.id = p_estabelecimento_id
       AND e.ativo;
$$;

COMMENT ON FUNCTION public.catalogo_tema(UUID) IS 'Tema do painel do cliente dono da loja (catálogo público); NULL se a loja não existe ou está inativa';

REVOKE EXECUTE ON FUNCTION public.catalogo_tema(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.catalogo_tema(UUID) TO anon, authenticated;
