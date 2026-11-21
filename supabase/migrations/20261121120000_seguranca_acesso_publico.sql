-- ============================================================================
-- OONSYSTEMS SAAS: REFORÇO DO ACESSO PÚBLICO (anon)
-- ============================================================================
-- O visitante sem login só lê o que o catálogo precisa. Tudo o que o público
-- grava (pedidos, avaliações, clientes) passa pela Edge Function
-- catalogo-pedidos, que valida e limita por IP.
--
--   1. Avaliações e clientes: sem INSERT direto do visitante. Avaliações
--      entravam já publicadas (aprovada = true) e sem limite.
--   2. Tabelas antigas, vazias e sem uso (sabores, bordas, tamanhos,
--      adicionais, combos): sem leitura pública.
--   3. anon sem INSERT/UPDATE/DELETE/TRUNCATE em todas as tabelas (hoje a RLS
--      já barrava; fica barrado também na permissão da tabela), inclusive nas
--      tabelas criadas daqui em diante.
-- ============================================================================

-- 1. Escritas diretas do visitante
DROP POLICY IF EXISTS avaliacoes_insert_publico ON public.avaliacoes;
DROP POLICY IF EXISTS clientes_insert_publico ON public.clientes;

-- 2. Leitura pública das tabelas antigas
DROP POLICY IF EXISTS sabores_select_publico ON public.sabores;
DROP POLICY IF EXISTS produto_sabores_select_publico ON public.produto_sabores;
DROP POLICY IF EXISTS tamanhos_select_publico ON public.tamanhos;
DROP POLICY IF EXISTS adicionais_select_publico ON public.adicionais;
DROP POLICY IF EXISTS combos_select_publico ON public.combos;
DROP POLICY IF EXISTS combo_produtos_select_publico ON public.combo_produtos;

-- 3. Permissões de escrita do anon
DO $$
DECLARE
    t RECORD;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.%I FROM anon', t.tablename);
    END LOOP;
END;
$$;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLES FROM anon;
