-- ============================================================================
-- OONSYSTEMS SAAS: SCHEMA BASE (herdado do sistema de origem)
-- ============================================================================
-- Arquivo: 20260929210000_base_schema.sql
-- Origem: pg_dump --schema-only do sistema single-tenant de origem (29/09/2026).
-- Removido em relação ao schema de origem (sem uso no app):
--   * tabelas/funções do assistente de IA (ia_config, ia_conversas,
--     ia_arquivos_temp, contar_conversas_por_status, limpar_arquivos_orfaos,
--     obter_ultima_mensagem);
--   * as 10 views vw_*.
-- A camada multi-tenant (tenant_id, funções de RLS por tenant) é aplicada
-- na migration seguinte, sem editar este arquivo.
-- ============================================================================

SET check_function_bodies = false;

CREATE FUNCTION public.atualizar_timestamp() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$;

CREATE FUNCTION public.criar_estoque_automatico() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  novo_stock_id UUID;
BEGIN
  IF NEW.requires_stock = true AND NEW.stock_item_id IS NULL THEN
    INSERT INTO stock_items (
      nome,
      descricao,
      quantidade,
      ativo,
      product_id,
      estabelecimento_id
    ) VALUES (
      NEW.nome,
      'Estoque de ' || NEW.nome,
      0,
      true,
      NEW.id,
      NEW.estabelecimento_id
    ) RETURNING id INTO novo_stock_id;

    UPDATE produtos SET stock_item_id = novo_stock_id WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION public.fn_estabelecimento_ativo(p_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.estabelecimentos e
        WHERE e.id = p_id AND e.ativo = true
    );
$$;

COMMENT ON FUNCTION public.fn_estabelecimento_ativo(p_id uuid) IS 'True se o estabelecimento informado existe e está ativo. Usada nas políticas anônimas dos fluxos públicos por slug.';

CREATE FUNCTION public.fn_estabelecimentos_do_usuario() RETURNS SETOF uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    SELECT e.id
    FROM public.estabelecimentos e
    WHERE public.fn_is_admin_geral()
       OR e.id = (
            SELECT ue.estabelecimento_id
            FROM public.usuarios_estabelecimento ue
            WHERE ue.user_id = auth.uid()
              AND ue.ativo = true
       );
$$;

COMMENT ON FUNCTION public.fn_estabelecimentos_do_usuario() IS 'SECURITY DEFINER: conjunto de estabelecimento_id que o usuário autenticado pode acessar.';

CREATE FUNCTION public.fn_is_admin_estabelecimento() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.usuarios_estabelecimento ue
        WHERE ue.user_id = auth.uid()
          AND ue.ativo = true
          AND ue.perfil = 'administrador_estabelecimento'
    );
$$;

COMMENT ON FUNCTION public.fn_is_admin_estabelecimento() IS 'SECURITY DEFINER: true se o usuário autenticado for administrador_estabelecimento ativo.';

CREATE FUNCTION public.fn_is_admin_geral() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.usuarios_estabelecimento ue
        WHERE ue.user_id = auth.uid()
          AND ue.ativo = true
          AND ue.perfil = 'administrador_geral'
    );
$$;

COMMENT ON FUNCTION public.fn_is_admin_geral() IS 'SECURITY DEFINER: true se o usuário autenticado (auth.uid()) for administrador_geral ativo.';

CREATE FUNCTION public.fn_touch_sale_installments() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$;

CREATE FUNCTION public.fn_touch_sales_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE FUNCTION public.fn_touch_stock_timestamps() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.atualizado_em = now();
    NEW.updated_at    = now();
    RETURN NEW;
END;
$$;

CREATE FUNCTION public.sync_pedido_status_to_historico() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO historico_pedidos (pedido_id, status, observacao, estabelecimento_id)
    VALUES (
      COALESCE(NEW.codigo_pedido, NEW.pedido_id),
      NEW.status,
      'Status atualizado automaticamente para ' || NEW.status,
      NEW.estabelecimento_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_comandas_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_tamanhos_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$;

CREATE TABLE public.adicionais (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    categoria_id uuid,
    nome character varying NOT NULL,
    valor numeric NOT NULL,
    ativo boolean DEFAULT true,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now(),
    estabelecimento_id uuid NOT NULL
);

COMMENT ON TABLE public.adicionais IS 'Tabela para armazenar adicionais disponíveis por categoria';

COMMENT ON COLUMN public.adicionais.categoria_id IS 'Referência à categoria que possui este adicional';

COMMENT ON COLUMN public.adicionais.nome IS 'Nome do adicional (ex: Bacon, Catupiry, etc)';

COMMENT ON COLUMN public.adicionais.valor IS 'Valor adicional cobrado';

COMMENT ON COLUMN public.adicionais.ativo IS 'Define se o adicional está disponível';

CREATE TABLE public.avaliacoes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome_cliente character varying NOT NULL,
    estrelas integer NOT NULL,
    descricao text,
    badges text[] DEFAULT '{}'::text[],
    aprovada boolean DEFAULT true,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now(),
    estabelecimento_id uuid NOT NULL,
    CONSTRAINT avaliacoes_estrelas_check CHECK (((estrelas >= 1) AND (estrelas <= 5)))
);

COMMENT ON TABLE public.avaliacoes IS 'Tabela para armazenar avaliações dos clientes sobre o estabelecimento';

COMMENT ON COLUMN public.avaliacoes.nome_cliente IS 'Nome do cliente que fez a avaliação';

COMMENT ON COLUMN public.avaliacoes.estrelas IS 'Nota de 1 a 5 estrelas';

COMMENT ON COLUMN public.avaliacoes.descricao IS 'Comentário opcional do cliente';

COMMENT ON COLUMN public.avaliacoes.badges IS 'Array de badges/elogios selecionados pelo cliente';

COMMENT ON COLUMN public.avaliacoes.aprovada IS 'Se a avaliação foi aprovada para exibição pública';

CREATE TABLE public.categorias (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying NOT NULL,
    descricao text,
    ativa boolean DEFAULT true,
    ordem integer DEFAULT 1,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now(),
    tem_sabores boolean DEFAULT false,
    tem_borda boolean DEFAULT false,
    tem_tamanhos boolean DEFAULT false,
    tem_adicionais boolean DEFAULT false,
    estabelecimento_id uuid NOT NULL
);

COMMENT ON COLUMN public.categorias.tem_adicionais IS 'Define se a categoria permite adicionar adicionais';

CREATE TABLE public.clientes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying NOT NULL,
    sobrenome character varying NOT NULL,
    cpf character varying,
    telefone character varying NOT NULL,
    email character varying,
    cep character varying,
    endereco text,
    numero character varying,
    complemento text,
    bairro character varying,
    cidade character varying,
    estado character varying,
    total_pedidos integer DEFAULT 0,
    valor_total_gasto numeric DEFAULT 0,
    ultimo_pedido_em timestamp with time zone,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now(),
    estabelecimento_id uuid NOT NULL
);

COMMENT ON TABLE public.clientes IS 'Tabela para armazenar dados dos clientes da pizzaria';

COMMENT ON COLUMN public.clientes.cpf IS 'CPF do cliente no formato 999.999.999-99 (opcional)';

COMMENT ON COLUMN public.clientes.total_pedidos IS 'Contador de pedidos realizados pelo cliente';

COMMENT ON COLUMN public.clientes.valor_total_gasto IS 'Valor total gasto pelo cliente em todos os pedidos';

COMMENT ON COLUMN public.clientes.ultimo_pedido_em IS 'Data e hora do último pedido realizado';

CREATE TABLE public.comandas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero_comanda integer NOT NULL,
    status character varying DEFAULT 'aberta'::character varying,
    itens jsonb DEFAULT '[]'::jsonb,
    subtotal numeric DEFAULT 0,
    total numeric DEFAULT 0,
    criado_por uuid,
    editado_por uuid,
    finalizado_por uuid,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now(),
    finalizado_em timestamp with time zone,
    observacoes text,
    forma_pagamento character varying,
    desconto numeric DEFAULT 0 NOT NULL,
    tipo_desconto text DEFAULT 'valor'::text NOT NULL,
    forma_pagamento_dividido boolean DEFAULT false NOT NULL,
    pagamento_1_tipo text,
    pagamento_1_valor numeric(10,2),
    pagamento_2_tipo text,
    pagamento_2_valor numeric(10,2),
    estabelecimento_id uuid NOT NULL,
    CONSTRAINT comandas_desconto_check CHECK ((desconto >= (0)::numeric)),
    CONSTRAINT comandas_numero_comanda_check CHECK (((numero_comanda >= 1) AND (numero_comanda <= 24))),
    CONSTRAINT comandas_pagamento_tipos_diferentes CHECK (((NOT forma_pagamento_dividido) OR ((pagamento_1_tipo IS NOT NULL) AND (pagamento_2_tipo IS NOT NULL) AND (pagamento_1_tipo <> pagamento_2_tipo)))),
    CONSTRAINT comandas_pagamento_valores_positivos CHECK (((NOT forma_pagamento_dividido) OR ((pagamento_1_valor > (0)::numeric) AND (pagamento_2_valor > (0)::numeric)))),
    CONSTRAINT comandas_status_check CHECK (((status)::text = ANY ((ARRAY['aberta'::character varying, 'finalizada'::character varying, 'cancelada'::character varying])::text[]))),
    CONSTRAINT comandas_tipo_desconto_check CHECK ((tipo_desconto = ANY (ARRAY['valor'::text, 'percentual'::text])))
);

COMMENT ON TABLE public.comandas IS 'Tabela para gerenciar comandas de pedidos no estabelecimento';

COMMENT ON COLUMN public.comandas.numero_comanda IS 'Número da comanda (1 a 24)';

COMMENT ON COLUMN public.comandas.status IS 'Status da comanda: aberta, finalizada ou cancelada';

COMMENT ON COLUMN public.comandas.itens IS 'Array JSON com os itens da comanda incluindo produto, quantidade, personalizações, etc';

COMMENT ON COLUMN public.comandas.criado_por IS 'ID do usuário que criou/abriu a comanda';

COMMENT ON COLUMN public.comandas.editado_por IS 'ID do último usuário que editou a comanda';

COMMENT ON COLUMN public.comandas.finalizado_por IS 'ID do usuário que finalizou a comanda';

COMMENT ON COLUMN public.comandas.forma_pagamento IS 'Forma de pagamento utilizada na comanda';

COMMENT ON COLUMN public.comandas.desconto IS 'Valor do desconto aplicado. Se tipo_desconto=valor, representa R$. Se tipo_desconto=percentual, representa %';

COMMENT ON COLUMN public.comandas.tipo_desconto IS 'Tipo do desconto: valor (R$) ou percentual (%)';

COMMENT ON COLUMN public.comandas.forma_pagamento_dividido IS 'Indica se o pagamento foi dividido entre duas formas de pagamento diferentes';

COMMENT ON COLUMN public.comandas.pagamento_1_tipo IS 'Tipo da primeira forma de pagamento (PIX, Dinheiro, Débito, Crédito)';

COMMENT ON COLUMN public.comandas.pagamento_1_valor IS 'Valor pago com a primeira forma de pagamento';

COMMENT ON COLUMN public.comandas.pagamento_2_tipo IS 'Tipo da segunda forma de pagamento (PIX, Dinheiro, Débito, Crédito)';

COMMENT ON COLUMN public.comandas.pagamento_2_valor IS 'Valor pago com a segunda forma de pagamento';

CREATE TABLE public.combo_produtos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    combo_id uuid,
    produto_id uuid,
    quantidade integer DEFAULT 1,
    criado_em timestamp with time zone DEFAULT now(),
    estabelecimento_id uuid NOT NULL
);

CREATE TABLE public.combos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying NOT NULL,
    descricao text,
    url_imagem text,
    preco_combo numeric NOT NULL,
    preco_original numeric NOT NULL,
    desconto numeric NOT NULL,
    ativo boolean DEFAULT true,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now(),
    estabelecimento_id uuid NOT NULL
);

CREATE TABLE public.configuracoes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chave character varying NOT NULL,
    valor text NOT NULL,
    descricao text,
    tipo character varying DEFAULT 'texto'::character varying,
    categoria character varying DEFAULT 'geral'::character varying,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now(),
    estabelecimento_id uuid NOT NULL,
    CONSTRAINT configuracoes_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['texto'::character varying, 'numero'::character varying, 'booleano'::character varying, 'json'::character varying])::text[])))
);

COMMENT ON TABLE public.configuracoes IS 'Configurações gerais do sistema';

CREATE TABLE public.estabelecimentos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying(100) NOT NULL,
    slug character varying(60) NOT NULL,
    descricao character varying(500),
    cor_tema character varying(9) NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.estabelecimentos IS 'Estabelecimentos (prédios/filiais) que atuam como inquilinos (tenants) independentes';

COMMENT ON COLUMN public.estabelecimentos.nome IS 'Nome do estabelecimento (1 a 100 caracteres, único)';

COMMENT ON COLUMN public.estabelecimentos.slug IS 'Identificador único de rota pública (ex: cic, boqueirao) usado nos fluxos públicos por slug';

COMMENT ON COLUMN public.estabelecimentos.descricao IS 'Descrição do estabelecimento (máx. 500 caracteres)';

COMMENT ON COLUMN public.estabelecimentos.cor_tema IS 'Cor de tema em formato hex (#RRGGBB) aplicada à identidade visual do estabelecimento';

COMMENT ON COLUMN public.estabelecimentos.ativo IS 'Indica se o estabelecimento está ativo e pode ser selecionado como atual';

COMMENT ON COLUMN public.estabelecimentos.criado_em IS 'Data e hora de criação do estabelecimento';

CREATE TABLE public.estoque (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying NOT NULL,
    descricao text,
    validade date,
    quantidade integer DEFAULT 0,
    quantidade_minima integer DEFAULT 1,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now(),
    estabelecimento_id uuid NOT NULL
);

CREATE TABLE public.funcionarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying NOT NULL,
    cargo character varying,
    telefone character varying NOT NULL,
    ativo boolean DEFAULT true,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now(),
    email character varying NOT NULL,
    funcao character varying,
    user_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    bloqueado boolean DEFAULT false,
    estabelecimento_id uuid NOT NULL,
    CONSTRAINT funcionarios_funcao_check CHECK (((funcao)::text = ANY ((ARRAY['atendente'::character varying, 'garcom'::character varying, 'entregador'::character varying])::text[])))
);

COMMENT ON COLUMN public.funcionarios.cargo IS 'Campo legado - usar funcao ao invés (opcional para compatibilidade)';

COMMENT ON COLUMN public.funcionarios.email IS 'Email do funcionário para acesso ao sistema (obrigatório)';

COMMENT ON COLUMN public.funcionarios.funcao IS 'Função do funcionário: atendente, garcom ou entregador';

COMMENT ON COLUMN public.funcionarios.user_id IS 'Referência ao usuário no auth.users do Supabase';

COMMENT ON COLUMN public.funcionarios.metadata IS 'Metadados adicionais do funcionário, incluindo permissões customizadas';

COMMENT ON COLUMN public.funcionarios.bloqueado IS 'Indica se o funcionário está bloqueado e não pode acessar o sistema';

CREATE TABLE public.historico_comandas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero_comanda integer NOT NULL,
    itens jsonb DEFAULT '[]'::jsonb,
    subtotal numeric DEFAULT 0,
    total numeric DEFAULT 0,
    forma_pagamento character varying,
    criado_por uuid,
    finalizado_por uuid,
    criado_em timestamp with time zone,
    finalizado_em timestamp with time zone DEFAULT now(),
    observacoes text,
    desconto numeric DEFAULT 0 NOT NULL,
    tipo_desconto text DEFAULT 'valor'::text NOT NULL,
    forma_pagamento_dividido boolean DEFAULT false NOT NULL,
    pagamento_1_tipo text,
    pagamento_1_valor numeric(10,2),
    pagamento_2_tipo text,
    pagamento_2_valor numeric(10,2),
    estabelecimento_id uuid NOT NULL,
    CONSTRAINT historico_comandas_desconto_check CHECK ((desconto >= (0)::numeric)),
    CONSTRAINT historico_comandas_numero_comanda_check CHECK (((numero_comanda >= 1) AND (numero_comanda <= 24))),
    CONSTRAINT historico_comandas_pagamento_tipos_diferentes CHECK (((NOT forma_pagamento_dividido) OR ((pagamento_1_tipo IS NOT NULL) AND (pagamento_2_tipo IS NOT NULL) AND (pagamento_1_tipo <> pagamento_2_tipo)))),
    CONSTRAINT historico_comandas_pagamento_valores_positivos CHECK (((NOT forma_pagamento_dividido) OR ((pagamento_1_valor > (0)::numeric) AND (pagamento_2_valor > (0)::numeric)))),
    CONSTRAINT historico_comandas_tipo_desconto_check CHECK ((tipo_desconto = ANY (ARRAY['valor'::text, 'percentual'::text])))
);

COMMENT ON TABLE public.historico_comandas IS 'Histórico de comandas finalizadas do estabelecimento';

COMMENT ON COLUMN public.historico_comandas.numero_comanda IS 'Número da comanda (1 a 24)';

COMMENT ON COLUMN public.historico_comandas.itens IS 'Array JSON com os itens da comanda incluindo produto, quantidade, personalizações, etc';

COMMENT ON COLUMN public.historico_comandas.forma_pagamento IS 'Forma de pagamento utilizada';

COMMENT ON COLUMN public.historico_comandas.criado_por IS 'ID do usuário que criou/abriu a comanda';

COMMENT ON COLUMN public.historico_comandas.finalizado_por IS 'ID do usuário que finalizou a comanda';

COMMENT ON COLUMN public.historico_comandas.desconto IS 'Valor do desconto aplicado. Se tipo_desconto=valor, representa R$. Se tipo_desconto=percentual, representa %';

COMMENT ON COLUMN public.historico_comandas.tipo_desconto IS 'Tipo do desconto: valor (R$) ou percentual (%)';

COMMENT ON COLUMN public.historico_comandas.forma_pagamento_dividido IS 'Indica se o pagamento foi dividido entre duas formas de pagamento diferentes';

COMMENT ON COLUMN public.historico_comandas.pagamento_1_tipo IS 'Tipo da primeira forma de pagamento (PIX, Dinheiro, Débito, Crédito)';

COMMENT ON COLUMN public.historico_comandas.pagamento_1_valor IS 'Valor pago com a primeira forma de pagamento';

COMMENT ON COLUMN public.historico_comandas.pagamento_2_tipo IS 'Tipo da segunda forma de pagamento (PIX, Dinheiro, Débito, Crédito)';

COMMENT ON COLUMN public.historico_comandas.pagamento_2_valor IS 'Valor pago com a segunda forma de pagamento';

CREATE TABLE public.historico_geral (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pedido_id text NOT NULL,
    codigo_pedido character varying,
    cliente_nome text NOT NULL,
    cliente_sobrenome text NOT NULL,
    cliente_telefone text NOT NULL,
    cliente_email text,
    cliente_cep text,
    cliente_endereco text,
    cliente_numero character varying,
    cliente_complemento text,
    cliente_bairro character varying,
    cliente_cidade character varying,
    cliente_estado character varying,
    entrega_domicilio boolean DEFAULT true,
    forma_pagamento text NOT NULL,
    precisa_troco boolean DEFAULT false,
    valor_troco numeric,
    subtotal numeric NOT NULL,
    taxa_entrega numeric DEFAULT 0,
    total numeric NOT NULL,
    itens jsonb NOT NULL,
    status text DEFAULT 'Finalizado'::text,
    previsao_entrega text,
    observacoes text,
    cliente_id uuid,
    cliente_cpf character varying,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now(),
    movido_em timestamp with time zone DEFAULT now(),
    cancelado boolean DEFAULT false,
    motivo_cancelamento text,
    requer_extorno boolean DEFAULT false,
    valor_extorno numeric,
    forma_pagamento_extorno text,
    cancelado_em timestamp with time zone,
    cancelado_por uuid,
    taxa_extra_km numeric(10,2) DEFAULT 0,
    desconto numeric DEFAULT 0 NOT NULL,
    tipo_desconto text DEFAULT 'valor'::text NOT NULL,
    forma_pagamento_dividido boolean DEFAULT false NOT NULL,
    pagamento_1_tipo text,
    pagamento_1_valor numeric(10,2),
    pagamento_2_tipo text,
    pagamento_2_valor numeric(10,2),
    estabelecimento_id uuid NOT NULL,
    CONSTRAINT historico_geral_desconto_check CHECK ((desconto >= (0)::numeric)),
    CONSTRAINT historico_geral_pagamento_tipos_diferentes CHECK (((NOT forma_pagamento_dividido) OR ((pagamento_1_tipo IS NOT NULL) AND (pagamento_2_tipo IS NOT NULL) AND (pagamento_1_tipo <> pagamento_2_tipo)))),
    CONSTRAINT historico_geral_pagamento_valores_positivos CHECK (((NOT forma_pagamento_dividido) OR ((pagamento_1_valor > (0)::numeric) AND (pagamento_2_valor > (0)::numeric)))),
    CONSTRAINT historico_geral_tipo_desconto_check CHECK ((tipo_desconto = ANY (ARRAY['valor'::text, 'percentual'::text])))
);

COMMENT ON COLUMN public.historico_geral.desconto IS 'Valor do desconto aplicado. Se tipo_desconto=valor, representa R$. Se tipo_desconto=percentual, representa %';

COMMENT ON COLUMN public.historico_geral.tipo_desconto IS 'Tipo do desconto: valor (R$) ou percentual (%)';

COMMENT ON COLUMN public.historico_geral.forma_pagamento_dividido IS 'Indica se o pagamento foi dividido entre duas formas de pagamento diferentes';

COMMENT ON COLUMN public.historico_geral.pagamento_1_tipo IS 'Tipo da primeira forma de pagamento (PIX, Dinheiro, Débito, Crédito)';

COMMENT ON COLUMN public.historico_geral.pagamento_1_valor IS 'Valor pago com a primeira forma de pagamento';

COMMENT ON COLUMN public.historico_geral.pagamento_2_tipo IS 'Tipo da segunda forma de pagamento (PIX, Dinheiro, Débito, Crédito)';

COMMENT ON COLUMN public.historico_geral.pagamento_2_valor IS 'Valor pago com a segunda forma de pagamento';

CREATE TABLE public.historico_pedidos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pedido_id text NOT NULL,
    status text NOT NULL,
    observacao text,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now(),
    desconto numeric DEFAULT 0 NOT NULL,
    tipo_desconto text DEFAULT 'valor'::text NOT NULL,
    forma_pagamento_dividido boolean DEFAULT false NOT NULL,
    pagamento_1_tipo text,
    pagamento_1_valor numeric(10,2),
    pagamento_2_tipo text,
    pagamento_2_valor numeric(10,2),
    estabelecimento_id uuid NOT NULL,
    CONSTRAINT historico_pedidos_desconto_check CHECK ((desconto >= (0)::numeric)),
    CONSTRAINT historico_pedidos_pagamento_tipos_diferentes CHECK (((NOT forma_pagamento_dividido) OR ((pagamento_1_tipo IS NOT NULL) AND (pagamento_2_tipo IS NOT NULL) AND (pagamento_1_tipo <> pagamento_2_tipo)))),
    CONSTRAINT historico_pedidos_pagamento_valores_positivos CHECK (((NOT forma_pagamento_dividido) OR ((pagamento_1_valor > (0)::numeric) AND (pagamento_2_valor > (0)::numeric)))),
    CONSTRAINT historico_pedidos_tipo_desconto_check CHECK ((tipo_desconto = ANY (ARRAY['valor'::text, 'percentual'::text])))
);

COMMENT ON COLUMN public.historico_pedidos.desconto IS 'Valor do desconto aplicado. Se tipo_desconto=valor, representa R$. Se tipo_desconto=percentual, representa %';

COMMENT ON COLUMN public.historico_pedidos.tipo_desconto IS 'Tipo do desconto: valor (R$) ou percentual (%)';

COMMENT ON COLUMN public.historico_pedidos.forma_pagamento_dividido IS 'Indica se o pagamento foi dividido entre duas formas de pagamento diferentes';

COMMENT ON COLUMN public.historico_pedidos.pagamento_1_tipo IS 'Tipo da primeira forma de pagamento (PIX, Dinheiro, Débito, Crédito)';

COMMENT ON COLUMN public.historico_pedidos.pagamento_1_valor IS 'Valor pago com a primeira forma de pagamento';

COMMENT ON COLUMN public.historico_pedidos.pagamento_2_tipo IS 'Tipo da segunda forma de pagamento (PIX, Dinheiro, Débito, Crédito)';

COMMENT ON COLUMN public.historico_pedidos.pagamento_2_valor IS 'Valor pago com a segunda forma de pagamento';

CREATE TABLE public.logs_auditoria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid,
    estabelecimento_id uuid,
    acao character varying(80) NOT NULL,
    descricao character varying(500) NOT NULL,
    metadata jsonb,
    criado_em timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.logs_auditoria IS 'Registro de auditoria append-only e imutável das ações operacionais relevantes';

COMMENT ON COLUMN public.logs_auditoria.usuario_id IS 'Usuário que executou a ação (auth.users)';

COMMENT ON COLUMN public.logs_auditoria.estabelecimento_id IS 'Estabelecimento em que a ação ocorreu';

COMMENT ON COLUMN public.logs_auditoria.acao IS 'Identificador curto da ação (ex: produto.atualizar, estabelecimento.trocar)';

COMMENT ON COLUMN public.logs_auditoria.descricao IS 'Descrição legível da ação (máx. 500 caracteres)';

COMMENT ON COLUMN public.logs_auditoria.metadata IS 'Dados adicionais estruturados da ação (origem/destino, IDs, etc.)';

COMMENT ON COLUMN public.logs_auditoria.criado_em IS 'Data e hora da ação com precisão de segundos';

CREATE TABLE public.pedidos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pedido_id text NOT NULL,
    cliente_nome text NOT NULL,
    cliente_sobrenome text NOT NULL,
    cliente_telefone text NOT NULL,
    cliente_email text,
    cliente_cep text,
    cliente_endereco text,
    cliente_complemento text,
    cliente_cidade text,
    cliente_estado text,
    entrega_domicilio boolean DEFAULT true,
    forma_pagamento text NOT NULL,
    precisa_troco boolean DEFAULT false,
    valor_troco numeric,
    subtotal numeric NOT NULL,
    taxa_entrega numeric DEFAULT 0,
    total numeric NOT NULL,
    itens jsonb NOT NULL,
    status text DEFAULT 'Pedido criado'::text,
    previsao_entrega text,
    observacoes text,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now(),
    cliente_id uuid,
    cliente_cpf character varying,
    cliente_numero character varying,
    cliente_bairro character varying,
    codigo_pedido character varying,
    cancelado boolean DEFAULT false,
    motivo_cancelamento text,
    requer_extorno boolean DEFAULT false,
    valor_extorno numeric,
    forma_pagamento_extorno text,
    cancelado_em timestamp with time zone,
    cancelado_por uuid,
    mercado_pago_payment_id text,
    mercado_pago_status text,
    mercado_pago_date_approved timestamp with time zone,
    taxa_extra_km numeric(10,2) DEFAULT 0,
    desconto numeric DEFAULT 0 NOT NULL,
    tipo_desconto text DEFAULT 'valor'::text NOT NULL,
    forma_pagamento_dividido boolean DEFAULT false NOT NULL,
    pagamento_1_tipo text,
    pagamento_1_valor numeric(10,2),
    pagamento_2_tipo text,
    pagamento_2_valor numeric(10,2),
    estabelecimento_id uuid NOT NULL,
    CONSTRAINT pedidos_desconto_check CHECK ((desconto >= (0)::numeric)),
    CONSTRAINT pedidos_pagamento_tipos_diferentes CHECK (((NOT forma_pagamento_dividido) OR ((pagamento_1_tipo IS NOT NULL) AND (pagamento_2_tipo IS NOT NULL) AND (pagamento_1_tipo <> pagamento_2_tipo)))),
    CONSTRAINT pedidos_pagamento_valores_positivos CHECK (((NOT forma_pagamento_dividido) OR ((pagamento_1_valor > (0)::numeric) AND (pagamento_2_valor > (0)::numeric)))),
    CONSTRAINT pedidos_tipo_desconto_check CHECK ((tipo_desconto = ANY (ARRAY['valor'::text, 'percentual'::text])))
);

COMMENT ON COLUMN public.pedidos.cliente_id IS 'Referência ao cliente que fez o pedido';

COMMENT ON COLUMN public.pedidos.cliente_cpf IS 'CPF do cliente no formato 999.999.999-99';

COMMENT ON COLUMN public.pedidos.cliente_numero IS 'Número da residência do cliente';

COMMENT ON COLUMN public.pedidos.cliente_bairro IS 'Bairro do cliente';

COMMENT ON COLUMN public.pedidos.codigo_pedido IS 'Código amigável do pedido (ex: 8122)';

COMMENT ON COLUMN public.pedidos.cancelado IS 'Indica se o pedido foi cancelado';

COMMENT ON COLUMN public.pedidos.motivo_cancelamento IS 'Motivo do cancelamento do pedido';

COMMENT ON COLUMN public.pedidos.requer_extorno IS 'Indica se o cancelamento requer extorno de valor';

COMMENT ON COLUMN public.pedidos.valor_extorno IS 'Valor a ser extornado';

COMMENT ON COLUMN public.pedidos.forma_pagamento_extorno IS 'Forma de pagamento para o extorno';

COMMENT ON COLUMN public.pedidos.cancelado_em IS 'Data e hora do cancelamento';

COMMENT ON COLUMN public.pedidos.cancelado_por IS 'Usuário que cancelou o pedido';

COMMENT ON COLUMN public.pedidos.mercado_pago_payment_id IS 'ID do pagamento no Mercado Pago';

COMMENT ON COLUMN public.pedidos.mercado_pago_status IS 'Status do pagamento no Mercado Pago (pending, approved, rejected, etc)';

COMMENT ON COLUMN public.pedidos.mercado_pago_date_approved IS 'Data e hora de aprovação do pagamento no Mercado Pago';

COMMENT ON COLUMN public.pedidos.taxa_extra_km IS 'Taxa extra cobrada por distância em km';

COMMENT ON COLUMN public.pedidos.desconto IS 'Valor do desconto aplicado. Se tipo_desconto=valor, representa R$. Se tipo_desconto=percentual, representa %';

COMMENT ON COLUMN public.pedidos.tipo_desconto IS 'Tipo do desconto: valor (R$) ou percentual (%)';

COMMENT ON COLUMN public.pedidos.forma_pagamento_dividido IS 'Indica se o pagamento foi dividido entre duas formas de pagamento diferentes';

COMMENT ON COLUMN public.pedidos.pagamento_1_tipo IS 'Tipo da primeira forma de pagamento (PIX, Dinheiro, Débito, Crédito)';

COMMENT ON COLUMN public.pedidos.pagamento_1_valor IS 'Valor pago com a primeira forma de pagamento';

COMMENT ON COLUMN public.pedidos.pagamento_2_tipo IS 'Tipo da segunda forma de pagamento (PIX, Dinheiro, Débito, Crédito)';

COMMENT ON COLUMN public.pedidos.pagamento_2_valor IS 'Valor pago com a segunda forma de pagamento';

CREATE TABLE public.produto_sabores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    produto_id uuid,
    sabor_id uuid,
    criado_em timestamp with time zone DEFAULT now(),
    estabelecimento_id uuid NOT NULL
);

CREATE TABLE public.produtos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying NOT NULL,
    descricao text,
    preco numeric NOT NULL,
    preco_promocional numeric,
    categoria_id uuid,
    categoria_nome character varying,
    imagem_path text,
    sabores_disponiveis boolean DEFAULT false,
    quantidade_sabores integer DEFAULT 1,
    ativo boolean DEFAULT true,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now(),
    permite_adicionais boolean DEFAULT false,
    requires_stock boolean DEFAULT false,
    codigo_barras character varying,
    stock_item_id uuid,
    custo numeric,
    estabelecimento_id uuid NOT NULL
);

COMMENT ON COLUMN public.produtos.permite_adicionais IS 'Define se o produto permite adicionar adicionais';

COMMENT ON COLUMN public.produtos.requires_stock IS 'Indica se o produto exige controle de estoque (cria stock_item vinculado)';

COMMENT ON COLUMN public.produtos.codigo_barras IS 'Código de barras do produto (EAN-13, EAN-8, UPC, Code128)';

COMMENT ON COLUMN public.produtos.stock_item_id IS 'Referência ao item de estoque vinculado (1:1)';

COMMENT ON COLUMN public.produtos.custo IS 'Custo de aquisição/produção do produto, usado em métricas de margem';

CREATE TABLE public.profile (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    nome character varying NOT NULL,
    email character varying NOT NULL,
    telefone character varying,
    ativo boolean DEFAULT true,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now()
);

COMMENT ON TABLE public.profile IS 'Tabela para armazenar perfis de administradores com acesso total ao sistema';

COMMENT ON COLUMN public.profile.user_id IS 'Referência ao usuário no auth.users do Supabase';

COMMENT ON COLUMN public.profile.nome IS 'Nome completo do administrador';

COMMENT ON COLUMN public.profile.email IS 'Email do administrador (deve corresponder ao email em auth.users)';

COMMENT ON COLUMN public.profile.telefone IS 'Telefone de contato do administrador';

COMMENT ON COLUMN public.profile.ativo IS 'Define se o administrador está ativo no sistema';

CREATE TABLE public.sabores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying NOT NULL,
    is_premium boolean DEFAULT false,
    valor_premium numeric,
    tipo character varying DEFAULT 'pizza'::character varying,
    ativo boolean DEFAULT true,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now(),
    categoria_id uuid,
    categoria_sabor character varying DEFAULT 'tradicional'::character varying,
    tipo_sabor character varying DEFAULT 'normal'::character varying,
    descricao text,
    estabelecimento_id uuid NOT NULL,
    CONSTRAINT sabores_categoria_sabor_check CHECK (((categoria_sabor)::text = ANY ((ARRAY['tradicional'::character varying, 'especiais'::character varying, 'nobres'::character varying, 'doces'::character varying, 'doces_especiais'::character varying, 'refrigerante'::character varying])::text[]))),
    CONSTRAINT sabores_tipo_sabor_check CHECK (((tipo_sabor)::text = ANY ((ARRAY['normal'::character varying, 'borda'::character varying])::text[])))
);

COMMENT ON COLUMN public.sabores.descricao IS 'Descrição detalhada dos ingredientes e características do sabor';

CREATE TABLE public.sale_installments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sale_id uuid NOT NULL,
    numero_parcela integer NOT NULL,
    valor numeric(10,2) NOT NULL,
    data_vencimento date NOT NULL,
    pago boolean DEFAULT false NOT NULL,
    pago_em timestamp with time zone,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    atualizado_em timestamp with time zone DEFAULT now() NOT NULL,
    estabelecimento_id uuid NOT NULL,
    CONSTRAINT sale_installments_numero_parcela_check CHECK (((numero_parcela >= 1) AND (numero_parcela <= 12))),
    CONSTRAINT sale_installments_valor_check CHECK ((valor >= (0)::numeric))
);

COMMENT ON TABLE public.sale_installments IS 'Parcelas de vendas a prazo (payment_method = A_PRAZO), uma linha por parcela';

COMMENT ON COLUMN public.sale_installments.numero_parcela IS 'Número sequencial da parcela (1 a 12)';

COMMENT ON COLUMN public.sale_installments.valor IS 'Valor desta parcela';

COMMENT ON COLUMN public.sale_installments.data_vencimento IS 'Data de vencimento desta parcela';

COMMENT ON COLUMN public.sale_installments.pago IS 'Indica se a parcela já foi paga';

COMMENT ON COLUMN public.sale_installments.pago_em IS 'Data/hora em que a parcela foi marcada como paga';

CREATE TABLE public.sales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sale_number character varying(50) NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    payment_method character varying(20) NOT NULL,
    needs_change boolean DEFAULT false,
    change_amount numeric(10,2),
    sale_type character varying(50) DEFAULT 'PDV'::character varying,
    items jsonb NOT NULL,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    estabelecimento_id uuid NOT NULL,
    payment_term_days integer,
    installments_count integer,
    customer_name text,
    CONSTRAINT sales_payment_method_check CHECK (((payment_method)::text = ANY ((ARRAY['DEBIT'::character varying, 'CREDIT'::character varying, 'PIX'::character varying, 'CASH'::character varying, 'A_PRAZO'::character varying, 'INTERNAL_CONSUMPTION'::character varying])::text[])))
);

COMMENT ON TABLE public.sales IS 'Vendas realizadas no PDV e Delivery';

COMMENT ON COLUMN public.sales.sale_number IS 'Número único da venda (ex.: VENDA-20250126-001)';

COMMENT ON COLUMN public.sales.payment_method IS 'Forma de pagamento: DEBIT, CREDIT, PIX, CASH';

COMMENT ON COLUMN public.sales.sale_type IS 'Tipo de venda (PDV, DELIVERY, etc.)';

COMMENT ON COLUMN public.sales.items IS 'Itens da venda em formato JSON';

COMMENT ON COLUMN public.sales.payment_term_days IS 'Prazo em dias para o vencimento da 1ª parcela (venda a prazo)';

COMMENT ON COLUMN public.sales.installments_count IS 'Número de parcelas da venda a prazo (1 a 12)';

COMMENT ON COLUMN public.sales.customer_name IS 'Nome do cliente (especialmente útil para vendas A Prazo)';

CREATE TABLE public.stock_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    nome character varying,
    descricao text,
    unidade character varying DEFAULT 'un'::character varying,
    preco_custo numeric,
    fornecedor character varying,
    categoria character varying,
    quantidade numeric DEFAULT 0,
    min_qty integer DEFAULT 0,
    reorder_qty integer DEFAULT 0,
    ativo boolean DEFAULT true,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now(),
    total_qty integer DEFAULT 0,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    estabelecimento_id uuid NOT NULL
);

COMMENT ON TABLE public.stock_items IS 'Controle de estoque por produto (1 produto = 1 item de estoque)';

COMMENT ON COLUMN public.stock_items.product_id IS 'Produto vinculado (único) - FK produtos(id)';

COMMENT ON COLUMN public.stock_items.quantidade IS 'PRIMÁRIA: quantidade total em estoque (escrita pelo stockService)';

COMMENT ON COLUMN public.stock_items.min_qty IS 'Quantidade mínima (alerta crítico)';

COMMENT ON COLUMN public.stock_items.reorder_qty IS 'Quantidade sugerida para reposição/compra';

COMMENT ON COLUMN public.stock_items.ativo IS 'PRIMÁRIA: item de estoque ativo';

COMMENT ON COLUMN public.stock_items.total_qty IS 'COMPAT (EN): espelho de quantidade lido por buscar_por_barcode';

COMMENT ON COLUMN public.stock_items.active IS 'COMPAT (EN): espelho de ativo lido por buscar_por_barcode';

CREATE TABLE public.stock_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stock_item_id uuid NOT NULL,
    variant_id uuid,
    tipo character varying,
    quantidade numeric,
    motivo text,
    usuario_id uuid,
    criado_em timestamp with time zone DEFAULT now(),
    type character varying,
    qty integer,
    ref_type character varying(50),
    ref_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    estabelecimento_id uuid NOT NULL,
    CONSTRAINT stock_movements_tipo_check CHECK (((tipo IS NULL) OR ((tipo)::text = ANY ((ARRAY['entrada'::character varying, 'saida'::character varying, 'ajuste'::character varying])::text[])))),
    CONSTRAINT stock_movements_type_check CHECK (((type IS NULL) OR ((type)::text = ANY ((ARRAY['IN'::character varying, 'OUT'::character varying, 'ADJUST'::character varying])::text[]))))
);

COMMENT ON TABLE public.stock_movements IS 'Histórico (append-only) de movimentações de estoque';

COMMENT ON COLUMN public.stock_movements.tipo IS 'PRIMÁRIO (PT-BR): entrada | saida | ajuste';

COMMENT ON COLUMN public.stock_movements.quantidade IS 'PRIMÁRIO (PT-BR): quantidade movimentada';

COMMENT ON COLUMN public.stock_movements.type IS 'COMPAT (EN): IN | OUT | ADJUST';

COMMENT ON COLUMN public.stock_movements.ref_type IS 'COMPAT (EN): tipo de referência (SALE, PURCHASE, MANUAL)';

COMMENT ON COLUMN public.stock_movements.ref_id IS 'COMPAT (EN): ID da referência (ex.: id da venda)';

CREATE TABLE public.stock_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stock_item_id uuid NOT NULL,
    nome character varying,
    quantidade numeric DEFAULT 0,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now(),
    label character varying(100),
    qty integer DEFAULT 0,
    sku character varying(100),
    barcode character varying(100),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    estabelecimento_id uuid NOT NULL
);

COMMENT ON TABLE public.stock_variants IS 'Variantes de um item de estoque (cor, fragrância, tamanho, etc.)';

COMMENT ON COLUMN public.stock_variants.nome IS 'PRIMÁRIA (PT-BR): nome da variante';

COMMENT ON COLUMN public.stock_variants.quantidade IS 'PRIMÁRIA (PT-BR): quantidade da variante';

COMMENT ON COLUMN public.stock_variants.label IS 'COMPAT (EN): rótulo da variante lido por buscar_por_barcode/PDV';

COMMENT ON COLUMN public.stock_variants.barcode IS 'Código de barras da variante (EAN-13, EAN-8, UPC, Code128)';

CREATE TABLE public.tamanhos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    produto_id uuid NOT NULL,
    nome character varying NOT NULL,
    valor numeric NOT NULL,
    tamanho character varying NOT NULL,
    ordem integer DEFAULT 0,
    ativo boolean DEFAULT true,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now(),
    estabelecimento_id uuid NOT NULL
);

CREATE TABLE public.usuarios_estabelecimento (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    nome character varying(120) NOT NULL,
    email character varying(255) NOT NULL,
    perfil character varying(30) NOT NULL,
    estabelecimento_id uuid,
    ativo boolean DEFAULT true NOT NULL,
    ultimo_estabelecimento_id uuid,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT usuario_estab_vinculo CHECK ((((perfil)::text = 'administrador_geral'::text) OR (estabelecimento_id IS NOT NULL))),
    CONSTRAINT usuarios_estabelecimento_perfil_check CHECK (((perfil)::text = ANY ((ARRAY['administrador_geral'::character varying, 'administrador_estabelecimento'::character varying, 'operador'::character varying])::text[])))
);

COMMENT ON TABLE public.usuarios_estabelecimento IS 'Vínculo usuário/perfil/estabelecimento — fonte de verdade de autorização multi-tenant';

COMMENT ON COLUMN public.usuarios_estabelecimento.user_id IS 'Referência única ao usuário no auth.users do Supabase';

COMMENT ON COLUMN public.usuarios_estabelecimento.nome IS 'Nome do usuário (1 a 120 caracteres)';

COMMENT ON COLUMN public.usuarios_estabelecimento.email IS 'Email do usuário (único, formato de email válido)';

COMMENT ON COLUMN public.usuarios_estabelecimento.perfil IS 'Perfil de autorização: administrador_geral, administrador_estabelecimento ou operador';

COMMENT ON COLUMN public.usuarios_estabelecimento.estabelecimento_id IS 'Estabelecimento vinculado; NULL apenas para administrador_geral (acesso a todos)';

COMMENT ON COLUMN public.usuarios_estabelecimento.ativo IS 'Indica se o usuário está ativo; usuários inativos têm acesso negado';

COMMENT ON COLUMN public.usuarios_estabelecimento.ultimo_estabelecimento_id IS 'Último estabelecimento utilizado, restaurado no início da sessão (admin geral)';

COMMENT ON COLUMN public.usuarios_estabelecimento.criado_em IS 'Data e hora de criação do vínculo';

ALTER TABLE ONLY public.adicionais
    ADD CONSTRAINT adicionais_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.avaliacoes
    ADD CONSTRAINT avaliacoes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.comandas
    ADD CONSTRAINT comandas_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.combo_produtos
    ADD CONSTRAINT combo_produtos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.combos
    ADD CONSTRAINT combos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.configuracoes
    ADD CONSTRAINT configuracoes_estab_chave_unico UNIQUE (estabelecimento_id, chave);

ALTER TABLE ONLY public.configuracoes
    ADD CONSTRAINT configuracoes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.estabelecimentos
    ADD CONSTRAINT estabelecimentos_nome_unico UNIQUE (nome);

ALTER TABLE ONLY public.estabelecimentos
    ADD CONSTRAINT estabelecimentos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.estabelecimentos
    ADD CONSTRAINT estabelecimentos_slug_unico UNIQUE (slug);

ALTER TABLE ONLY public.estoque
    ADD CONSTRAINT estoque_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.funcionarios
    ADD CONSTRAINT funcionarios_email_key UNIQUE (email);

ALTER TABLE ONLY public.funcionarios
    ADD CONSTRAINT funcionarios_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.historico_comandas
    ADD CONSTRAINT historico_comandas_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.historico_geral
    ADD CONSTRAINT historico_geral_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.historico_pedidos
    ADD CONSTRAINT historico_pedidos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.logs_auditoria
    ADD CONSTRAINT logs_auditoria_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_pedido_id_key UNIQUE (pedido_id);

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.produto_sabores
    ADD CONSTRAINT produto_sabores_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.produtos
    ADD CONSTRAINT produtos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.profile
    ADD CONSTRAINT profile_email_key UNIQUE (email);

ALTER TABLE ONLY public.profile
    ADD CONSTRAINT profile_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.profile
    ADD CONSTRAINT profile_user_id_key UNIQUE (user_id);

ALTER TABLE ONLY public.sabores
    ADD CONSTRAINT sabores_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sale_installments
    ADD CONSTRAINT sale_installments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sale_installments
    ADD CONSTRAINT sale_installments_sale_numero_unico UNIQUE (sale_id, numero_parcela);

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_sale_number_key UNIQUE (sale_number);

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_product_id_unique UNIQUE (product_id);

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.stock_variants
    ADD CONSTRAINT stock_variants_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tamanhos
    ADD CONSTRAINT tamanhos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.stock_variants
    ADD CONSTRAINT uq_stock_variant_label UNIQUE (stock_item_id, label);

ALTER TABLE ONLY public.usuarios_estabelecimento
    ADD CONSTRAINT usuarios_estabelecimento_email_key UNIQUE (email);

ALTER TABLE ONLY public.usuarios_estabelecimento
    ADD CONSTRAINT usuarios_estabelecimento_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.usuarios_estabelecimento
    ADD CONSTRAINT usuarios_estabelecimento_user_id_key UNIQUE (user_id);

CREATE INDEX idx_adicionais_ativo ON public.adicionais USING btree (ativo);

CREATE INDEX idx_adicionais_categoria_id ON public.adicionais USING btree (categoria_id);

CREATE INDEX idx_adicionais_estabelecimento ON public.adicionais USING btree (estabelecimento_id);

CREATE INDEX idx_avaliacoes_criado_em ON public.avaliacoes USING btree (criado_em DESC);

CREATE INDEX idx_avaliacoes_estabelecimento ON public.avaliacoes USING btree (estabelecimento_id);

CREATE INDEX idx_categorias_estabelecimento ON public.categorias USING btree (estabelecimento_id);

CREATE INDEX idx_categorias_ordem ON public.categorias USING btree (ordem);

CREATE INDEX idx_clientes_cpf ON public.clientes USING btree (cpf) WHERE (cpf IS NOT NULL);

CREATE INDEX idx_clientes_criado_em ON public.clientes USING btree (criado_em);

CREATE INDEX idx_clientes_estabelecimento ON public.clientes USING btree (estabelecimento_id);

CREATE INDEX idx_clientes_telefone ON public.clientes USING btree (telefone);

CREATE INDEX idx_comandas_criado_em ON public.comandas USING btree (criado_em);

CREATE INDEX idx_comandas_criado_por ON public.comandas USING btree (criado_por);

CREATE INDEX idx_comandas_editado_por ON public.comandas USING btree (editado_por);

CREATE INDEX idx_comandas_estabelecimento ON public.comandas USING btree (estabelecimento_id);

CREATE INDEX idx_comandas_finalizado_por ON public.comandas USING btree (finalizado_por);

CREATE INDEX idx_comandas_numero ON public.comandas USING btree (numero_comanda);

CREATE INDEX idx_comandas_numero_status ON public.comandas USING btree (numero_comanda, status) WHERE ((status)::text = 'aberta'::text);

CREATE INDEX idx_comandas_status ON public.comandas USING btree (status);

CREATE INDEX idx_combo_produtos_combo_id ON public.combo_produtos USING btree (combo_id);

CREATE INDEX idx_combo_produtos_estabelecimento ON public.combo_produtos USING btree (estabelecimento_id);

CREATE INDEX idx_combo_produtos_produto_id ON public.combo_produtos USING btree (produto_id);

CREATE INDEX idx_combos_estabelecimento ON public.combos USING btree (estabelecimento_id);

CREATE INDEX idx_configuracoes_estabelecimento ON public.configuracoes USING btree (estabelecimento_id);

CREATE INDEX idx_estoque_estabelecimento ON public.estoque USING btree (estabelecimento_id);

CREATE INDEX idx_estoque_nome ON public.estoque USING btree (nome);

CREATE INDEX idx_funcionarios_email ON public.funcionarios USING btree (email);

CREATE INDEX idx_funcionarios_estabelecimento ON public.funcionarios USING btree (estabelecimento_id);

CREATE INDEX idx_funcionarios_user_id ON public.funcionarios USING btree (user_id);

CREATE INDEX idx_historico_comandas_criado_por ON public.historico_comandas USING btree (criado_por);

CREATE INDEX idx_historico_comandas_estabelecimento ON public.historico_comandas USING btree (estabelecimento_id);

CREATE INDEX idx_historico_comandas_finalizado_em ON public.historico_comandas USING btree (finalizado_em);

CREATE INDEX idx_historico_comandas_finalizado_por ON public.historico_comandas USING btree (finalizado_por);

CREATE INDEX idx_historico_comandas_numero ON public.historico_comandas USING btree (numero_comanda);

CREATE INDEX idx_historico_geral_criado_em ON public.historico_geral USING btree (criado_em);

CREATE INDEX idx_historico_geral_estabelecimento ON public.historico_geral USING btree (estabelecimento_id);

CREATE INDEX idx_historico_geral_movido_em ON public.historico_geral USING btree (movido_em);

CREATE INDEX idx_historico_geral_pedido_id ON public.historico_geral USING btree (pedido_id);

CREATE INDEX idx_historico_pedidos_estabelecimento ON public.historico_pedidos USING btree (estabelecimento_id);

CREATE INDEX idx_historico_pedidos_pedido_data ON public.historico_pedidos USING btree (pedido_id, criado_em);

CREATE INDEX idx_historico_pedidos_pedido_id ON public.historico_pedidos USING btree (pedido_id);

CREATE INDEX idx_logs_auditoria_estab_data ON public.logs_auditoria USING btree (estabelecimento_id, criado_em DESC);

CREATE INDEX idx_pedidos_cancelado_por ON public.pedidos USING btree (cancelado_por);

CREATE INDEX idx_pedidos_cliente_id ON public.pedidos USING btree (cliente_id);

CREATE UNIQUE INDEX idx_pedidos_codigo_pedido ON public.pedidos USING btree (codigo_pedido);

CREATE INDEX idx_pedidos_criado_em ON public.pedidos USING btree (criado_em);

CREATE INDEX idx_pedidos_estabelecimento ON public.pedidos USING btree (estabelecimento_id);

CREATE INDEX idx_pedidos_mercado_pago_payment_id ON public.pedidos USING btree (mercado_pago_payment_id);

CREATE INDEX idx_pedidos_mercado_pago_status ON public.pedidos USING btree (mercado_pago_status);

CREATE INDEX idx_pedidos_pedido_id ON public.pedidos USING btree (pedido_id);

CREATE INDEX idx_pedidos_status_data ON public.pedidos USING btree (status, criado_em);

CREATE INDEX idx_produto_sabores_estabelecimento ON public.produto_sabores USING btree (estabelecimento_id);

CREATE INDEX idx_produto_sabores_produto_id ON public.produto_sabores USING btree (produto_id);

CREATE INDEX idx_produto_sabores_sabor_id ON public.produto_sabores USING btree (sabor_id);

CREATE INDEX idx_produtos_categoria_id ON public.produtos USING btree (categoria_id);

CREATE INDEX idx_produtos_categoria_nome ON public.produtos USING btree (categoria_nome);

CREATE INDEX idx_produtos_estabelecimento ON public.produtos USING btree (estabelecimento_id);

CREATE INDEX idx_sabores_categoria_id_fk ON public.sabores USING btree (categoria_id);

CREATE INDEX idx_sabores_estabelecimento ON public.sabores USING btree (estabelecimento_id);

CREATE INDEX idx_sabores_tipo ON public.sabores USING btree (tipo);

CREATE INDEX idx_sale_installments_estabelecimento ON public.sale_installments USING btree (estabelecimento_id);

CREATE INDEX idx_sale_installments_sale_id ON public.sale_installments USING btree (sale_id);

CREATE INDEX idx_sale_installments_vencimento ON public.sale_installments USING btree (data_vencimento);

CREATE INDEX idx_sales_created_at ON public.sales USING btree (created_at DESC);

CREATE INDEX idx_sales_created_by ON public.sales USING btree (created_by);

CREATE INDEX idx_sales_estabelecimento ON public.sales USING btree (estabelecimento_id);

CREATE INDEX idx_sales_payment_method ON public.sales USING btree (payment_method);

CREATE INDEX idx_sales_sale_number ON public.sales USING btree (sale_number);

CREATE INDEX idx_stock_items_ativo ON public.stock_items USING btree (ativo);

CREATE INDEX idx_stock_items_criado_em ON public.stock_items USING btree (criado_em DESC);

CREATE INDEX idx_stock_items_estabelecimento ON public.stock_items USING btree (estabelecimento_id);

CREATE INDEX idx_stock_items_product_id ON public.stock_items USING btree (product_id);

CREATE INDEX idx_stock_movements_criado_em ON public.stock_movements USING btree (criado_em DESC);

CREATE INDEX idx_stock_movements_estabelecimento ON public.stock_movements USING btree (estabelecimento_id);

CREATE INDEX idx_stock_movements_ref ON public.stock_movements USING btree (ref_type, ref_id);

CREATE INDEX idx_stock_movements_stock_item ON public.stock_movements USING btree (stock_item_id);

CREATE INDEX idx_stock_movements_tipo ON public.stock_movements USING btree (tipo);

CREATE INDEX idx_stock_movements_type ON public.stock_movements USING btree (type);

CREATE INDEX idx_stock_movements_variant ON public.stock_movements USING btree (variant_id);

CREATE INDEX idx_stock_variants_estabelecimento ON public.stock_variants USING btree (estabelecimento_id);

CREATE INDEX idx_stock_variants_sku ON public.stock_variants USING btree (sku);

CREATE INDEX idx_stock_variants_stock_item ON public.stock_variants USING btree (stock_item_id);

CREATE INDEX idx_tamanhos_estabelecimento ON public.tamanhos USING btree (estabelecimento_id);

CREATE INDEX idx_tamanhos_produto_id ON public.tamanhos USING btree (produto_id);

CREATE INDEX idx_tamanhos_produto_ordem ON public.tamanhos USING btree (produto_id, ordem) WHERE (ativo = true);

CREATE UNIQUE INDEX uq_stock_variants_barcode ON public.stock_variants USING btree (barcode) WHERE (barcode IS NOT NULL);

CREATE TRIGGER trg_sale_installments_touch BEFORE UPDATE ON public.sale_installments FOR EACH ROW EXECUTE FUNCTION public.fn_touch_sale_installments();

CREATE TRIGGER trg_sales_touch BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.fn_touch_sales_updated_at();

CREATE TRIGGER trg_stock_items_touch BEFORE UPDATE ON public.stock_items FOR EACH ROW EXECUTE FUNCTION public.fn_touch_stock_timestamps();

CREATE TRIGGER trg_stock_variants_touch BEFORE UPDATE ON public.stock_variants FOR EACH ROW EXECUTE FUNCTION public.fn_touch_stock_timestamps();

CREATE TRIGGER trigger_atualizar_estoque_automatico AFTER UPDATE ON public.produtos FOR EACH ROW WHEN (((new.requires_stock = true) AND (old.requires_stock = false) AND (new.stock_item_id IS NULL))) EXECUTE FUNCTION public.criar_estoque_automatico();

CREATE TRIGGER trigger_categorias_atualizado_em BEFORE UPDATE ON public.categorias FOR EACH ROW EXECUTE FUNCTION public.atualizar_timestamp();

CREATE TRIGGER trigger_combos_atualizado_em BEFORE UPDATE ON public.combos FOR EACH ROW EXECUTE FUNCTION public.atualizar_timestamp();

CREATE TRIGGER trigger_configuracoes_atualizado_em BEFORE UPDATE ON public.configuracoes FOR EACH ROW EXECUTE FUNCTION public.atualizar_timestamp();

CREATE TRIGGER trigger_criar_estoque_automatico AFTER INSERT ON public.produtos FOR EACH ROW WHEN (((new.requires_stock = true) AND (new.stock_item_id IS NULL))) EXECUTE FUNCTION public.criar_estoque_automatico();

CREATE TRIGGER trigger_estoque_atualizado_em BEFORE UPDATE ON public.estoque FOR EACH ROW EXECUTE FUNCTION public.atualizar_timestamp();

CREATE TRIGGER trigger_funcionarios_atualizado_em BEFORE UPDATE ON public.funcionarios FOR EACH ROW EXECUTE FUNCTION public.atualizar_timestamp();

CREATE TRIGGER trigger_produtos_atualizado_em BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.atualizar_timestamp();

CREATE TRIGGER trigger_sabores_atualizado_em BEFORE UPDATE ON public.sabores FOR EACH ROW EXECUTE FUNCTION public.atualizar_timestamp();

CREATE TRIGGER trigger_sync_pedido_status AFTER UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.sync_pedido_status_to_historico();

CREATE TRIGGER trigger_update_comandas_timestamp BEFORE UPDATE ON public.comandas FOR EACH ROW EXECUTE FUNCTION public.update_comandas_updated_at();

CREATE TRIGGER trigger_update_tamanhos_updated_at BEFORE UPDATE ON public.tamanhos FOR EACH ROW EXECUTE FUNCTION public.update_tamanhos_updated_at();

CREATE TRIGGER update_historico_pedidos_updated_at BEFORE UPDATE ON public.historico_pedidos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pedidos_updated_at BEFORE UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE ONLY public.adicionais
    ADD CONSTRAINT adicionais_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id);

ALTER TABLE ONLY public.adicionais
    ADD CONSTRAINT adicionais_estabelecimento_id_fkey FOREIGN KEY (estabelecimento_id) REFERENCES public.estabelecimentos(id);

ALTER TABLE ONLY public.avaliacoes
    ADD CONSTRAINT avaliacoes_estabelecimento_id_fkey FOREIGN KEY (estabelecimento_id) REFERENCES public.estabelecimentos(id);

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_estabelecimento_id_fkey FOREIGN KEY (estabelecimento_id) REFERENCES public.estabelecimentos(id);

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_estabelecimento_id_fkey FOREIGN KEY (estabelecimento_id) REFERENCES public.estabelecimentos(id);

ALTER TABLE ONLY public.comandas
    ADD CONSTRAINT comandas_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES auth.users(id);

ALTER TABLE ONLY public.comandas
    ADD CONSTRAINT comandas_editado_por_fkey FOREIGN KEY (editado_por) REFERENCES auth.users(id);

ALTER TABLE ONLY public.comandas
    ADD CONSTRAINT comandas_estabelecimento_id_fkey FOREIGN KEY (estabelecimento_id) REFERENCES public.estabelecimentos(id);

ALTER TABLE ONLY public.comandas
    ADD CONSTRAINT comandas_finalizado_por_fkey FOREIGN KEY (finalizado_por) REFERENCES auth.users(id);

ALTER TABLE ONLY public.combo_produtos
    ADD CONSTRAINT combo_produtos_combo_id_fkey FOREIGN KEY (combo_id) REFERENCES public.combos(id);

ALTER TABLE ONLY public.combo_produtos
    ADD CONSTRAINT combo_produtos_estabelecimento_id_fkey FOREIGN KEY (estabelecimento_id) REFERENCES public.estabelecimentos(id);

ALTER TABLE ONLY public.combo_produtos
    ADD CONSTRAINT combo_produtos_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES public.produtos(id);

ALTER TABLE ONLY public.combos
    ADD CONSTRAINT combos_estabelecimento_id_fkey FOREIGN KEY (estabelecimento_id) REFERENCES public.estabelecimentos(id);

ALTER TABLE ONLY public.configuracoes
    ADD CONSTRAINT configuracoes_estabelecimento_id_fkey FOREIGN KEY (estabelecimento_id) REFERENCES public.estabelecimentos(id);

ALTER TABLE ONLY public.estoque
    ADD CONSTRAINT estoque_estabelecimento_id_fkey FOREIGN KEY (estabelecimento_id) REFERENCES public.estabelecimentos(id);

ALTER TABLE ONLY public.funcionarios
    ADD CONSTRAINT funcionarios_estabelecimento_id_fkey FOREIGN KEY (estabelecimento_id) REFERENCES public.estabelecimentos(id);

ALTER TABLE ONLY public.funcionarios
    ADD CONSTRAINT funcionarios_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE ONLY public.historico_comandas
    ADD CONSTRAINT historico_comandas_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES auth.users(id);

ALTER TABLE ONLY public.historico_comandas
    ADD CONSTRAINT historico_comandas_estabelecimento_id_fkey FOREIGN KEY (estabelecimento_id) REFERENCES public.estabelecimentos(id);

ALTER TABLE ONLY public.historico_comandas
    ADD CONSTRAINT historico_comandas_finalizado_por_fkey FOREIGN KEY (finalizado_por) REFERENCES auth.users(id);

ALTER TABLE ONLY public.historico_geral
    ADD CONSTRAINT historico_geral_estabelecimento_id_fkey FOREIGN KEY (estabelecimento_id) REFERENCES public.estabelecimentos(id);

ALTER TABLE ONLY public.historico_pedidos
    ADD CONSTRAINT historico_pedidos_estabelecimento_id_fkey FOREIGN KEY (estabelecimento_id) REFERENCES public.estabelecimentos(id);

ALTER TABLE ONLY public.logs_auditoria
    ADD CONSTRAINT logs_auditoria_estabelecimento_id_fkey FOREIGN KEY (estabelecimento_id) REFERENCES public.estabelecimentos(id);

ALTER TABLE ONLY public.logs_auditoria
    ADD CONSTRAINT logs_auditoria_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id);

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_cancelado_por_fkey FOREIGN KEY (cancelado_por) REFERENCES auth.users(id);

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id);

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_estabelecimento_id_fkey FOREIGN KEY (estabelecimento_id) REFERENCES public.estabelecimentos(id);

ALTER TABLE ONLY public.produto_sabores
    ADD CONSTRAINT produto_sabores_estabelecimento_id_fkey FOREIGN KEY (estabelecimento_id) REFERENCES public.estabelecimentos(id);

ALTER TABLE ONLY public.produto_sabores
    ADD CONSTRAINT produto_sabores_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES public.produtos(id);

ALTER TABLE ONLY public.produto_sabores
    ADD CONSTRAINT produto_sabores_sabor_id_fkey FOREIGN KEY (sabor_id) REFERENCES public.sabores(id);

ALTER TABLE ONLY public.produtos
    ADD CONSTRAINT produtos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id);

ALTER TABLE ONLY public.produtos
    ADD CONSTRAINT produtos_estabelecimento_id_fkey FOREIGN KEY (estabelecimento_id) REFERENCES public.estabelecimentos(id);

ALTER TABLE ONLY public.produtos
    ADD CONSTRAINT produtos_stock_item_id_fkey FOREIGN KEY (stock_item_id) REFERENCES public.stock_items(id);

ALTER TABLE ONLY public.profile
    ADD CONSTRAINT profile_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE ONLY public.sabores
    ADD CONSTRAINT sabores_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id);

ALTER TABLE ONLY public.sabores
    ADD CONSTRAINT sabores_estabelecimento_id_fkey FOREIGN KEY (estabelecimento_id) REFERENCES public.estabelecimentos(id);

ALTER TABLE ONLY public.sale_installments
    ADD CONSTRAINT sale_installments_estabelecimento_id_fkey FOREIGN KEY (estabelecimento_id) REFERENCES public.estabelecimentos(id);

ALTER TABLE ONLY public.sale_installments
    ADD CONSTRAINT sale_installments_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_estabelecimento_id_fkey FOREIGN KEY (estabelecimento_id) REFERENCES public.estabelecimentos(id);

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_estabelecimento_id_fkey FOREIGN KEY (estabelecimento_id) REFERENCES public.estabelecimentos(id);

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.produtos(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_estabelecimento_id_fkey FOREIGN KEY (estabelecimento_id) REFERENCES public.estabelecimentos(id);

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_stock_item_id_fkey FOREIGN KEY (stock_item_id) REFERENCES public.stock_items(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id);

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.stock_variants(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.stock_variants
    ADD CONSTRAINT stock_variants_estabelecimento_id_fkey FOREIGN KEY (estabelecimento_id) REFERENCES public.estabelecimentos(id);

ALTER TABLE ONLY public.stock_variants
    ADD CONSTRAINT stock_variants_stock_item_id_fkey FOREIGN KEY (stock_item_id) REFERENCES public.stock_items(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tamanhos
    ADD CONSTRAINT tamanhos_estabelecimento_id_fkey FOREIGN KEY (estabelecimento_id) REFERENCES public.estabelecimentos(id);

ALTER TABLE ONLY public.tamanhos
    ADD CONSTRAINT tamanhos_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES public.produtos(id);

ALTER TABLE ONLY public.usuarios_estabelecimento
    ADD CONSTRAINT usuarios_estabelecimento_estabelecimento_id_fkey FOREIGN KEY (estabelecimento_id) REFERENCES public.estabelecimentos(id);

ALTER TABLE ONLY public.usuarios_estabelecimento
    ADD CONSTRAINT usuarios_estabelecimento_ultimo_estabelecimento_id_fkey FOREIGN KEY (ultimo_estabelecimento_id) REFERENCES public.estabelecimentos(id);

ALTER TABLE ONLY public.usuarios_estabelecimento
    ADD CONSTRAINT usuarios_estabelecimento_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE POLICY "Usuários autenticados podem atualizar profiles" ON public.profile FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem deletar profiles" ON public.profile FOR DELETE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem inserir profiles" ON public.profile FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem ler profiles" ON public.profile FOR SELECT TO authenticated USING (true);

ALTER TABLE public.adicionais ENABLE ROW LEVEL SECURITY;

CREATE POLICY adicionais_delete_tenant ON public.adicionais FOR DELETE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY adicionais_insert_tenant ON public.adicionais FOR INSERT TO authenticated WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY adicionais_select_publico ON public.adicionais FOR SELECT TO anon USING (true);

CREATE POLICY adicionais_select_tenant ON public.adicionais FOR SELECT TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY adicionais_update_tenant ON public.adicionais FOR UPDATE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario))) WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY avaliacoes_delete_tenant ON public.avaliacoes FOR DELETE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY avaliacoes_insert_publico ON public.avaliacoes FOR INSERT TO anon WITH CHECK (public.fn_estabelecimento_ativo(estabelecimento_id));

CREATE POLICY avaliacoes_insert_tenant ON public.avaliacoes FOR INSERT TO authenticated WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY avaliacoes_select_publico ON public.avaliacoes FOR SELECT TO anon USING ((aprovada = true));

CREATE POLICY avaliacoes_select_tenant ON public.avaliacoes FOR SELECT TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY avaliacoes_update_tenant ON public.avaliacoes FOR UPDATE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario))) WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY categorias_delete_tenant ON public.categorias FOR DELETE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY categorias_insert_tenant ON public.categorias FOR INSERT TO authenticated WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY categorias_select_publico ON public.categorias FOR SELECT TO anon USING (true);

CREATE POLICY categorias_select_tenant ON public.categorias FOR SELECT TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY categorias_update_tenant ON public.categorias FOR UPDATE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario))) WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY clientes_delete_tenant ON public.clientes FOR DELETE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY clientes_insert_publico ON public.clientes FOR INSERT TO anon WITH CHECK (public.fn_estabelecimento_ativo(estabelecimento_id));

CREATE POLICY clientes_insert_tenant ON public.clientes FOR INSERT TO authenticated WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY clientes_select_tenant ON public.clientes FOR SELECT TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY clientes_update_tenant ON public.clientes FOR UPDATE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario))) WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

ALTER TABLE public.comandas ENABLE ROW LEVEL SECURITY;

CREATE POLICY comandas_delete_tenant ON public.comandas FOR DELETE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY comandas_insert_tenant ON public.comandas FOR INSERT TO authenticated WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY comandas_select_tenant ON public.comandas FOR SELECT TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY comandas_update_tenant ON public.comandas FOR UPDATE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario))) WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

ALTER TABLE public.combo_produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY combo_produtos_delete_tenant ON public.combo_produtos FOR DELETE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY combo_produtos_insert_tenant ON public.combo_produtos FOR INSERT TO authenticated WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY combo_produtos_select_publico ON public.combo_produtos FOR SELECT TO anon USING (true);

CREATE POLICY combo_produtos_select_tenant ON public.combo_produtos FOR SELECT TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY combo_produtos_update_tenant ON public.combo_produtos FOR UPDATE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario))) WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

ALTER TABLE public.combos ENABLE ROW LEVEL SECURITY;

CREATE POLICY combos_delete_tenant ON public.combos FOR DELETE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY combos_insert_tenant ON public.combos FOR INSERT TO authenticated WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY combos_select_publico ON public.combos FOR SELECT TO anon USING (true);

CREATE POLICY combos_select_tenant ON public.combos FOR SELECT TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY combos_update_tenant ON public.combos FOR UPDATE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario))) WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY configuracoes_delete_tenant ON public.configuracoes FOR DELETE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY configuracoes_insert_tenant ON public.configuracoes FOR INSERT TO authenticated WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY configuracoes_select_publico ON public.configuracoes FOR SELECT TO anon USING (((chave)::text = ANY ((ARRAY['nome_estabelecimento'::character varying, 'logo_url'::character varying, 'banner_url'::character varying, 'telefone'::character varying, 'email'::character varying, 'endereco'::character varying, 'cep'::character varying, 'horario_funcionamento'::character varying, 'trabalha_feriado'::character varying, 'metodos_pagamento'::character varying, 'tickets_promocionais'::character varying, 'tipo_checkout'::character varying, 'taxa_extra_km_ativa'::character varying, 'taxa_extra_km_inicial'::character varying, 'taxa_extra_km_faixas'::character varying, 'font_size_base'::character varying, 'font_size_store_name'::character varying, 'font_size_section_title'::character varying, 'font_size_item_sub'::character varying, 'font_size_totals'::character varying, 'font_size_total_final'::character varying, 'som_notificacao'::character varying, 'volume_notificacao'::character varying, 'google_analytics_measurement_id'::character varying, 'google_analytics_ativo'::character varying, 'modo_cardapio_whatsapp'::character varying, 'whatsapp_loja'::character varying, 'favicon_url'::character varying])::text[])));

CREATE POLICY configuracoes_select_tenant ON public.configuracoes FOR SELECT TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY configuracoes_update_tenant ON public.configuracoes FOR UPDATE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario))) WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

ALTER TABLE public.estabelecimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY estabelecimentos_delete ON public.estabelecimentos FOR DELETE TO authenticated USING (public.fn_is_admin_geral());

CREATE POLICY estabelecimentos_insert ON public.estabelecimentos FOR INSERT TO authenticated WITH CHECK (public.fn_is_admin_geral());

CREATE POLICY estabelecimentos_select ON public.estabelecimentos FOR SELECT TO authenticated USING ((public.fn_is_admin_geral() OR (id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario))));

CREATE POLICY estabelecimentos_select_publico ON public.estabelecimentos FOR SELECT TO anon USING ((ativo = true));

CREATE POLICY estabelecimentos_update ON public.estabelecimentos FOR UPDATE TO authenticated USING (public.fn_is_admin_geral()) WITH CHECK (public.fn_is_admin_geral());

ALTER TABLE public.estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY estoque_delete_tenant ON public.estoque FOR DELETE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY estoque_insert_tenant ON public.estoque FOR INSERT TO authenticated WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY estoque_select_tenant ON public.estoque FOR SELECT TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY estoque_update_tenant ON public.estoque FOR UPDATE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario))) WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY funcionarios_delete_tenant ON public.funcionarios FOR DELETE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY funcionarios_insert_tenant ON public.funcionarios FOR INSERT TO authenticated WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY funcionarios_select_tenant ON public.funcionarios FOR SELECT TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY funcionarios_update_tenant ON public.funcionarios FOR UPDATE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario))) WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

ALTER TABLE public.historico_comandas ENABLE ROW LEVEL SECURITY;

CREATE POLICY historico_comandas_delete_tenant ON public.historico_comandas FOR DELETE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY historico_comandas_insert_tenant ON public.historico_comandas FOR INSERT TO authenticated WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY historico_comandas_select_tenant ON public.historico_comandas FOR SELECT TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY historico_comandas_update_tenant ON public.historico_comandas FOR UPDATE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario))) WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

ALTER TABLE public.historico_geral ENABLE ROW LEVEL SECURITY;

CREATE POLICY historico_geral_delete_tenant ON public.historico_geral FOR DELETE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY historico_geral_insert_tenant ON public.historico_geral FOR INSERT TO authenticated WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY historico_geral_select_tenant ON public.historico_geral FOR SELECT TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY historico_geral_update_tenant ON public.historico_geral FOR UPDATE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario))) WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

ALTER TABLE public.historico_pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY historico_pedidos_delete_tenant ON public.historico_pedidos FOR DELETE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY historico_pedidos_insert_tenant ON public.historico_pedidos FOR INSERT TO authenticated WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY historico_pedidos_select_tenant ON public.historico_pedidos FOR SELECT TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY historico_pedidos_update_tenant ON public.historico_pedidos FOR UPDATE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario))) WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

ALTER TABLE public.logs_auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY logs_auditoria_insert ON public.logs_auditoria FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) IS NOT NULL));

CREATE POLICY logs_auditoria_select ON public.logs_auditoria FOR SELECT TO authenticated USING ((public.fn_is_admin_geral() OR (public.fn_is_admin_estabelecimento() AND (estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)))));

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY pedidos_delete_tenant ON public.pedidos FOR DELETE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY pedidos_insert_publico ON public.pedidos FOR INSERT TO anon WITH CHECK (public.fn_estabelecimento_ativo(estabelecimento_id));

CREATE POLICY pedidos_insert_tenant ON public.pedidos FOR INSERT TO authenticated WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY pedidos_select_tenant ON public.pedidos FOR SELECT TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY pedidos_update_tenant ON public.pedidos FOR UPDATE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario))) WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

ALTER TABLE public.produto_sabores ENABLE ROW LEVEL SECURITY;

CREATE POLICY produto_sabores_delete_tenant ON public.produto_sabores FOR DELETE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY produto_sabores_insert_tenant ON public.produto_sabores FOR INSERT TO authenticated WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY produto_sabores_select_publico ON public.produto_sabores FOR SELECT TO anon USING (true);

CREATE POLICY produto_sabores_select_tenant ON public.produto_sabores FOR SELECT TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY produto_sabores_update_tenant ON public.produto_sabores FOR UPDATE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario))) WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY produtos_delete_tenant ON public.produtos FOR DELETE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY produtos_insert_tenant ON public.produtos FOR INSERT TO authenticated WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY produtos_select_publico ON public.produtos FOR SELECT TO anon USING (true);

CREATE POLICY produtos_select_tenant ON public.produtos FOR SELECT TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY produtos_update_tenant ON public.produtos FOR UPDATE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario))) WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

ALTER TABLE public.profile ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sabores ENABLE ROW LEVEL SECURITY;

CREATE POLICY sabores_delete_tenant ON public.sabores FOR DELETE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY sabores_insert_tenant ON public.sabores FOR INSERT TO authenticated WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY sabores_select_publico ON public.sabores FOR SELECT TO anon USING (true);

CREATE POLICY sabores_select_tenant ON public.sabores FOR SELECT TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY sabores_update_tenant ON public.sabores FOR UPDATE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario))) WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

ALTER TABLE public.sale_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY sale_installments_delete_tenant ON public.sale_installments FOR DELETE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY sale_installments_insert_tenant ON public.sale_installments FOR INSERT TO authenticated WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY sale_installments_select_tenant ON public.sale_installments FOR SELECT TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY sale_installments_update_tenant ON public.sale_installments FOR UPDATE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario))) WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY sales_delete_tenant ON public.sales FOR DELETE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY sales_insert_tenant ON public.sales FOR INSERT TO authenticated WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY sales_select_tenant ON public.sales FOR SELECT TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY sales_update_tenant ON public.sales FOR UPDATE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario))) WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY stock_items_delete_tenant ON public.stock_items FOR DELETE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY stock_items_insert_tenant ON public.stock_items FOR INSERT TO authenticated WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY stock_items_select_tenant ON public.stock_items FOR SELECT TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY stock_items_update_tenant ON public.stock_items FOR UPDATE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario))) WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY stock_movements_delete_tenant ON public.stock_movements FOR DELETE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY stock_movements_insert_tenant ON public.stock_movements FOR INSERT TO authenticated WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY stock_movements_select_tenant ON public.stock_movements FOR SELECT TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY stock_movements_update_tenant ON public.stock_movements FOR UPDATE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario))) WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

ALTER TABLE public.stock_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY stock_variants_delete_tenant ON public.stock_variants FOR DELETE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY stock_variants_insert_tenant ON public.stock_variants FOR INSERT TO authenticated WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY stock_variants_select_tenant ON public.stock_variants FOR SELECT TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY stock_variants_update_tenant ON public.stock_variants FOR UPDATE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario))) WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

ALTER TABLE public.tamanhos ENABLE ROW LEVEL SECURITY;

CREATE POLICY tamanhos_delete_tenant ON public.tamanhos FOR DELETE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY tamanhos_insert_tenant ON public.tamanhos FOR INSERT TO authenticated WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY tamanhos_select_publico ON public.tamanhos FOR SELECT TO anon USING (true);

CREATE POLICY tamanhos_select_tenant ON public.tamanhos FOR SELECT TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY tamanhos_update_tenant ON public.tamanhos FOR UPDATE TO authenticated USING ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario))) WITH CHECK ((estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)));

CREATE POLICY usuarios_estab_delete ON public.usuarios_estabelecimento FOR DELETE TO authenticated USING ((public.fn_is_admin_geral() OR (public.fn_is_admin_estabelecimento() AND (estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)))));

CREATE POLICY usuarios_estab_insert ON public.usuarios_estabelecimento FOR INSERT TO authenticated WITH CHECK (((public.fn_is_admin_geral() OR (public.fn_is_admin_estabelecimento() AND (estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)))) AND (((perfil)::text <> 'administrador_geral'::text) OR public.fn_is_admin_geral())));

CREATE POLICY usuarios_estab_select ON public.usuarios_estabelecimento FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR public.fn_is_admin_geral() OR (public.fn_is_admin_estabelecimento() AND (estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)))));

CREATE POLICY usuarios_estab_update ON public.usuarios_estabelecimento FOR UPDATE TO authenticated USING ((public.fn_is_admin_geral() OR (public.fn_is_admin_estabelecimento() AND (estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario))))) WITH CHECK (((public.fn_is_admin_geral() OR (public.fn_is_admin_estabelecimento() AND (estabelecimento_id IN ( SELECT public.fn_estabelecimentos_do_usuario() AS fn_estabelecimentos_do_usuario)))) AND (((perfil)::text <> 'administrador_geral'::text) OR public.fn_is_admin_geral())));

ALTER TABLE public.usuarios_estabelecimento ENABLE ROW LEVEL SECURITY;

--
--

SET check_function_bodies = true;
