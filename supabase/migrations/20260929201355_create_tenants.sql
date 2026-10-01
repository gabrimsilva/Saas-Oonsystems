-- ============================================================================
-- OONSYSTEMS SAAS: TABELA DE TENANTS (CLIENTES)
-- ============================================================================
-- Arquivo: 20260929201355_create_tenants.sql
-- Descrição: Cria a tabela public.tenants, raiz do modelo multi-tenant.
--            Cada cliente é identificado pelo UUID interno (id) e, no negócio,
--            pelo seu documento: CPF (pessoa física) ou CNPJ (pessoa jurídica).
-- Data: 29/09/2026
-- ============================================================================
-- Regras do documento:
--   * Armazenado SEM máscara e em maiúsculas (a trigger normaliza a entrada,
--     então "123.456.789-09" e "12.ABC.345/01DE-35" são aceitos).
--   * CPF: 11 dígitos. CNPJ: 14 caracteres — suporta o CNPJ alfanumérico
--     (IN RFB 2.229/2024, vigente desde jul/2026): 12 posições [0-9A-Z]
--     + 2 dígitos verificadores numéricos.
--   * Dígitos verificadores são validados no banco (CHECK).
--   * tipo_pessoa é derivado do tamanho do documento (PF/PJ), nunca informado.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Validação de CPF (11 dígitos numéricos, sem máscara)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_validar_cpf(doc TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
    soma INT;
    dv INT;
    i INT;
BEGIN
    IF doc IS NULL OR doc !~ '^[0-9]{11}$' OR doc = repeat(left(doc, 1), 11) THEN
        RETURN false;
    END IF;

    soma := 0;
    FOR i IN 1..9 LOOP
        soma := soma + substr(doc, i, 1)::INT * (11 - i);
    END LOOP;
    dv := (soma * 10) % 11;
    IF dv = 10 THEN dv := 0; END IF;
    IF dv <> substr(doc, 10, 1)::INT THEN
        RETURN false;
    END IF;

    soma := 0;
    FOR i IN 1..10 LOOP
        soma := soma + substr(doc, i, 1)::INT * (12 - i);
    END LOOP;
    dv := (soma * 10) % 11;
    IF dv = 10 THEN dv := 0; END IF;

    RETURN dv = substr(doc, 11, 1)::INT;
END;
$$;

COMMENT ON FUNCTION public.fn_validar_cpf(TEXT) IS 'Valida os dígitos verificadores de um CPF sem máscara (11 dígitos)';

-- ----------------------------------------------------------------------------
-- Validação de CNPJ (numérico ou alfanumérico, 14 caracteres, sem máscara)
-- Valor de cada caractere = código ASCII - 48 (0-9 => 0-9, A-Z => 17-42).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_validar_cnpj(doc TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
    pesos1 INT[] := ARRAY[5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    pesos2 INT[] := ARRAY[6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    soma INT;
    resto INT;
    dv INT;
    i INT;
BEGIN
    IF doc IS NULL OR doc !~ '^[0-9A-Z]{12}[0-9]{2}$' OR doc = repeat(left(doc, 1), 14) THEN
        RETURN false;
    END IF;

    soma := 0;
    FOR i IN 1..12 LOOP
        soma := soma + (ascii(substr(doc, i, 1)) - 48) * pesos1[i];
    END LOOP;
    resto := soma % 11;
    dv := CASE WHEN resto < 2 THEN 0 ELSE 11 - resto END;
    IF dv <> substr(doc, 13, 1)::INT THEN
        RETURN false;
    END IF;

    soma := 0;
    FOR i IN 1..13 LOOP
        soma := soma + (ascii(substr(doc, i, 1)) - 48) * pesos2[i];
    END LOOP;
    resto := soma % 11;
    dv := CASE WHEN resto < 2 THEN 0 ELSE 11 - resto END;

    RETURN dv = substr(doc, 14, 1)::INT;
END;
$$;

COMMENT ON FUNCTION public.fn_validar_cnpj(TEXT) IS 'Valida os dígitos verificadores de um CNPJ sem máscara (numérico ou alfanumérico)';

-- ----------------------------------------------------------------------------
-- Validação genérica: decide CPF x CNPJ pelo tamanho
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_validar_documento(doc TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
    SELECT CASE length(doc)
        WHEN 11 THEN public.fn_validar_cpf(doc)
        WHEN 14 THEN public.fn_validar_cnpj(doc)
        ELSE false
    END;
$$;

COMMENT ON FUNCTION public.fn_validar_documento(TEXT) IS 'Valida CPF (11) ou CNPJ (14) sem máscara';

-- ----------------------------------------------------------------------------
-- Tabela: tenants
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    documento VARCHAR(14) NOT NULL,
    tipo_pessoa CHAR(2) GENERATED ALWAYS AS (
        CASE WHEN length(documento) = 11 THEN 'PF' ELSE 'PJ' END
    ) STORED,
    razao_social VARCHAR(150) NOT NULL,     -- nome completo (PF) ou razão social (PJ)
    nome_fantasia VARCHAR(150),
    slug VARCHAR(60) NOT NULL,              -- identificador de rota pública (ex: 'minha-loja')
    email VARCHAR(255),
    telefone VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'ativo',
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT tenants_documento_unico UNIQUE (documento),
    CONSTRAINT tenants_documento_valido CHECK (public.fn_validar_documento(documento)),
    CONSTRAINT tenants_slug_unico UNIQUE (slug),
    CONSTRAINT tenants_slug_formato CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT tenants_razao_social_nao_vazia CHECK (length(btrim(razao_social)) > 0),
    CONSTRAINT tenants_status_valido CHECK (status IN ('trial', 'ativo', 'suspenso', 'cancelado'))
);

COMMENT ON TABLE public.tenants IS 'Clientes do SaaS (inquilinos). Identificados pelo UUID interno e pelo CPF/CNPJ';
COMMENT ON COLUMN public.tenants.id IS 'Identificador interno (UUID) — usado como FK tenant_id nas demais tabelas';
COMMENT ON COLUMN public.tenants.documento IS 'CPF (11) ou CNPJ (14, pode ser alfanumérico), sem máscara e em maiúsculas; único';
COMMENT ON COLUMN public.tenants.tipo_pessoa IS 'PF (CPF) ou PJ (CNPJ), derivado automaticamente do documento';
COMMENT ON COLUMN public.tenants.razao_social IS 'Nome completo (PF) ou razão social (PJ)';
COMMENT ON COLUMN public.tenants.nome_fantasia IS 'Nome comercial exibido no sistema';
COMMENT ON COLUMN public.tenants.slug IS 'Identificador único de rota pública (minúsculas, números e hífens)';
COMMENT ON COLUMN public.tenants.status IS 'Situação do cliente: trial, ativo, suspenso ou cancelado';

-- ----------------------------------------------------------------------------
-- Trigger: normaliza o documento e mantém atualizado_em
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_tenants_before_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.documento := upper(regexp_replace(NEW.documento, '[^0-9A-Za-z]', '', 'g'));
    NEW.slug := lower(btrim(NEW.slug));
    NEW.atualizado_em := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tenants_before_write ON public.tenants;
CREATE TRIGGER trg_tenants_before_write
    BEFORE INSERT OR UPDATE ON public.tenants
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_tenants_before_write();

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
-- Habilitada sem políticas: anon/authenticated não enxergam nada; apenas
-- service_role (backend / painel admin) acessa. As políticas por usuário
-- serão criadas junto com a tabela de vínculo usuário x tenant.
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FIM DO ARQUIVO
-- ============================================================================
