-- Pagamento dividido no PDV: a venda pode ser paga com duas formas de
-- pagamento diferentes (ex.: parte no PIX, parte em dinheiro). Mesmo modelo
-- de colunas já usado em comandas e historico_comandas.
--
-- payment_method = 'SPLIT' identifica a venda dividida; as duas partes ficam
-- em pagamento_1_* e pagamento_2_*, que as métricas somam em cada forma.

ALTER TABLE public.sales
  ADD COLUMN forma_pagamento_dividido boolean NOT NULL DEFAULT false,
  ADD COLUMN pagamento_1_tipo varchar(20),
  ADD COLUMN pagamento_1_valor numeric(10,2),
  ADD COLUMN pagamento_2_tipo varchar(20),
  ADD COLUMN pagamento_2_valor numeric(10,2);

COMMENT ON COLUMN public.sales.forma_pagamento_dividido IS 'Venda paga com duas formas de pagamento (payment_method = SPLIT)';
COMMENT ON COLUMN public.sales.pagamento_1_tipo IS 'Primeira forma de pagamento (DEBIT, CREDIT, PIX, CASH)';
COMMENT ON COLUMN public.sales.pagamento_1_valor IS 'Valor pago com a primeira forma';
COMMENT ON COLUMN public.sales.pagamento_2_tipo IS 'Segunda forma de pagamento (DEBIT, CREDIT, PIX, CASH)';
COMMENT ON COLUMN public.sales.pagamento_2_valor IS 'Valor pago com a segunda forma';

ALTER TABLE public.sales DROP CONSTRAINT sales_payment_method_check;
ALTER TABLE public.sales ADD CONSTRAINT sales_payment_method_check CHECK (
  payment_method::text = ANY (ARRAY['DEBIT', 'CREDIT', 'PIX', 'CASH', 'A_PRAZO', 'INTERNAL_CONSUMPTION', 'SPLIT']::text[])
);

-- Coerência da venda dividida: SPLIT <-> dividido, duas formas diferentes,
-- valores positivos e soma igual ao total (tolerância de 1 centavo).
ALTER TABLE public.sales ADD CONSTRAINT sales_pagamento_dividido_coerente CHECK (
  (forma_pagamento_dividido = (payment_method::text = 'SPLIT'))
  AND (
    NOT forma_pagamento_dividido
    OR (
      pagamento_1_tipo::text = ANY (ARRAY['DEBIT', 'CREDIT', 'PIX', 'CASH']::text[])
      AND pagamento_2_tipo::text = ANY (ARRAY['DEBIT', 'CREDIT', 'PIX', 'CASH']::text[])
      AND pagamento_1_tipo <> pagamento_2_tipo
      AND pagamento_1_valor > 0
      AND pagamento_2_valor > 0
      AND abs((pagamento_1_valor + pagamento_2_valor) - total_amount) <= 0.01
    )
  )
);

CREATE INDEX idx_sales_pagamento_dividido ON public.sales (estabelecimento_id, created_at)
  WHERE forma_pagamento_dividido;
