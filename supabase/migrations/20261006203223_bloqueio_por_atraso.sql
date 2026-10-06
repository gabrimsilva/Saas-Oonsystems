-- ============================================================================
-- OONSYSTEMS SAAS: BLOQUEIO AUTOMÁTICO POR MENSALIDADE EM ATRASO
-- ============================================================================
-- Arquivo: 20261006203223_bloqueio_por_atraso.sql
-- Descrição:
--   * fn_tenant_liberado passa a exigir, para clientes ativos, que o
--     vencimento (tenants.vigencia_ate) mais a tolerância não tenha passado.
--     Sem vencimento definido o cliente continua liberado.
--   * O bloqueio é calculado (o status continua 'ativo'): ao registrar o
--     pagamento o vencimento avança e o acesso volta na hora.
--   * fn_dias_tolerancia_atraso: tolerância em dias. Manter igual a
--     DIAS_TOLERANCIA_ATRASO em src/services/plataformaService.ts.
-- Data: 06/10/2026
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_dias_tolerancia_atraso()
RETURNS INT
LANGUAGE sql IMMUTABLE
SET search_path = ''
AS $$ SELECT 5 $$;

COMMENT ON FUNCTION public.fn_dias_tolerancia_atraso() IS
    'Dias após o vencimento da mensalidade em que o cliente ainda tem acesso';

CREATE OR REPLACE FUNCTION public.fn_tenant_liberado(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.tenants t
        WHERE t.id = p_tenant_id
          AND (
                (t.status = 'ativo'
                 AND (t.vigencia_ate IS NULL
                      OR t.vigencia_ate + make_interval(days => public.fn_dias_tolerancia_atraso()) > now()))
             OR (t.status = 'trial' AND (t.trial_ate IS NULL OR t.trial_ate > now()))
          )
    );
$$;

COMMENT ON FUNCTION public.fn_tenant_liberado(UUID) IS
    'True se o tenant está em teste dentro do prazo, ou ativo sem mensalidade atrasada além da tolerância';

REVOKE EXECUTE ON FUNCTION public.fn_tenant_liberado(UUID) FROM PUBLIC, anon, authenticated;

-- ============================================================================
-- FIM DO ARQUIVO
-- ============================================================================
