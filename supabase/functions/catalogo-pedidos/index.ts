// Edge function: pedidos do catálogo público, com ou sem Mercado Pago Checkout Pro.
//
// POST { action: 'criar', ... }     → valida, calcula preços no servidor e grava o pedido. Se a loja
//                                     cobra online (pagamento_online), o pedido fica em
//                                     "Aguardando pagamento" e é criada a preferência do Checkout Pro;
//                                     senão vai direto para o Kanban ("Pedido criado").
// POST { action: 'confirmar', ... } → consulta o pagamento no Mercado Pago e atualiza o pedido
// POST ?webhook=1&e=<estab_id>     → notificação do Mercado Pago (mesmo processamento do 'confirmar')
//
// Deploy com verify_jwt = false: o webhook do Mercado Pago não envia JWT. Nenhuma
// informação vinda do cliente é confiada: preços, estoque e status do pagamento
// são sempre lidos do banco e da API do Mercado Pago.
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { lerConfig, lerCredenciaisMercadoPago } from '../_shared/configEstabelecimento.ts'
import {
  centavos,
  ErroCliente,
  formasAceitas,
  formatarTelefone,
  precoCatalogo,
  UUID_RE,
  validarEntradaCriar,
  type ConfigPublica,
  type FormaOnline,
} from './regras.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MP_API = 'https://api.mercadopago.com'
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function admin(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })
}

async function mp<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${MP_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error('Mercado Pago erro', res.status, path, JSON.stringify(body))
    throw new Error(`Mercado Pago respondeu ${res.status}: ${body?.message ?? 'erro'}`)
  }
  return body as T
}

// ---------------------------------------------------------------------------
// criar
// ---------------------------------------------------------------------------
/** Liga o pedido ao cadastro de clientes da loja (cria se ainda não existir). Não crítico. */
async function vincularCliente(
  db: SupabaseClient,
  estabelecimentoId: string,
  nome: string,
  telefone: string,
  email: string,
  total: number,
): Promise<string | null> {
  try {
    const [primeiroNome, ...resto] = nome.split(' ')
    const { data: existente } = await db
      .from('clientes')
      .select('id, total_pedidos, valor_total_gasto')
      .eq('estabelecimento_id', estabelecimentoId)
      .eq('telefone', telefone)
      .limit(1)
      .maybeSingle()

    if (existente) {
      await db
        .from('clientes')
        .update({
          total_pedidos: (Number(existente.total_pedidos) || 0) + 1,
          valor_total_gasto: centavos((Number(existente.valor_total_gasto) || 0) + total),
          ultimo_pedido_em: new Date().toISOString(),
        })
        .eq('id', existente.id)
      return existente.id
    }

    const { data: novo, error } = await db
      .from('clientes')
      .insert({
        estabelecimento_id: estabelecimentoId,
        nome: primeiroNome,
        sobrenome: resto.join(' '),
        telefone,
        email: email || null,
        total_pedidos: 1,
        valor_total_gasto: total,
        ultimo_pedido_em: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (error) throw error
    return novo.id
  } catch (e) {
    console.error('Falha ao vincular cliente (seguindo sem cliente):', e)
    return null
  }
}

async function registrarHistorico(db: SupabaseClient, pedido: { codigo_pedido: string; estabelecimento_id: string }, status: string, observacao: string) {
  const { error } = await db.from('historico_pedidos').insert({
    pedido_id: pedido.codigo_pedido,
    status,
    observacao,
    estabelecimento_id: pedido.estabelecimento_id,
  })
  if (error) console.error('Falha ao registrar histórico do pedido', pedido.codigo_pedido, error)
}

async function criarPedido(req: Request, body: any) {
  const entrada = validarEntradaCriar(body)
  const db = admin()

  const origin = req.headers.get('origin') ?? ''
  let baseRetorno: URL
  try {
    baseRetorno = new URL(origin)
    if (!['http:', 'https:'].includes(baseRetorno.protocol)) throw new Error()
  } catch {
    throw new ErroCliente('Origem da requisição inválida.')
  }

  // Loja: aberta para pedidos? (módulo contratado, cliente liberado, loja ligou)
  const [{ data: config, error: errConfig }, { data: estab, error: errEstab }] = await Promise.all([
    db.rpc('catalogo_config_publica', { p_estabelecimento_id: entrada.estabelecimentoId }),
    db.from('estabelecimentos').select('id, nome, slug').eq('id', entrada.estabelecimentoId).maybeSingle(),
  ])
  if (errConfig) throw errConfig
  if (errEstab) throw errEstab
  if (!estab || !config?.pedidos_ativos) {
    throw new ErroCliente('Esta loja não está recebendo pedidos pelo site no momento.', 409)
  }
  const cfg = config as ConfigPublica

  const credenciais = cfg.pagamento_online
    ? await lerCredenciaisMercadoPago(db, entrada.estabelecimentoId)
    : null
  if (cfg.pagamento_online && !credenciais?.accessToken) {
    throw new ErroCliente('Esta loja não está recebendo pedidos pelo site no momento.', 409)
  }

  const aceitas = formasAceitas(cfg, cfg.pagamento_online ? null : await lerConfig(db, entrada.estabelecimentoId, 'metodos_pagamento'))
  if (!aceitas.includes(entrada.forma)) throw new ErroCliente('Forma de pagamento indisponível.')
  if (cfg.pagamento_online && !entrada.email) throw new ErroCliente('Informe seu e-mail.')
  if (entrada.tipoVenda === 'atacado' && !cfg.atacado_ativo) {
    throw new ErroCliente('Vendas no atacado não estão disponíveis nesta loja.')
  }

  // Produtos: ativos e todos desta loja
  const produtoIds = [...new Set(entrada.itens.map((i) => i.produto_id))]
  const { data: produtos, error: errProdutos } = await db
    .from('produtos')
    .select('id, nome, preco, preco_promocional, preco_online, preco_atacado, categoria_nome, requires_stock, ativo')
    .eq('estabelecimento_id', entrada.estabelecimentoId)
    .in('id', produtoIds)
  if (errProdutos) throw errProdutos
  const mapaProdutos = new Map((produtos ?? []).map((p) => [p.id, p]))
  for (const id of produtoIds) {
    const p = mapaProdutos.get(id)
    if (!p || !p.ativo) throw new ErroCliente('Um dos produtos não está mais disponível. Atualize a página.')
  }

  // Estoque e variantes (um stock_item por produto)
  const { data: stockItems, error: errStock } = await db
    .from('stock_items')
    .select('id, product_id, quantidade')
    .eq('estabelecimento_id', entrada.estabelecimentoId)
    .in('product_id', produtoIds)
    .order('criado_em', { ascending: true })
  if (errStock) throw errStock
  const stockPorProduto = new Map<string, { id: string; quantidade: number }>()
  for (const s of stockItems ?? []) {
    if (!stockPorProduto.has(s.product_id)) {
      stockPorProduto.set(s.product_id, { id: s.id, quantidade: Number(s.quantidade) || 0 })
    }
  }
  const stockIds = [...stockPorProduto.values()].map((s) => s.id)
  const { data: variantes, error: errVar } = stockIds.length
    ? await db.from('stock_variants').select('id, stock_item_id, nome, label, quantidade').in('stock_item_id', stockIds)
    : { data: [], error: null }
  if (errVar) throw errVar
  const variantesPorStock = new Map<string, any[]>()
  for (const v of variantes ?? []) {
    const lista = variantesPorStock.get(v.stock_item_id) ?? []
    lista.push(v)
    variantesPorStock.set(v.stock_item_id, lista)
  }

  // Itens de pedidos em aberto (ainda não finalizados) seguram o estoque
  const { data: reservados, error: errReserva } = await db.rpc('catalogo_estoque_reservado', {
    p_estabelecimento_id: entrada.estabelecimentoId,
    p_produto_ids: produtoIds,
  })
  if (errReserva) throw errReserva
  const reservadoPorProduto = new Map<string, number>()
  const reservadoPorVariante = new Map<string, number>()
  for (const r of reservados ?? []) {
    const qtd = Number(r.quantidade) || 0
    reservadoPorProduto.set(r.produto_id, (reservadoPorProduto.get(r.produto_id) ?? 0) + qtd)
    if (r.variante_id) reservadoPorVariante.set(r.variante_id, (reservadoPorVariante.get(r.variante_id) ?? 0) + qtd)
  }

  // Itens com preço do servidor
  let subtotal = 0
  const itensPedido = entrada.itens.map((item) => {
    const p = mapaProdutos.get(item.produto_id)!
    const stock = stockPorProduto.get(p.id)
    const listaVariantes = stock ? variantesPorStock.get(stock.id) ?? [] : []

    let variante: any = null
    if (listaVariantes.length > 0) {
      if (!item.variante_id) throw new ErroCliente(`Escolha uma opção para "${p.nome}".`)
      variante = listaVariantes.find((v) => v.id === item.variante_id)
      if (!variante) throw new ErroCliente(`Opção inválida para "${p.nome}".`)
    } else if (item.variante_id) {
      throw new ErroCliente(`Opção inválida para "${p.nome}".`)
    }

    if (p.requires_stock !== false && stock) {
      const disponivel = Math.max(
        variante
          ? (Number(variante.quantidade) || 0) - (reservadoPorVariante.get(variante.id) ?? 0)
          : stock.quantidade - (reservadoPorProduto.get(p.id) ?? 0),
        0,
      )
      if (disponivel < item.quantidade) {
        const rotulo = variante ? `${p.nome} (${variante.nome || variante.label})` : p.nome
        throw new ErroCliente(
          disponivel > 0
            ? `Estoque insuficiente para "${rotulo}". Disponível: ${disponivel}.`
            : `"${rotulo}" está esgotado.`,
          409,
        )
      }
    }

    const unitario = centavos(precoCatalogo(p, entrada.tipoVenda))
    if (unitario <= 0) throw new ErroCliente(`"${p.nome}" não está disponível para pedido online.`)
    const totalItem = centavos(unitario * item.quantidade)
    subtotal = centavos(subtotal + totalItem)
    const varianteNome = variante ? String(variante.nome || variante.label || '') : null

    // Mesmo formato dos itens do checkout (Kanban, impressão e baixa de estoque)
    return {
      produto_id: p.id,
      variantId: variante?.id ?? null,
      variante_nome: varianteNome,
      quantidade: item.quantidade,
      preco_unitario: unitario,
      subtotal: totalItem,
      produto: {
        id: p.id,
        nome: varianteNome ? `${p.nome} - ${varianteNome}` : p.nome,
        preco: unitario,
        categoria_nome: p.categoria_nome,
      },
    }
  })

  if (subtotal <= 0) throw new ErroCliente('Total do pedido inválido.')
  const pedidoMinimo = Number(cfg.atacado_pedido_minimo) || 0
  if (entrada.tipoVenda === 'atacado' && subtotal < pedidoMinimo) {
    throw new ErroCliente(`O pedido mínimo no atacado é de R$ ${pedidoMinimo.toFixed(2).replace('.', ',')}.`)
  }

  // Grava o pedido
  const { data: codigo, error: errCodigo } = await db.rpc('proximo_codigo_pedido_catalogo')
  if (errCodigo) throw errCodigo
  const [primeiroNome, ...resto] = entrada.nome.split(' ')
  const telefone = formatarTelefone(entrada.telefone)
  const clienteId = await vincularCliente(db, entrada.estabelecimentoId, entrada.nome, telefone, entrada.email, subtotal)
  const status = cfg.pagamento_online ? 'Aguardando pagamento' : 'Pedido criado'

  const { data: pedido, error: errPedido } = await db
    .from('pedidos')
    .insert({
      pedido_id: `CAT-${codigo}`,
      codigo_pedido: String(codigo),
      origem: 'catalogo',
      tipo_venda: entrada.tipoVenda,
      estabelecimento_id: entrada.estabelecimentoId,
      cliente_id: clienteId,
      cliente_nome: primeiroNome,
      cliente_sobrenome: resto.join(' '),
      cliente_telefone: telefone,
      cliente_email: entrada.email || null,
      entrega_domicilio: false,
      forma_pagamento: entrada.forma,
      subtotal,
      taxa_entrega: 0,
      taxa_extra_km: 0,
      total: subtotal,
      desconto: 0,
      tipo_desconto: 'valor',
      itens: itensPedido,
      status,
      previsao_entrega: 'Retirada no local',
      observacoes: entrada.observacoes,
      // null = pedido sem cobrança online (paga na retirada/entrega)
      mercado_pago_status: cfg.pagamento_online ? 'pending' : null,
    })
    .select('id, codigo_pedido, total, estabelecimento_id')
    .single()
  if (errPedido) throw errPedido

  await registrarHistorico(
    db,
    pedido,
    status,
    cfg.pagamento_online ? 'Pedido feito pelo catálogo, aguardando pagamento online' : 'Pedido recebido pelo catálogo',
  )

  const urlStatus = `${baseRetorno.origin}/${estab.slug}/pedido/${pedido.id}`

  if (!cfg.pagamento_online) {
    // Resumo com os valores do servidor para a mensagem de WhatsApp do cliente
    return json({
      pedido_id: pedido.id,
      codigo_pedido: pedido.codigo_pedido,
      total: Number(pedido.total),
      checkout_url: null,
      resumo: {
        codigo_pedido: pedido.codigo_pedido,
        cliente_nome: entrada.nome,
        tipo_venda: entrada.tipoVenda,
        forma_pagamento: entrada.forma,
        pagamento_online: false,
        total: Number(pedido.total),
        observacoes: entrada.observacoes,
        itens: itensPedido.map((i) => ({ nome: i.produto.nome, quantidade: i.quantidade, subtotal: i.subtotal })),
      },
    })
  }

  // Preferência do Checkout Pro limitada à forma escolhida
  const formaOnline = entrada.forma as FormaOnline
  const tiposExcluidos: Record<FormaOnline, string[]> = {
    pix: ['credit_card', 'debit_card', 'prepaid_card', 'ticket', 'atm'],
    cartao_credito: ['debit_card', 'prepaid_card', 'bank_transfer', 'ticket', 'atm'],
    cartao_debito: ['credit_card', 'prepaid_card', 'bank_transfer', 'ticket', 'atm'],
  }
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const agora = Date.now()

  try {
    const preferencia = await mp<{ id: string; init_point: string; sandbox_init_point?: string }>(
      credenciais!.accessToken!,
      '/checkout/preferences',
      {
        method: 'POST',
        headers: { 'X-Idempotency-Key': pedido.id },
        body: JSON.stringify({
          items: itensPedido.map((i) => ({
            id: i.produto_id,
            title: i.produto.nome.slice(0, 250),
            quantity: i.quantidade,
            unit_price: i.preco_unitario,
            currency_id: 'BRL',
          })),
          payer: {
            name: primeiroNome,
            surname: resto.join(' ') || undefined,
            email: entrada.email,
          },
          external_reference: pedido.id,
          back_urls: { success: urlStatus, pending: urlStatus, failure: urlStatus },
          // O Mercado Pago só aceita auto_return com URL https
          ...(baseRetorno.protocol === 'https:' ? { auto_return: 'approved' } : {}),
          notification_url: `${supabaseUrl}/functions/v1/catalogo-pedidos?webhook=1&e=${entrada.estabelecimentoId}`,
          payment_methods: {
            excluded_payment_types: tiposExcluidos[formaOnline].map((id) => ({ id })),
            installments: formaOnline === 'cartao_credito' ? cfg.max_parcelas : 1,
            default_installments: 1,
          },
          // PIX vence junto com a limpeza de "Aguardando pagamento" (10 min); cartão em 1 h
          date_of_expiration: new Date(agora + 10 * 60 * 1000).toISOString(),
          expires: true,
          expiration_date_to: new Date(agora + 60 * 60 * 1000).toISOString(),
          statement_descriptor: String(estab.nome || 'Loja').replace(/[^\w ]/g, '').slice(0, 22) || undefined,
          metadata: { pedido_id: pedido.id, codigo_pedido: pedido.codigo_pedido },
        }),
      },
    )

    await db.from('pedidos').update({ mercado_pago_preference_id: preferencia.id }).eq('id', pedido.id)

    const checkoutUrl =
      credenciais!.ambiente === 'teste' && preferencia.sandbox_init_point
        ? preferencia.sandbox_init_point
        : preferencia.init_point

    return json({
      pedido_id: pedido.id,
      codigo_pedido: pedido.codigo_pedido,
      total: Number(pedido.total),
      checkout_url: checkoutUrl,
    })
  } catch (e) {
    // Sem cobrança criada o pedido não tem como ser pago
    await db
      .from('pedidos')
      .update({
        status: 'Cancelado',
        cancelado: true,
        cancelado_em: new Date().toISOString(),
        motivo_cancelamento: 'Falha ao gerar pagamento no Mercado Pago',
      })
      .eq('id', pedido.id)
    await registrarHistorico(db, pedido, 'Cancelado', 'Falha ao gerar pagamento no Mercado Pago')
    throw e
  }
}

// ---------------------------------------------------------------------------
// Processamento de pagamento (confirmar + webhook)
// ---------------------------------------------------------------------------
const FORMA_POR_TIPO: Record<string, string> = {
  bank_transfer: 'pix',
  credit_card: 'cartao_credito',
  debit_card: 'cartao_debito',
  account_money: 'saldo_mercado_pago',
}

const PAGAMENTO_DESFEITO = ['refunded', 'charged_back', 'cancelled']

async function aplicarPagamento(db: SupabaseClient, pedido: any, pagamento: any) {
  const status: string = pagamento.status
  const jaAprovado = pedido.mercado_pago_status === 'approved'
  const desfeito = PAGAMENTO_DESFEITO.includes(status)

  // Não regride um pedido aprovado por causa de uma tentativa recusada posterior
  if (jaAprovado && status !== 'approved' && !desfeito) return pedido
  // Nada mudou (webhook repetido)
  if (pedido.mercado_pago_status === status && pedido.mercado_pago_payment_id === String(pagamento.id)) return pedido

  const valorOk = Number(pagamento.transaction_amount) + 0.01 >= Number(pedido.total)
  const aprovado = status === 'approved' && valorOk
  if (status === 'approved' && !valorOk) {
    console.error(`Pagamento ${pagamento.id} com valor menor que o pedido ${pedido.id}`)
  }

  const atualizacao: Record<string, unknown> = {
    mercado_pago_status: aprovado || status !== 'approved' ? status : 'valor_divergente',
    mercado_pago_payment_id: String(pagamento.id),
  }
  if (FORMA_POR_TIPO[pagamento.payment_type_id]) atualizacao.forma_pagamento = FORMA_POR_TIPO[pagamento.payment_type_id]

  let historico: string | null = null
  if (aprovado && !jaAprovado) {
    atualizacao.mercado_pago_date_approved = pagamento.date_approved ?? new Date().toISOString()
    if (pedido.status === 'Aguardando pagamento') {
      atualizacao.status = 'Pedido criado'
      historico = 'Pagamento aprovado pelo Mercado Pago. Pedido confirmado.'
    } else if (pedido.cancelado) {
      // Pago depois de cancelado (ex.: limpeza de expirados): a loja precisa devolver
      atualizacao.requer_extorno = true
      atualizacao.valor_extorno = Number(pagamento.transaction_amount)
      atualizacao.forma_pagamento_extorno = atualizacao.forma_pagamento ?? pedido.forma_pagamento
      historico = 'Pagamento aprovado depois do cancelamento do pedido: devolver o valor ao cliente.'
    }
  } else if (desfeito && !pedido.cancelado) {
    atualizacao.status = 'Cancelado'
    atualizacao.cancelado = true
    atualizacao.cancelado_em = new Date().toISOString()
    atualizacao.motivo_cancelamento =
      status === 'cancelled' ? 'Pagamento online não concluído' : 'Pagamento online estornado'
    historico = `Pedido cancelado: pagamento ${status === 'cancelled' ? 'não concluído' : 'estornado'} no Mercado Pago`
  }

  const { data: atualizado, error } = await db
    .from('pedidos')
    .update(atualizacao)
    .eq('id', pedido.id)
    .select('*')
    .single()
  if (error) throw error

  if (historico) await registrarHistorico(db, atualizado, (atualizacao.status as string) ?? atualizado.status, historico)
  return atualizado
}

async function buscarPedido(db: SupabaseClient, pedidoId: string) {
  const { data, error } = await db
    .from('pedidos')
    .select('*')
    .eq('id', pedidoId)
    .eq('origem', 'catalogo')
    .maybeSingle()
  if (error) throw error
  if (!data) throw new ErroCliente('Pedido não encontrado.', 404)
  return data
}

async function confirmarPedido(body: any) {
  const pedidoId = String(body?.pedido_id ?? '')
  if (!UUID_RE.test(pedidoId)) throw new ErroCliente('Pedido inválido.')
  const db = admin()
  let pedido = await buscarPedido(db, pedidoId)

  // Pedido criado sem cobrança online não tem pagamento para consultar
  const pagamentoOnline = pedido.mercado_pago_status !== null
  let checkoutUrl: string | null = null
  if (pagamentoOnline) {
    const cred = await lerCredenciaisMercadoPago(db, pedido.estabelecimento_id)
    if (cred.accessToken) {
      const busca = await mp<{ results: any[] }>(
        cred.accessToken,
        `/v1/payments/search?external_reference=${pedido.id}&sort=date_created&criteria=desc`,
      )
      const resultados = busca.results ?? []
      const escolhido = resultados.find((p) => p.status === 'approved') ?? resultados[0]
      if (escolhido) pedido = await aplicarPagamento(db, pedido, escolhido)

      if (pedido.mercado_pago_status !== 'approved' && !pedido.cancelado && pedido.mercado_pago_preference_id) {
        try {
          const pref = await mp<{ init_point: string; sandbox_init_point?: string }>(
            cred.accessToken,
            `/checkout/preferences/${pedido.mercado_pago_preference_id}`,
          )
          checkoutUrl = cred.ambiente === 'teste' && pref.sandbox_init_point ? pref.sandbox_init_point : pref.init_point
        } catch {
          checkoutUrl = null
        }
      }
    }
  }

  // Resposta pública: nada de telefone/e-mail
  return json({
    pedido_id: pedido.id,
    codigo_pedido: pedido.codigo_pedido,
    cliente_nome: [pedido.cliente_nome, pedido.cliente_sobrenome].filter(Boolean).join(' '),
    observacoes: pedido.observacoes ?? null,
    tipo_venda: pedido.tipo_venda,
    forma_pagamento: pedido.forma_pagamento,
    pagamento_online: pagamentoOnline,
    status_pagamento: pedido.mercado_pago_status,
    status_pedido: pedido.status,
    cancelado: !!pedido.cancelado,
    total: Number(pedido.total),
    criado_em: pedido.criado_em,
    itens: (pedido.itens ?? []).map((i: any) => ({
      nome: i.produto?.nome,
      quantidade: i.quantidade,
      preco_unitario: i.preco_unitario,
      subtotal: i.subtotal,
    })),
    checkout_url: checkoutUrl,
  })
}

async function webhook(url: URL, req: Request) {
  const estabelecimentoId = url.searchParams.get('e') ?? ''
  const body = await req.json().catch(() => ({}))
  const tipo = body?.type ?? body?.topic ?? url.searchParams.get('type') ?? url.searchParams.get('topic')
  const pagamentoId = String(body?.data?.id ?? url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? '')

  if (tipo !== 'payment' || !/^\d+$/.test(pagamentoId) || !UUID_RE.test(estabelecimentoId)) {
    return json({ ignorado: true })
  }

  const db = admin()
  const { accessToken } = await lerCredenciaisMercadoPago(db, estabelecimentoId)
  if (!accessToken) return json({ ignorado: true })

  // Busca o pagamento na API com o token da própria loja: a notificação em si não é confiável
  const pagamento = await mp<any>(accessToken, `/v1/payments/${pagamentoId}`)
  const pedidoId = String(pagamento.external_reference ?? '')
  if (!UUID_RE.test(pedidoId)) return json({ ignorado: true })

  const { data: pedido } = await db
    .from('pedidos')
    .select('*')
    .eq('id', pedidoId)
    .eq('estabelecimento_id', estabelecimentoId)
    .eq('origem', 'catalogo')
    .maybeSingle()
  if (!pedido) return json({ ignorado: true })

  await aplicarPagamento(db, pedido, pagamento)
  return json({ ok: true })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

  const url = new URL(req.url)
  try {
    if (url.searchParams.get('webhook') === '1') return await webhook(url, req)

    const body = await req.json().catch(() => null)
    if (body?.action === 'criar') return await criarPedido(req, body)
    if (body?.action === 'confirmar') return await confirmarPedido(body)
    return json({ error: 'Ação inválida' }, 400)
  } catch (e) {
    if (e instanceof ErroCliente) return json({ error: e.message }, e.status)
    console.error('Erro inesperado', e)
    return json({ error: 'Não foi possível processar o pedido. Tente novamente.' }, 500)
  }
})
