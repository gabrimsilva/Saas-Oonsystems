-- ============================================================================
-- OONSYSTEMS SAAS: CONTAS A PAGAR DA PLATAFORMA
-- ============================================================================
-- Custos da OonSystems (hospedagem, Supabase, domínio, ferramentas, impostos...)
-- para o Financeiro calcular o lucro real (recebido - pago).
--
--   * plataforma_contas_pagar: cada conta com vencimento; paga quando pago_em
--     está preenchido. Contas recorrentes (mensal/anual) geram a próxima ao
--     serem pagas.
--   * plataforma_pagar_conta: registra o pagamento e cria a próxima conta da
--     recorrência (uma vez só).
--   * plataforma_desfazer_pagamento_conta: volta a conta para "a pagar" e
--     remove a próxima, se ela ainda não foi paga.
-- Acesso: só administradores da plataforma (fn_is_plataforma_admin).
-- ============================================================================

CREATE TABLE public.plataforma_contas_pagar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    descricao VARCHAR(120) NOT NULL,
    categoria VARCHAR(20) NOT NULL DEFAULT 'outros',
    fornecedor VARCHAR(120),
    valor NUMERIC(10,2) NOT NULL CHECK (valor >= 0),
    vencimento DATE NOT NULL,
    recorrencia VARCHAR(10) NOT NULL DEFAULT 'unica',
    pago_em DATE,
    valor_pago NUMERIC(10,2) CHECK (valor_pago >= 0),
    forma VARCHAR(20),
    observacao VARCHAR(300),
    conta_anterior_id UUID REFERENCES public.plataforma_contas_pagar(id) ON DELETE SET NULL,
    criado_por UUID DEFAULT auth.uid(),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT plataforma_contas_pagar_descricao CHECK (length(btrim(descricao)) > 0),
    CONSTRAINT plataforma_contas_pagar_categoria CHECK (categoria IN
        ('infraestrutura', 'ferramentas', 'marketing', 'impostos', 'pessoal', 'servicos', 'taxas', 'outros')),
    CONSTRAINT plataforma_contas_pagar_recorrencia CHECK (recorrencia IN ('unica', 'mensal', 'anual')),
    CONSTRAINT plataforma_contas_pagar_forma CHECK (forma IS NULL OR forma IN
        ('pix', 'boleto', 'cartao', 'transferencia', 'dinheiro', 'outro')),
    -- Paga = data e valor pagos juntos
    CONSTRAINT plataforma_contas_pagar_pagamento CHECK ((pago_em IS NULL) = (valor_pago IS NULL))
);

COMMENT ON TABLE public.plataforma_contas_pagar IS 'Custos da plataforma (contas a pagar); pago_em preenchido = conta paga';
COMMENT ON COLUMN public.plataforma_contas_pagar.conta_anterior_id IS 'Conta da recorrência que gerou esta (ao ser paga)';

CREATE INDEX idx_plataforma_contas_pagar_vencimento ON public.plataforma_contas_pagar (vencimento);
CREATE INDEX idx_plataforma_contas_pagar_pago_em ON public.plataforma_contas_pagar (pago_em);
CREATE UNIQUE INDEX uq_plataforma_contas_pagar_proxima ON public.plataforma_contas_pagar (conta_anterior_id)
    WHERE conta_anterior_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.fn_plataforma_contas_pagar_atualizado()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    NEW.atualizado_em := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_plataforma_contas_pagar_atualizado
    BEFORE UPDATE ON public.plataforma_contas_pagar
    FOR EACH ROW EXECUTE FUNCTION public.fn_plataforma_contas_pagar_atualizado();

ALTER TABLE public.plataforma_contas_pagar ENABLE ROW LEVEL SECURITY;

CREATE POLICY plataforma_contas_pagar_select ON public.plataforma_contas_pagar
    FOR SELECT TO authenticated USING (public.fn_is_plataforma_admin());
CREATE POLICY plataforma_contas_pagar_insert ON public.plataforma_contas_pagar
    FOR INSERT TO authenticated WITH CHECK (public.fn_is_plataforma_admin());
CREATE POLICY plataforma_contas_pagar_update ON public.plataforma_contas_pagar
    FOR UPDATE TO authenticated USING (public.fn_is_plataforma_admin()) WITH CHECK (public.fn_is_plataforma_admin());
CREATE POLICY plataforma_contas_pagar_delete ON public.plataforma_contas_pagar
    FOR DELETE TO authenticated USING (public.fn_is_plataforma_admin());

REVOKE ALL ON public.plataforma_contas_pagar FROM anon;

-- ----------------------------------------------------------------------------
-- Pagar (e gerar a próxima da recorrência)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.plataforma_pagar_conta(
    p_id UUID,
    p_pago_em DATE,
    p_valor_pago NUMERIC,
    p_forma VARCHAR
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_conta public.plataforma_contas_pagar%ROWTYPE;
    v_proxima UUID;
BEGIN
    IF NOT public.fn_is_plataforma_admin() THEN
        RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
    END IF;
    IF p_pago_em IS NULL OR p_valor_pago IS NULL OR p_valor_pago < 0 THEN
        RAISE EXCEPTION 'Informe a data e o valor pago';
    END IF;

    SELECT * INTO v_conta FROM public.plataforma_contas_pagar WHERE id = p_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Conta não encontrada';
    END IF;
    IF v_conta.pago_em IS NOT NULL THEN
        RAISE EXCEPTION 'Esta conta já foi paga';
    END IF;

    UPDATE public.plataforma_contas_pagar
       SET pago_em = p_pago_em, valor_pago = round(p_valor_pago, 2), forma = p_forma
     WHERE id = p_id;

    IF v_conta.recorrencia <> 'unica' THEN
        INSERT INTO public.plataforma_contas_pagar
            (descricao, categoria, fornecedor, valor, vencimento, recorrencia, observacao, conta_anterior_id, criado_por)
        VALUES
            (v_conta.descricao, v_conta.categoria, v_conta.fornecedor, v_conta.valor,
             (v_conta.vencimento + CASE WHEN v_conta.recorrencia = 'anual' THEN interval '1 year' ELSE interval '1 month' END)::date,
             v_conta.recorrencia, v_conta.observacao, v_conta.id, auth.uid())
        ON CONFLICT (conta_anterior_id) WHERE conta_anterior_id IS NOT NULL DO NOTHING
        RETURNING id INTO v_proxima;
    END IF;

    RETURN v_proxima;
END;
$$;

-- ----------------------------------------------------------------------------
-- Desfazer pagamento
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.plataforma_desfazer_pagamento_conta(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT public.fn_is_plataforma_admin() THEN
        RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
    END IF;

    IF EXISTS (SELECT 1 FROM public.plataforma_contas_pagar WHERE conta_anterior_id = p_id AND pago_em IS NOT NULL) THEN
        RAISE EXCEPTION 'A próxima conta desta recorrência já foi paga; desfaça aquela primeiro';
    END IF;

    DELETE FROM public.plataforma_contas_pagar WHERE conta_anterior_id = p_id AND pago_em IS NULL;

    UPDATE public.plataforma_contas_pagar
       SET pago_em = NULL, valor_pago = NULL, forma = NULL
     WHERE id = p_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Conta não encontrada';
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.plataforma_pagar_conta(UUID, DATE, NUMERIC, VARCHAR) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.plataforma_desfazer_pagamento_conta(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.plataforma_pagar_conta(UUID, DATE, NUMERIC, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.plataforma_desfazer_pagamento_conta(UUID) TO authenticated;
