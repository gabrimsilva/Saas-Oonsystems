-- ============================================================================
-- OONSYSTEMS SAAS: GERENCIADOR DE SERVIÇOS DOS PLANOS
-- ============================================================================
-- Arquivo: 20261104113435_gerenciador_servicos.sql
-- Descrição:
--   * modulos.sistema: true nos módulos ligados a telas e travas do banco
--     (fn_modulo_ativo). Excluí-los cortaria o acesso dos clientes, então podem
--     ser renomeados, mas não excluídos.
--   * A plataforma cria, edita e exclui os demais serviços (informativos: não
--     liberam nem bloqueiam telas).
--   * Cliente novo começa só com os módulos do sistema.
-- Data: 04/11/2026
-- ============================================================================

ALTER TABLE public.modulos ADD COLUMN sistema BOOLEAN NOT NULL DEFAULT false;

UPDATE public.modulos SET sistema = true;

ALTER TABLE public.modulos
    ADD CONSTRAINT modulos_nome_preenchido CHECK (btrim(nome) <> '');

COMMENT ON COLUMN public.modulos.sistema IS 'Ligado a telas e travas do banco: não pode ser excluído. Falso = serviço informativo criado pela plataforma';

-- ----------------------------------------------------------------------------
-- Proteção: código e tipo não mudam; módulo do sistema não é excluído
-- ----------------------------------------------------------------------------
CREATE FUNCTION public.fn_modulos_protecao()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.sistema THEN
            RAISE EXCEPTION 'Este serviço libera funções do sistema e não pode ser excluído';
        END IF;
        RETURN OLD;
    END IF;

    IF NEW.codigo IS DISTINCT FROM OLD.codigo OR NEW.sistema IS DISTINCT FROM OLD.sistema THEN
        RAISE EXCEPTION 'O código e o tipo do serviço não podem ser alterados';
    END IF;
    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_modulos_protecao() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_modulos_protecao
    BEFORE UPDATE OR DELETE ON public.modulos
    FOR EACH ROW EXECUTE FUNCTION public.fn_modulos_protecao();

-- ----------------------------------------------------------------------------
-- Gravação só pela plataforma; serviço criado nunca é do sistema
-- ----------------------------------------------------------------------------
CREATE POLICY modulos_insert_plataforma ON public.modulos
    FOR INSERT TO authenticated
    WITH CHECK (public.fn_is_plataforma_admin() AND NOT sistema);

CREATE POLICY modulos_update_plataforma ON public.modulos
    FOR UPDATE TO authenticated
    USING (public.fn_is_plataforma_admin())
    WITH CHECK (public.fn_is_plataforma_admin());

CREATE POLICY modulos_delete_plataforma ON public.modulos
    FOR DELETE TO authenticated
    USING (public.fn_is_plataforma_admin());

-- ----------------------------------------------------------------------------
-- Cliente novo: só os módulos do sistema (serviço informativo vem do plano)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_tenant_modulos_iniciais()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.tenant_modulos (tenant_id, modulo)
    SELECT NEW.id, m.codigo FROM public.modulos m WHERE m.sistema;
    RETURN NEW;
END;
$$;

-- ============================================================================
-- FIM DO ARQUIVO
-- ============================================================================
