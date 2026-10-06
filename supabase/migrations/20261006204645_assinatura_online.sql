-- ============================================================================
-- OONSYSTEMS SAAS: PAGAMENTO ONLINE DA MENSALIDADE (MERCADO PAGO)
-- ============================================================================
-- Arquivo: 20261006204645_assinatura_online.sql
-- Descrição:
--   * plataforma_cobrancas: cobranças geradas pelo cliente em "Meu plano"
--     (ou no login, quando o acesso está suspenso). Cada uma vira uma
--     preferência do Checkout Pro da conta Mercado Pago da OonSystems.
--   * fn_confirmar_cobranca: chamada só pela Edge Function `assinatura`
--     (service_role) com o pagamento aprovado lido da API do Mercado Pago.
--     Registra o pagamento em plataforma_pagamentos, avança o vencimento,
--     ativa o cliente em teste e aplica o plano escolhido. Idempotente.
--   * Próximo vencimento: um ciclo a partir do vencimento atual (mantém o
--     dia). Se o acesso estava suspenso por atraso, ou o cliente vem do
--     teste, conta a partir do pagamento (ou do fim do teste, se ainda não
--     acabou).
-- Data: 06/10/2026
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Cobranças
-- ----------------------------------------------------------------------------
CREATE TABLE public.plataforma_cobrancas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    plano_id UUID NOT NULL REFERENCES public.planos(id),
    ciclo VARCHAR(10) NOT NULL,
    valor NUMERIC(10,2) NOT NULL CHECK (valor > 0),
    status VARCHAR(12) NOT NULL DEFAULT 'pendente',
    mp_preference_id VARCHAR(80),
    mp_payment_id VARCHAR(40) UNIQUE,
    pagamento_id UUID REFERENCES public.plataforma_pagamentos(id) ON DELETE SET NULL,
    criado_por UUID,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    pago_em TIMESTAMPTZ,
    CONSTRAINT plataforma_cobrancas_ciclo_valido CHECK (ciclo IN ('mensal', 'anual')),
    CONSTRAINT plataforma_cobrancas_status_valido CHECK (status IN ('pendente', 'paga', 'cancelada'))
);

COMMENT ON TABLE public.plataforma_cobrancas IS 'Cobranças online da mensalidade (Checkout Pro da OonSystems)';

CREATE INDEX idx_plataforma_cobrancas_tenant ON public.plataforma_cobrancas (tenant_id, criado_em DESC);

ALTER TABLE public.plataforma_cobrancas ENABLE ROW LEVEL SECURITY;

CREATE POLICY plataforma_cobrancas_select ON public.plataforma_cobrancas
    FOR SELECT TO authenticated
    USING (public.fn_is_plataforma_admin());

REVOKE INSERT, UPDATE, DELETE ON public.plataforma_cobrancas FROM anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. Confirmação do pagamento (somente service_role)
-- ----------------------------------------------------------------------------
CREATE FUNCTION public.fn_confirmar_cobranca(
    p_cobranca_id UUID,
    p_mp_payment_id TEXT,
    p_valor NUMERIC,
    p_forma TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_cob public.plataforma_cobrancas;
    v_tenant public.tenants;
    v_base TIMESTAMPTZ;
    v_novo TIMESTAMPTZ;
    v_status TEXT;
    v_pagamento UUID;
    v_bloqueado BOOLEAN;
BEGIN
    SELECT * INTO v_cob FROM public.plataforma_cobrancas WHERE id = p_cobranca_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cobrança não encontrada';
    END IF;
    -- Webhook e retorno do checkout podem chegar juntos
    IF v_cob.status = 'paga' THEN
        RETURN v_cob.pagamento_id;
    END IF;
    IF p_valor < v_cob.valor - 0.01 THEN
        RAISE EXCEPTION 'Valor pago (%) menor que o da cobrança (%)', p_valor, v_cob.valor;
    END IF;

    SELECT * INTO v_tenant FROM public.tenants WHERE id = v_cob.tenant_id FOR UPDATE;

    v_bloqueado := v_tenant.status = 'ativo' AND v_tenant.vigencia_ate IS NOT NULL
        AND v_tenant.vigencia_ate + make_interval(days => public.fn_dias_tolerancia_atraso()) <= now();

    v_base := CASE
        WHEN v_tenant.status = 'trial' THEN greatest(now(), coalesce(v_tenant.trial_ate, now()))
        WHEN v_tenant.vigencia_ate IS NULL OR v_bloqueado THEN now()
        ELSE v_tenant.vigencia_ate
    END;
    -- Sem vencimento anterior: vence no fim do dia (igual ao registro manual)
    IF v_tenant.status = 'trial' OR v_tenant.vigencia_ate IS NULL OR v_bloqueado THEN
        v_base := (date_trunc('day', v_base AT TIME ZONE 'America/Sao_Paulo') + interval '23 hours 59 minutes 59 seconds')
                  AT TIME ZONE 'America/Sao_Paulo';
    END IF;
    v_novo := v_base + CASE WHEN v_cob.ciclo = 'anual' THEN interval '1 year' ELSE interval '1 month' END;

    v_status := CASE WHEN v_tenant.status IN ('trial', 'ativo') THEN 'ativo' ELSE v_tenant.status END;

    INSERT INTO public.plataforma_pagamentos (
        tenant_id, valor, pago_em, forma, periodos, ciclo, plano_id,
        vencimento_anterior, vencimento_novo, observacao, registrado_por
    ) VALUES (
        v_tenant.id, p_valor, (now() AT TIME ZONE 'America/Sao_Paulo')::date,
        CASE WHEN p_forma IN ('pix', 'boleto', 'cartao') THEN p_forma ELSE 'outro' END,
        1, v_cob.ciclo, v_cob.plano_id, v_tenant.vigencia_ate, v_novo,
        'Pago online (Mercado Pago #' || p_mp_payment_id || ')', NULL
    )
    RETURNING id INTO v_pagamento;

    PERFORM set_config('oon.auditoria_silenciosa', 'on', true);
    UPDATE public.tenants
       SET vigencia_ate = v_novo,
           status = v_status,
           plano_id = v_cob.plano_id,
           ciclo = v_cob.ciclo
     WHERE id = v_tenant.id;

    -- Plano novo ou trocado: módulos passam a ser os do plano
    IF v_tenant.plano_id IS DISTINCT FROM v_cob.plano_id THEN
        DELETE FROM public.tenant_modulos tm
         WHERE tm.tenant_id = v_tenant.id
           AND NOT EXISTS (SELECT 1 FROM public.plano_modulos pm WHERE pm.plano_id = v_cob.plano_id AND pm.modulo = tm.modulo);
        INSERT INTO public.tenant_modulos (tenant_id, modulo)
        SELECT v_tenant.id, pm.modulo FROM public.plano_modulos pm WHERE pm.plano_id = v_cob.plano_id
        ON CONFLICT DO NOTHING;
    END IF;
    PERFORM set_config('oon.auditoria_silenciosa', 'off', true);

    UPDATE public.plataforma_cobrancas
       SET status = 'paga', pago_em = now(), mp_payment_id = p_mp_payment_id, pagamento_id = v_pagamento
     WHERE id = v_cob.id;

    PERFORM public.fn_auditar_plataforma(
        v_tenant.id, coalesce(v_tenant.nome_fantasia, v_tenant.razao_social), 'pagamento_registrado',
        jsonb_build_object(
            'valor', p_valor,
            'forma', p_forma,
            'origem', 'mercado_pago',
            'mp_payment_id', p_mp_payment_id,
            'vigencia_ate', jsonb_build_object('de', v_tenant.vigencia_ate, 'para', v_novo))
        || CASE WHEN v_status <> v_tenant.status
                THEN jsonb_build_object('status', jsonb_build_object('de', v_tenant.status, 'para', v_status))
                ELSE '{}'::jsonb END
        || CASE WHEN v_tenant.plano_id IS DISTINCT FROM v_cob.plano_id
                THEN jsonb_build_object('plano_id', jsonb_build_object('de', v_tenant.plano_id, 'para', v_cob.plano_id))
                ELSE '{}'::jsonb END);

    RETURN v_pagamento;
END;
$$;

COMMENT ON FUNCTION public.fn_confirmar_cobranca(UUID, TEXT, NUMERIC, TEXT) IS
    'Confirma a cobrança online paga: registra o pagamento, avança o vencimento e aplica o plano (só service_role)';
REVOKE EXECUTE ON FUNCTION public.fn_confirmar_cobranca(UUID, TEXT, NUMERIC, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_confirmar_cobranca(UUID, TEXT, NUMERIC, TEXT) TO service_role;

-- ============================================================================
-- FIM DO ARQUIVO
-- ============================================================================
