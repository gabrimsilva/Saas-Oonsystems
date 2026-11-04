-- ============================================================================
-- OONSYSTEMS SAAS: DATA DE ADESÃO GERA A MENSALIDADE
-- ============================================================================
-- Arquivo: 20261104122620_adesao_gera_mensalidade.sql
-- Descrição:
--   * tenants.plano_inicio passa a ser a data de adesão: vazia enquanto o
--     cliente não tem plano.
--   * Ao receber um plano sem data, a adesão é o dia atual; sem vencimento, o
--     primeiro vencimento é a adesão mais um ciclo.
--   * Ao perder o plano, adesão e vencimento são limpos: sem plano não há
--     mensalidade nem bloqueio por atraso.
--   * plataforma_definir_plano recebe a data de adesão (opcional).
-- Data: 04/11/2026
-- ============================================================================

ALTER TABLE public.tenants
    ALTER COLUMN plano_inicio DROP NOT NULL,
    ALTER COLUMN plano_inicio DROP DEFAULT;

COMMENT ON COLUMN public.tenants.plano_inicio IS 'Data de adesão ao plano; vazia enquanto o cliente não tem plano';

-- Ajuste de dados, não alteração feita por alguém: fica fora da auditoria
SELECT set_config('oon.auditoria_silenciosa', 'on', true);
UPDATE public.tenants SET plano_inicio = NULL, vigencia_ate = NULL WHERE plano_id IS NULL;
SELECT set_config('oon.auditoria_silenciosa', 'off', true);

-- ----------------------------------------------------------------------------
-- Adesão e primeiro vencimento acompanham o plano
-- ----------------------------------------------------------------------------
DROP TRIGGER trg_tenants_plano_inicio ON public.tenants;

CREATE OR REPLACE FUNCTION public.fn_tenants_plano_inicio()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_plano_novo BOOLEAN := NEW.plano_id IS NOT NULL
        AND (TG_OP = 'INSERT' OR OLD.plano_id IS NULL);
BEGIN
    IF NEW.plano_id IS NULL THEN
        NEW.plano_inicio := NULL;
        NEW.vigencia_ate := NULL;
        RETURN NEW;
    END IF;

    IF NEW.plano_inicio IS NULL THEN
        NEW.plano_inicio := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
    END IF;

    -- Fim do dia em Brasília: o vencimento vale o dia inteiro
    IF v_plano_novo AND NEW.vigencia_ate IS NULL THEN
        NEW.vigencia_ate := (
            NEW.plano_inicio
            + CASE WHEN NEW.ciclo = 'anual' THEN interval '1 year' ELSE interval '1 month' END
            + interval '23 hours 59 minutes 59 seconds'
        ) AT TIME ZONE 'America/Sao_Paulo';
    END IF;

    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_tenants_plano_inicio() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_tenants_plano_inicio
    BEFORE INSERT OR UPDATE OF plano_id, plano_inicio ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION public.fn_tenants_plano_inicio();

-- ----------------------------------------------------------------------------
-- Troca de plano: recebe a data de adesão (sem ela, mantém a atual)
-- ----------------------------------------------------------------------------
DROP FUNCTION public.plataforma_definir_plano(UUID, UUID, TEXT, TIMESTAMPTZ, BOOLEAN);

CREATE FUNCTION public.plataforma_definir_plano(
    p_tenant_id UUID,
    p_plano_id UUID,
    p_ciclo TEXT,
    p_vigencia_ate TIMESTAMPTZ,
    p_aplicar_modulos BOOLEAN DEFAULT true,
    p_plano_inicio DATE DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT public.fn_is_plataforma_admin() THEN
        RAISE EXCEPTION 'Acesso restrito à administração da plataforma' USING ERRCODE = '42501';
    END IF;

    UPDATE public.tenants
       SET plano_id = p_plano_id,
           ciclo = coalesce(p_ciclo, ciclo),
           vigencia_ate = p_vigencia_ate,
           plano_inicio = coalesce(p_plano_inicio, plano_inicio)
     WHERE id = p_tenant_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cliente não encontrado';
    END IF;

    IF p_aplicar_modulos AND p_plano_id IS NOT NULL THEN
        -- A troca de plano já fica no histórico (plano_alterado)
        PERFORM set_config('oon.auditoria_silenciosa', 'on', true);
        DELETE FROM public.tenant_modulos tm
         WHERE tm.tenant_id = p_tenant_id
           AND NOT EXISTS (SELECT 1 FROM public.plano_modulos pm WHERE pm.plano_id = p_plano_id AND pm.modulo = tm.modulo);
        INSERT INTO public.tenant_modulos (tenant_id, modulo)
        SELECT p_tenant_id, pm.modulo FROM public.plano_modulos pm WHERE pm.plano_id = p_plano_id
        ON CONFLICT DO NOTHING;
        PERFORM set_config('oon.auditoria_silenciosa', 'off', true);
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.plataforma_definir_plano(UUID, UUID, TEXT, TIMESTAMPTZ, BOOLEAN, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.plataforma_definir_plano(UUID, UUID, TEXT, TIMESTAMPTZ, BOOLEAN, DATE) TO authenticated, service_role;

-- A API passa a enxergar o novo parâmetro na hora
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- FIM DO ARQUIVO
-- ============================================================================
