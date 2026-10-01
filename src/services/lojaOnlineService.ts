/**
 * Serviço da loja online: pedidos pelo catálogo público de cada estabelecimento.
 * Com `pagamento_online` o cliente paga via Mercado Pago Checkout Pro; sem ele o
 * pedido vai direto para o Kanban e é pago na retirada/entrega.
 *
 * A criação do pedido e a confirmação do pagamento rodam na Edge Function
 * `catalogo-pedidos` (preços, estoque e status são sempre validados no servidor).
 *
 * @module services/lojaOnlineService
 */

import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { tenantId } from './tenant'
import type { ResumoPedidoWhatsApp } from '@/components/catalogo/whatsappPedido'

export type TipoVenda = 'varejo' | 'atacado'
/** Formas cobradas online pelo Mercado Pago */
export type FormaPagamentoOnline = 'pix' | 'cartao_credito' | 'cartao_debito'
/** Mesmos valores de `metodos_pagamento` (Configurações > Pagamento) */
export type FormaPagamentoPedido = FormaPagamentoOnline | 'dinheiro'

/** Configuração pública (sem segredos) lida pelo catálogo */
export interface ConfigCatalogoPublica {
  estabelecimento_id: string | null
  /** true só quando a loja ligou, o módulo está contratado e (se cobra online) há token */
  pedidos_ativos: boolean
  pagamento_online: boolean
  pix: boolean
  credito: boolean
  debito: boolean
  max_parcelas: number
  atacado_ativo: boolean
  atacado_pedido_minimo: number
}

/** Configuração editável no painel (o token nunca volta para o navegador) */
export interface ConfigLojaOnline {
  id?: string
  pedidos_ativos: boolean
  pagamento_online: boolean
  ambiente: 'teste' | 'producao'
  token_configurado: boolean
  pix_ativo: boolean
  credito_ativo: boolean
  debito_ativo: boolean
  max_parcelas: number
  atacado_ativo: boolean
  atacado_pedido_minimo: number
}

export interface NovoPedidoCatalogo {
  estabelecimento_id: string
  tipo_venda: TipoVenda
  forma_pagamento: FormaPagamentoPedido
  cliente: { nome: string; telefone: string; email?: string }
  itens: Array<{ produto_id: string; variante_id?: string | null; quantidade: number }>
  observacoes?: string
}

export interface PedidoCriado {
  pedido_id: string
  codigo_pedido: string
  total: number
  /** null quando a loja não cobra online */
  checkout_url: string | null
  /** Resumo para a mensagem de WhatsApp (pedidos sem pagamento online) */
  resumo?: ResumoPedidoWhatsApp
}

export interface StatusPedidoCatalogo {
  pedido_id: string
  codigo_pedido: string
  cliente_nome?: string
  observacoes?: string | null
  tipo_venda: TipoVenda
  forma_pagamento: string
  pagamento_online: boolean
  status_pagamento: string | null
  status_pedido: string
  cancelado: boolean
  total: number
  criado_em: string
  itens: Array<{ nome: string; quantidade: number; preco_unitario: number; subtotal: number }>
  checkout_url: string | null
}

export const CONFIG_PUBLICA_PADRAO: ConfigCatalogoPublica = {
  estabelecimento_id: null,
  pedidos_ativos: false,
  pagamento_online: false,
  pix: false,
  credito: false,
  debito: false,
  max_parcelas: 1,
  atacado_ativo: false,
  atacado_pedido_minimo: 0
}

const CONFIG_LOJA_PADRAO: ConfigLojaOnline = {
  pedidos_ativos: false,
  pagamento_online: false,
  ambiente: 'producao',
  token_configurado: false,
  pix_ativo: true,
  credito_ativo: true,
  debito_ativo: true,
  max_parcelas: 1,
  atacado_ativo: false,
  atacado_pedido_minimo: 0
}

const COLUNAS_CONFIG =
  'id, pedidos_ativos, pagamento_online, ambiente, token_configurado, pix_ativo, credito_ativo, debito_ativo, max_parcelas, atacado_ativo, atacado_pedido_minimo'

/** Extrai a mensagem de erro amigável devolvida pela Edge Function */
async function mensagemDeErro(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json()
      if (body?.error) return String(body.error)
    } catch {
      /* corpo não é JSON */
    }
  }
  return 'Não foi possível falar com o servidor. Verifique sua conexão e tente novamente.'
}

export const lojaOnlineService = {
  // ---------------------------------------------------------------- catálogo
  async buscarConfigPublica(estabelecimentoId: string): Promise<ConfigCatalogoPublica> {
    const { data, error } = await supabase.rpc('catalogo_config_publica', {
      p_estabelecimento_id: estabelecimentoId
    })
    if (error || !data) {
      if (error) console.error('Erro ao carregar configuração da loja online:', error)
      return CONFIG_PUBLICA_PADRAO
    }
    return {
      ...CONFIG_PUBLICA_PADRAO,
      ...(data as ConfigCatalogoPublica),
      atacado_pedido_minimo: Number((data as ConfigCatalogoPublica).atacado_pedido_minimo) || 0
    }
  },

  /** Saldo de estoque e variantes dos produtos da loja (o visitante não lê stock_items) */
  async buscarEstoquePublico(estabelecimentoId: string): Promise<Array<{
    produto_id: string
    quantidade: number
    variante_id: string | null
    variante_nome: string | null
    variante_quantidade: number
  }>> {
    const { data, error } = await supabase.rpc('catalogo_estoque_publico', {
      p_estabelecimento_id: estabelecimentoId
    })
    if (error) {
      console.error('Erro ao carregar estoque do catálogo:', error)
      return []
    }
    return (data ?? []).map((l: Record<string, unknown>) => ({
      produto_id: String(l.produto_id),
      quantidade: Number(l.quantidade) || 0,
      variante_id: l.variante_id ? String(l.variante_id) : null,
      variante_nome: l.variante_nome ? String(l.variante_nome) : null,
      variante_quantidade: Number(l.variante_quantidade) || 0
    }))
  },

  async criarPedido(pedido: NovoPedidoCatalogo): Promise<PedidoCriado> {
    const { data, error } = await supabase.functions.invoke('catalogo-pedidos', {
      body: { action: 'criar', ...pedido }
    })
    if (error) throw new Error(await mensagemDeErro(error))
    return data as PedidoCriado
  },

  /** Consulta o pedido (e confirma o pagamento no Mercado Pago, se houver) */
  async consultarPedido(pedidoId: string): Promise<StatusPedidoCatalogo> {
    const { data, error } = await supabase.functions.invoke('catalogo-pedidos', {
      body: { action: 'confirmar', pedido_id: pedidoId }
    })
    if (error) throw new Error(await mensagemDeErro(error))
    return data as StatusPedidoCatalogo
  },

  // ------------------------------------------------------------------ painel
  async buscarConfig(): Promise<ConfigLojaOnline> {
    const { data, error } = await supabase
      .from('config_loja_online')
      .select(COLUNAS_CONFIG)
      .eq('estabelecimento_id', tenantId())
      .maybeSingle()
    if (error) throw new Error(`Falha ao carregar configuração: ${error.message}`)
    if (!data) return { ...CONFIG_LOJA_PADRAO }
    return { ...(data as ConfigLojaOnline), atacado_pedido_minimo: Number(data.atacado_pedido_minimo) || 0 }
  },

  /**
   * Salva a configuração. `accessToken` só é enviado quando o usuário digita um
   * novo token; string vazia remove o token atual.
   */
  async salvarConfig(
    config: Omit<ConfigLojaOnline, 'id' | 'token_configurado'>,
    accessToken?: string
  ): Promise<ConfigLojaOnline> {
    const estabelecimentoId = tenantId()
    const campos: Record<string, unknown> = {
      pedidos_ativos: config.pedidos_ativos,
      pagamento_online: config.pagamento_online,
      ambiente: config.ambiente,
      pix_ativo: config.pix_ativo,
      credito_ativo: config.credito_ativo,
      debito_ativo: config.debito_ativo,
      max_parcelas: config.max_parcelas,
      atacado_ativo: config.atacado_ativo,
      atacado_pedido_minimo: config.atacado_pedido_minimo
    }
    if (accessToken !== undefined) campos.access_token = accessToken.trim() || null

    const { data: existente, error: erroBusca } = await supabase
      .from('config_loja_online')
      .select('id')
      .eq('estabelecimento_id', estabelecimentoId)
      .maybeSingle()
    if (erroBusca) throw new Error(`Falha ao salvar: ${erroBusca.message}`)

    // Sem RETURNING: a coluna access_token não pode ser lida pelo navegador
    const { error } = existente
      ? await supabase.from('config_loja_online').update(campos).eq('id', existente.id)
      : await supabase.from('config_loja_online').insert({ ...campos, estabelecimento_id: estabelecimentoId })
    if (error) throw new Error(`Falha ao salvar: ${error.message}`)

    return this.buscarConfig()
  }
}

export default lojaOnlineService
