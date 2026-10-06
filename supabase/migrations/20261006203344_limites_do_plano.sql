-- ============================================================================
-- OONSYSTEMS SAAS: LIMITES DO PLANO (ESTABELECIMENTOS E USUÁRIOS)
-- ============================================================================
-- Arquivo: 20261006203344_limites_do_plano.sql
-- Descrição:
--   * planos.max_estabelecimentos / max_usuarios passam a ser aplicados no
--     banco: um INSERT acima do limite do plano do cliente é recusado,
--     venha da tela, de Edge Function ou da API.
--   * Conta todos os registros do cliente (ativos e inativos), igual à
--     contagem exibida na administração da plataforma.
--   * Cliente sem plano ou com limite nulo = ilimitado.
--   * O erro começa com "Limite do plano" para o front exibir a mensagem.
-- Data: 06/10/2026
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_verificar_limite_plano()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_limite INT;
    v_total BIGINT;
    v_plano TEXT;
BEGIN
    IF NEW.tenant_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Serializa inserções concorrentes do mesmo cliente
    PERFORM 1 FROM public.tenants WHERE id = NEW.tenant_id FOR UPDATE;

    IF TG_TABLE_NAME = 'estabelecimentos' THEN
        SELECT p.max_estabelecimentos, p.nome INTO v_limite, v_plano
          FROM public.tenants t JOIN public.planos p ON p.id = t.plano_id
         WHERE t.id = NEW.tenant_id;
        IF v_limite IS NULL THEN
            RETURN NEW;
        END IF;
        SELECT count(*) INTO v_total FROM public.estabelecimentos WHERE tenant_id = NEW.tenant_id;
        IF v_total >= v_limite THEN
            RAISE EXCEPTION 'Limite do plano %: até % estabelecimento(s). Fale com a OonSystems para mudar de plano.',
                v_plano, v_limite USING ERRCODE = 'P0001', HINT = 'limite_plano';
        END IF;
    ELSE
        SELECT p.max_usuarios, p.nome INTO v_limite, v_plano
          FROM public.tenants t JOIN public.planos p ON p.id = t.plano_id
         WHERE t.id = NEW.tenant_id;
        IF v_limite IS NULL THEN
            RETURN NEW;
        END IF;
        SELECT count(*) INTO v_total FROM public.usuarios_estabelecimento WHERE tenant_id = NEW.tenant_id;
        IF v_total >= v_limite THEN
            RAISE EXCEPTION 'Limite do plano %: até % usuário(s). Fale com a OonSystems para mudar de plano.',
                v_plano, v_limite USING ERRCODE = 'P0001', HINT = 'limite_plano';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_verificar_limite_plano() IS
    'Recusa novos estabelecimentos/usuários acima do limite do plano do cliente';
REVOKE EXECUTE ON FUNCTION public.fn_verificar_limite_plano() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trigger_limite_plano_estabelecimentos
    BEFORE INSERT ON public.estabelecimentos
    FOR EACH ROW EXECUTE FUNCTION public.fn_verificar_limite_plano();

CREATE TRIGGER trigger_limite_plano_usuarios
    BEFORE INSERT ON public.usuarios_estabelecimento
    FOR EACH ROW EXECUTE FUNCTION public.fn_verificar_limite_plano();

-- ============================================================================
-- FIM DO ARQUIVO
-- ============================================================================
