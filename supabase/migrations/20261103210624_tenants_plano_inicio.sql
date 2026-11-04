-- ============================================================================
-- OONSYSTEMS SAAS: DATA DE INÍCIO DO PLANO DO CLIENTE
-- ============================================================================
-- Arquivo: 20261103210624_tenants_plano_inicio.sql
-- Descrição:
--   * tenants.plano_inicio: dia em que o plano do cliente começou. Informativo:
--     não altera o vencimento (vigencia_ate) nem o bloqueio por atraso.
--   * Clientes existentes e novos usam a data do cadastro (horário de Brasília)
--     até a plataforma informar outra.
--   * Ao receber um plano (plano_id de vazio para preenchido, pela plataforma ou
--     pelo pagamento online), o início passa a ser o dia atual, salvo se a mesma
--     alteração já informar outra data.
--   * plataforma_listar_clientes devolve o campo e fn_tenants_auditoria registra
--     as alterações.
-- Data: 03/11/2026
-- ============================================================================

ALTER TABLE public.tenants ADD COLUMN plano_inicio DATE;

-- Preenchimento inicial não é alteração feita por alguém: fica fora da auditoria
SELECT set_config('oon.auditoria_silenciosa', 'on', true);
UPDATE public.tenants
   SET plano_inicio = (criado_em AT TIME ZONE 'America/Sao_Paulo')::date;
SELECT set_config('oon.auditoria_silenciosa', 'off', true);

ALTER TABLE public.tenants
    ALTER COLUMN plano_inicio SET DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
    ALTER COLUMN plano_inicio SET NOT NULL;

COMMENT ON COLUMN public.tenants.plano_inicio IS 'Dia em que o plano começou (informativo: não altera vencimento nem bloqueio)';

-- ----------------------------------------------------------------------------
-- Cliente sem plano que recebe um plano: o início é o dia atual
-- ----------------------------------------------------------------------------
CREATE FUNCTION public.fn_tenants_plano_inicio()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF OLD.plano_id IS NULL AND NEW.plano_id IS NOT NULL
       AND NEW.plano_inicio IS NOT DISTINCT FROM OLD.plano_inicio THEN
        NEW.plano_inicio := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
    END IF;
    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_tenants_plano_inicio() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_tenants_plano_inicio
    BEFORE UPDATE OF plano_id ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION public.fn_tenants_plano_inicio();

-- ----------------------------------------------------------------------------
-- Auditoria: inclui plano_inicio
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_tenants_auditoria()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_campos TEXT[] := ARRAY['status', 'plano_id', 'ciclo', 'plano_inicio', 'vigencia_ate', 'trial_ate', 'motivo_bloqueio',
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
        WHEN v_mudancas ?| ARRAY['plano_id', 'ciclo', 'plano_inicio', 'vigencia_ate'] THEN 'plano_alterado'
        WHEN v_mudancas ? 'trial_ate' THEN 'teste_alterado'
        ELSE 'dados_alterados'
    END;

    PERFORM public.fn_auditar_plataforma(NEW.id, coalesce(NEW.nome_fantasia, NEW.razao_social), v_acao, v_mudancas);
    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_tenants_auditoria() FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Listagem: devolve plano_inicio
-- ----------------------------------------------------------------------------
DROP FUNCTION public.plataforma_listar_clientes();
CREATE FUNCTION public.plataforma_listar_clientes()
RETURNS TABLE (
    id UUID,
    documento TEXT,
    tipo_pessoa CHAR(2),
    razao_social VARCHAR,
    nome_fantasia VARCHAR,
    slug VARCHAR,
    email VARCHAR,
    telefone VARCHAR,
    cidade VARCHAR,
    uf CHAR(2),
    status VARCHAR,
    motivo_bloqueio VARCHAR,
    origem VARCHAR,
    trial_ate TIMESTAMPTZ,
    plano_id UUID,
    plano_nome VARCHAR,
    ciclo VARCHAR,
    plano_inicio DATE,
    vigencia_ate TIMESTAMPTZ,
    observacoes TEXT,
    criado_em TIMESTAMPTZ,
    qtd_estabelecimentos BIGINT,
    qtd_usuarios BIGINT,
    qtd_produtos BIGINT,
    ultimo_acesso TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT public.fn_is_plataforma_admin() THEN
        RAISE EXCEPTION 'Acesso restrito à administração da plataforma' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT t.id, t.documento, t.tipo_pessoa, t.razao_social, t.nome_fantasia,
           t.slug, t.email, t.telefone, t.cidade, t.uf, t.status, t.motivo_bloqueio,
           t.origem, t.trial_ate, t.plano_id, p.nome, t.ciclo, t.plano_inicio, t.vigencia_ate, t.observacoes, t.criado_em,
           (SELECT count(*) FROM public.estabelecimentos e WHERE e.tenant_id = t.id),
           (SELECT count(*) FROM public.usuarios_estabelecimento ue WHERE ue.tenant_id = t.id),
           (SELECT count(*) FROM public.produtos pr
              JOIN public.estabelecimentos e ON e.id = pr.estabelecimento_id
             WHERE e.tenant_id = t.id),
           (SELECT max(u.last_sign_in_at) FROM public.usuarios_estabelecimento ue
              JOIN auth.users u ON u.id = ue.user_id
             WHERE ue.tenant_id = t.id)
      FROM public.tenants t
      LEFT JOIN public.planos p ON p.id = t.plano_id
     ORDER BY t.criado_em DESC;
END;
$$;

COMMENT ON FUNCTION public.plataforma_listar_clientes() IS 'Lista os clientes com plano, início, vigência e totais agregados (apenas admin da plataforma)';
REVOKE EXECUTE ON FUNCTION public.plataforma_listar_clientes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.plataforma_listar_clientes() TO authenticated, service_role;

-- ============================================================================
-- FIM DO ARQUIVO
-- ============================================================================
