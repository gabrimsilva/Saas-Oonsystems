-- ============================================================================
-- OONSYSTEMS SAAS: PEDIDOS ENTREGUES VÃO PARA O HISTÓRICO PELO BANCO
-- ============================================================================
-- Antes, os pedidos "Finalizado" (Entregues no Kanban) só iam para o
-- historico_geral à meia-noite e pelo navegador: se ninguém estivesse com a
-- tela de Pedidos aberta entre 00:00 e 00:05, ficavam presos para sempre.
--
--   * fn_arquivar_pedidos_finalizados(): move para o histórico os pedidos
--     entregues ANTES de hoje (horário de Brasília). Os de hoje continuam na
--     coluna "Entregues" do Kanban. Não duplica se o pedido já está no histórico.
--   * pg_cron roda a função todo dia às 00:05 de Brasília (03:05 UTC).
--   * Roda uma vez agora para liberar os pedidos que ficaram presos.
-- Cancelados continuam como antes (a tela de Histórico já os mostra).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_arquivar_pedidos_finalizados()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    -- Início de hoje em Brasília
    v_corte TIMESTAMPTZ := date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
    v_movidos INTEGER;
BEGIN
    WITH alvo AS (
        SELECT p.*
          FROM public.pedidos p
         WHERE p.status = 'Finalizado'
           AND NOT coalesce(p.cancelado, false)
           AND coalesce(p.atualizado_em, p.criado_em) < v_corte
         FOR UPDATE SKIP LOCKED
    ), copiados AS (
        INSERT INTO public.historico_geral (
            pedido_id, codigo_pedido, cliente_nome, cliente_sobrenome, cliente_telefone, cliente_email,
            cliente_cep, cliente_endereco, cliente_numero, cliente_complemento, cliente_bairro, cliente_cidade,
            cliente_estado, entrega_domicilio, forma_pagamento, precisa_troco, valor_troco, subtotal,
            taxa_entrega, total, itens, status, previsao_entrega, observacoes, cliente_id, cliente_cpf,
            criado_em, atualizado_em, movido_em, taxa_extra_km, desconto, tipo_desconto,
            forma_pagamento_dividido, pagamento_1_tipo, pagamento_1_valor, pagamento_2_tipo, pagamento_2_valor,
            estabelecimento_id
        )
        SELECT
            a.pedido_id, a.codigo_pedido, a.cliente_nome, a.cliente_sobrenome, a.cliente_telefone, a.cliente_email,
            a.cliente_cep, a.cliente_endereco, a.cliente_numero, a.cliente_complemento, a.cliente_bairro, a.cliente_cidade,
            a.cliente_estado, a.entrega_domicilio, a.forma_pagamento, a.precisa_troco, a.valor_troco, a.subtotal,
            a.taxa_entrega, a.total, a.itens, 'Finalizado', a.previsao_entrega, a.observacoes, a.cliente_id, a.cliente_cpf,
            a.criado_em, a.atualizado_em,
            -- Ordem do histórico pela entrega (não pelo dia em que foi arquivado)
            coalesce(a.atualizado_em, now()),
            coalesce(a.taxa_extra_km, 0), coalesce(a.desconto, 0), coalesce(a.tipo_desconto, 'valor'),
            coalesce(a.forma_pagamento_dividido, false), a.pagamento_1_tipo, a.pagamento_1_valor, a.pagamento_2_tipo, a.pagamento_2_valor,
            a.estabelecimento_id
          FROM alvo a
         WHERE NOT EXISTS (
            SELECT 1 FROM public.historico_geral h
             WHERE h.pedido_id = a.pedido_id AND h.estabelecimento_id = a.estabelecimento_id
         )
        RETURNING 1
    )
    DELETE FROM public.pedidos p
     USING alvo a
     WHERE p.id = a.id;

    GET DIAGNOSTICS v_movidos = ROW_COUNT;
    RETURN v_movidos;
END;
$$;

COMMENT ON FUNCTION public.fn_arquivar_pedidos_finalizados() IS
    'Move para historico_geral os pedidos Finalizado (Entregues) de antes de hoje (Brasília). Rodada diariamente pelo pg_cron.';

REVOKE EXECUTE ON FUNCTION public.fn_arquivar_pedidos_finalizados() FROM PUBLIC, anon, authenticated;

-- Agendamento diário (00:05 em Brasília = 03:05 UTC)
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'arquivar-pedidos-finalizados';
SELECT cron.schedule('arquivar-pedidos-finalizados', '5 3 * * *', $$SELECT public.fn_arquivar_pedidos_finalizados()$$);

-- Libera agora os pedidos entregues que ficaram presos
SELECT public.fn_arquivar_pedidos_finalizados();
