-- ============================================================================
-- OONSYSTEMS SAAS: UNICIDADE POR ESTABELECIMENTO
-- ============================================================================
-- Arquivo: 20260930121750_unicidade_por_estabelecimento.sql
-- Descrição: No LIRI (um cliente só) estas colunas eram únicas no banco todo.
--            No SaaS isso faz um cliente bloquear o outro:
--              * sales.sale_number é sequencial por estabelecimento
--                (VENDA-AAAAMMDD-001): a 1ª venda do dia do cliente B colidia
--                com a do cliente A e falhava;
--              * stock_variants.barcode: dois clientes não podiam cadastrar o
--                mesmo EAN;
--              * funcionarios.email: a mesma pessoa não podia trabalhar em
--                dois clientes.
--            A violação de unicidade também revelava dados de outro cliente.
--            pedidos.pedido_id / codigo_pedido continuam globais: são
--            gerados com timestamp + aleatório e usados nas URLs públicas.
-- Data: 30/09/2026
-- ============================================================================

ALTER TABLE public.sales DROP CONSTRAINT sales_sale_number_key;
ALTER TABLE public.sales
    ADD CONSTRAINT sales_sale_number_unico_por_estab UNIQUE (estabelecimento_id, sale_number);

DROP INDEX public.uq_stock_variants_barcode;
CREATE UNIQUE INDEX uq_stock_variants_barcode_por_estab
    ON public.stock_variants (estabelecimento_id, barcode)
    WHERE barcode IS NOT NULL;

ALTER TABLE public.funcionarios DROP CONSTRAINT funcionarios_email_key;
ALTER TABLE public.funcionarios
    ADD CONSTRAINT funcionarios_email_unico_por_estab UNIQUE (estabelecimento_id, email);

-- ============================================================================
-- FIM DO ARQUIVO
-- ============================================================================
