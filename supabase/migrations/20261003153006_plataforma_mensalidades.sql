-- ============================================================================
-- OONSYSTEMS SAAS: CONTROLE DE MENSALIDADES DOS CLIENTES
-- ============================================================================
-- Arquivo: 20261003153006_plataforma_mensalidades.sql
-- Descrição:
--   * plataforma_pagamentos: pagamentos de mensalidade/anuidade recebidos dos
--     clientes. Cada pagamento guarda o vencimento que quitou e a nova data de
--     vencimento (tenants.vigencia_ate passa a ser o próximo vencimento).
--   * plataforma_registrar_pagamento: grava o pagamento, avança o vencimento
--     e, se pedido, libera o acesso do cliente (status ativo).
--   * plataforma_estornar_pagamento: desfaz o último pagamento do cliente e
--     devolve o vencimento anterior.
--   * fn_tenants_auditoria passa a respeitar oon.auditoria_silenciosa em
--     UPDATE (o pagamento já registra a mudança de vencimento/status).
-- Data: 02/10/2026
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Pagamentos
-- ----------------------------------------------------------------------------
CREATE TABLE public.plataforma_pagamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    valor NUMERIC(10,2) NOT NULL CHECK (valor >= 0),
    pago_em DATE NOT NULL,
    forma VARCHAR(20) NOT NULL DEFAULT 'pix',
    periodos INT NOT NULL DEFAULT 1 CHECK (periodos BETWEEN 1 AND 24),
    ciclo VARCHAR(10) NOT NULL,
    plano_id UUID REFERENCES public.planos(id) ON DELETE SET NULL,
    vencimento_anterior TIMESTAMPTZ,
    vencimento_novo TIMESTAMPTZ NOT NULL,
    observacao VARCHAR(300),
    registrado_por UUID,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    estornado_em TIMESTAMPTZ,
    estornado_por UUID,
    motivo_estorno VARCHAR(300),
    CONSTRAINT plataforma_pagamentos_forma_valida
        CHECK (forma IN ('pix', 'boleto', 'cartao', 'transferencia', 'dinheiro', 'outro')),
    CONSTRAINT plataforma_pagamentos_ciclo_valido CHECK (ciclo IN ('mensal', 'anual'))
);

COMMENT ON TABLE public.plataforma_pagamentos IS 'Mensalidades/anuidades recebidas dos clientes (estornadas ficam no histórico)';
COMMENT ON COLUMN public.plataforma_pagamentos.vencimento_anterior IS 'Vencimento quitado por este pagamento (vigencia_ate antes do pagamento)';
COMMENT ON COLUMN public.plataforma_pagamentos.vencimento_novo IS 'Próximo vencimento após o pagamento (vigencia_ate depois do pagamento)';

CREATE INDEX idx_plataforma_pagamentos_tenant ON public.plataforma_pagamentos (tenant_id, criado_em DESC);
CREATE INDEX idx_plataforma_pagamentos_pago_em ON public.plataforma_pagamentos (pago_em DESC);

ALTER TABLE public.plataforma_pagamentos ENABLE ROW LEVEL SECURITY;

-- Leitura só pela plataforma; gravação só pelas funções abaixo
CREATE POLICY plataforma_pagamentos_select ON public.plataforma_pagamentos
    FOR SELECT TO authenticated
    USING (public.fn_is_plataforma_admin());

REVOKE INSERT, UPDATE, DELETE ON public.plataforma_pagamentos FROM anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. Auditoria de tenants: UPDATE silencioso quando a função já registra
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_tenants_auditoria()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_campos TEXT[] := ARRAY['status', 'plano_id', 'ciclo', 'vigencia_ate', 'trial_ate', 'motivo_bloqueio',
                             'razao_social', 'nome_fantasia', 'documento', 'email', 'telefone', 'cidade', 'uf',
                             'slug', 'observacoes'];
    v_campo TEXT;
    v_de JSONB;
    v_para JSONB;
    v_mudancas JSONB := '{}'::jsonb;
    v_acao TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.fn_auditar_plataforma(NEW.id, coalesce(NEW.nome_fantasia, NEW.razao_social), 'cliente_criado',
            jsonb_build_object('origem', NEW.origem, 'status', NEW.status, 'trial_ate', NEW.trial_ate));
        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        PERFORM public.fn_auditar_plataforma(OLD.id, coalesce(OLD.nome_fantasia, OLD.razao_social), 'cliente_excluido',
            jsonb_build_object('documento', OLD.documento, 'slug', OLD.slug));
        RETURN OLD;
    END IF;

    -- A função que fez a alteração já gravou o próprio evento
    IF current_setting('oon.auditoria_silenciosa', true) = 'on' THEN
        RETURN NEW;
    END IF;

    FOREACH v_campo IN ARRAY v_campos LOOP
        v_de := to_jsonb(OLD) -> v_campo;
        v_para := to_jsonb(NEW) -> v_campo;
        IF v_de IS DISTINCT FROM v_para THEN
            v_mudancas := v_mudancas || jsonb_build_object(v_campo, jsonb_build_object('de', v_de, 'para', v_para));
        END IF;
    END LOOP;

    IF v_mudancas = '{}'::jsonb THEN
        RETURN NEW;
    END IF;

    v_acao := CASE
        WHEN v_mudancas ? 'status' THEN 'status_alterado'
        WHEN v_mudancas ?| ARRAY['plano_id', 'ciclo', 'vigencia_ate'] THEN 'plano_alterado'
        WHEN v_mudancas ? 'trial_ate' THEN 'teste_alterado'
        ELSE 'dados_alterados'
    END;

    PERFORM public.fn_auditar_plataforma(NEW.id, coalesce(NEW.nome_fantasia, NEW.razao_social), v_acao, v_mudancas);
    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_tenants_auditoria() FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. Registrar pagamento
-- O próximo vencimento vem da tela (o admin vê e pode ajustar a data).
-- ----------------------------------------------------------------------------
CREATE FUNCTION public.plataforma_registrar_pagamento(
    p_tenant_id UUID,
    p_valor NUMERIC,
    p_pago_em DATE,
    p_forma TEXT,
    p_periodos INT,
    p_vencimento_novo TIMESTAMPTZ,
    p_observacao TEXT DEFAULT NULL,
    p_liberar_acesso BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_tenant public.tenants;
    v_id UUID;
    v_status_novo TEXT;
    v_detalhes JSONB;
BEGIN
    IF NOT public.fn_is_plataforma_admin() THEN
        RAISE EXCEPTION 'Acesso restrito à administração da plataforma' USING ERRCODE = '42501';
    END IF;
    IF p_vencimento_novo IS NULL THEN
        RAISE EXCEPTION 'Informe o próximo vencimento';
    END IF;
    IF p_pago_em IS NULL THEN
        RAISE EXCEPTION 'Informe a data do pagamento';
    END IF;

    SELECT * INTO v_tenant FROM public.tenants WHERE id = p_tenant_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cliente não encontrado';
    END IF;
    IF v_tenant.vigencia_ate IS NOT NULL AND p_vencimento_novo <= v_tenant.vigencia_ate THEN
        RAISE EXCEPTION 'O próximo vencimento deve ser depois do vencimento atual';
    END IF;

    INSERT INTO public.plataforma_pagamentos (
        tenant_id, valor, pago_em, forma, periodos, ciclo, plano_id,
        vencimento_anterior, vencimento_novo, observacao, registrado_por
    ) VALUES (
        p_tenant_id, p_valor, p_pago_em, coalesce(p_forma, 'pix'), coalesce(p_periodos, 1), v_tenant.ciclo,
        v_tenant.plano_id, v_tenant.vigencia_ate, p_vencimento_novo, nullif(trim(p_observacao), ''), auth.uid()
    )
    RETURNING id INTO v_id;

    v_status_novo := CASE
        WHEN p_liberar_acesso AND v_tenant.status <> 'ativo' THEN 'ativo'
        ELSE v_tenant.status
    END;

    PERFORM set_config('oon.auditoria_silenciosa', 'on', true);
    UPDATE public.tenants
       SET vigencia_ate = p_vencimento_novo,
           status = v_status_novo,
           motivo_bloqueio = CASE WHEN v_status_novo = 'ativo' THEN NULL ELSE motivo_bloqueio END
     WHERE id = p_tenant_id;
    PERFORM set_config('oon.auditoria_silenciosa', 'off', true);

    v_detalhes := jsonb_build_object(
        'valor', p_valor,
        'forma', coalesce(p_forma, 'pix'),
        'pago_em', p_pago_em,
        'vigencia_ate', jsonb_build_object('de', v_tenant.vigencia_ate, 'para', p_vencimento_novo));
    IF v_status_novo <> v_tenant.status THEN
        v_detalhes := v_detalhes || jsonb_build_object('status', jsonb_build_object('de', v_tenant.status, 'para', v_status_novo));
    END IF;

    PERFORM public.fn_auditar_plataforma(
        p_tenant_id, coalesce(v_tenant.nome_fantasia, v_tenant.razao_social), 'pagamento_registrado', v_detalhes);

    RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.plataforma_registrar_pagamento(UUID, NUMERIC, DATE, TEXT, INT, TIMESTAMPTZ, TEXT, BOOLEAN) IS
    'Registra o pagamento da mensalidade e avança o vencimento do cliente (apenas admin da plataforma)';
REVOKE EXECUTE ON FUNCTION public.plataforma_registrar_pagamento(UUID, NUMERIC, DATE, TEXT, INT, TIMESTAMPTZ, TEXT, BOOLEAN) FROM PUBLIC, anon;

-- ----------------------------------------------------------------------------
-- 4. Estornar pagamento (só o último válido do cliente, para manter o
--    vencimento coerente). O status do cliente não é alterado.
-- ----------------------------------------------------------------------------
CREATE FUNCTION public.plataforma_estornar_pagamento(p_pagamento_id UUID, p_motivo TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_pag public.plataforma_pagamentos;
    v_tenant public.tenants;
BEGIN
    IF NOT public.fn_is_plataforma_admin() THEN
        RAISE EXCEPTION 'Acesso restrito à administração da plataforma' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_pag FROM public.plataforma_pagamentos WHERE id = p_pagamento_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pagamento não encontrado';
    END IF;
    IF v_pag.estornado_em IS NOT NULL THEN
        RAISE EXCEPTION 'Este pagamento já foi estornado';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.plataforma_pagamentos p
         WHERE p.tenant_id = v_pag.tenant_id AND p.estornado_em IS NULL AND p.criado_em > v_pag.criado_em
    ) THEN
        RAISE EXCEPTION 'Só é possível estornar o último pagamento do cliente';
    END IF;

    SELECT * INTO v_tenant FROM public.tenants WHERE id = v_pag.tenant_id FOR UPDATE;

    UPDATE public.plataforma_pagamentos
       SET estornado_em = now(), estornado_por = auth.uid(), motivo_estorno = nullif(trim(p_motivo), '')
     WHERE id = p_pagamento_id;

    -- Só volta o vencimento se ninguém o alterou depois do pagamento
    IF v_tenant.vigencia_ate IS NOT DISTINCT FROM v_pag.vencimento_novo THEN
        PERFORM set_config('oon.auditoria_silenciosa', 'on', true);
        UPDATE public.tenants SET vigencia_ate = v_pag.vencimento_anterior WHERE id = v_pag.tenant_id;
        PERFORM set_config('oon.auditoria_silenciosa', 'off', true);
    END IF;

    PERFORM public.fn_auditar_plataforma(
        v_pag.tenant_id, coalesce(v_tenant.nome_fantasia, v_tenant.razao_social), 'pagamento_estornado',
        jsonb_build_object(
            'valor', v_pag.valor,
            'pago_em', v_pag.pago_em,
            'motivo', nullif(trim(p_motivo), ''),
            'vigencia_ate', jsonb_build_object(
                'de', v_tenant.vigencia_ate,
                'para', CASE WHEN v_tenant.vigencia_ate IS NOT DISTINCT FROM v_pag.vencimento_novo
                             THEN v_pag.vencimento_anterior ELSE v_tenant.vigencia_ate END)));
END;
$$;

COMMENT ON FUNCTION public.plataforma_estornar_pagamento(UUID, TEXT) IS
    'Estorna o último pagamento do cliente e devolve o vencimento anterior (apenas admin da plataforma)';
REVOKE EXECUTE ON FUNCTION public.plataforma_estornar_pagamento(UUID, TEXT) FROM PUBLIC, anon;

-- ============================================================================
-- FIM DO ARQUIVO
-- ============================================================================
