// Edge function: assinatura do cliente com a OonSystems (mensalidade online).
//
// POST { action: 'resumo' }                     → plano, vencimento, situação e últimos pagamentos
// POST { action: 'pagar', plano_id?, ciclo?,     → cria a cobrança e a preferência do Checkout Pro
//        retorno?: 'meu-plano' | 'login' }         na conta Mercado Pago da OonSystems
// POST { action: 'confirmar', cobranca_id }     → consulta o pagamento no Mercado Pago (retorno do checkout)
// POST ?webhook=1                               → notificação do Mercado Pago
//
// Só o administrador geral do cliente usa as ações, mesmo com o acesso
// suspenso (é assim que ele regulariza). Deploy com verify_jwt = false por
// causa do webhook; as ações validam o JWT aqui. Valor e situação do
// pagamento vêm sempre do banco e da API do Mercado Pago.
//
// Secrets: MP_PLATAFORMA_ACCESS_TOKEN (obrigatório) e MP_PLATAFORMA_WEBHOOK_SECRET (recomendado).
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { assinaturaValida } from '../_shared/assinaturaMercadoPago.ts'
import {
  acessoSuspenso,
  DIAS_TOLERANCIA_ATRASO,
  escolherPlano,
  formaDoPagamento,
  origemValida,
  podeEscolherPlano,
  podePagarOnline,
  UUID_RE,
  valorDoPlano,
  type PlanoAssinatura,
  type TenantAssinatura,
} from './regras.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MP_API = 'https://api.mercadopago.com'

class ErroCliente extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}

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

const tokenMp = () => Deno.env.get('MP_PLATAFORMA_ACCESS_TOKEN') ?? ''

async function mp<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${MP_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${tokenMp()}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error('Mercado Pago erro', res.status, path, JSON.stringify(body))
    throw new Error(`Mercado Pago respondeu ${res.status}`)
  }
  return body as T
}

// ---------------------------------------------------------------------------
// Quem chama: administrador geral do cliente (com ou sem acesso liberado)
// ---------------------------------------------------------------------------
interface Contexto {
  db: SupabaseClient
  userId: string
  email: string
  tenantId: string
  tenant: TenantAssinatura & { nome_fantasia: string | null; razao_social: string }
}

async function contexto(req: Request): Promise<Contexto> {
  const db = admin()
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  const { data: { user } } = await db.auth.getUser(token)
  if (!user) throw new ErroCliente('Não autenticado', 401)

  const { data: vinculo } = await db
    .from('usuarios_estabelecimento')
    .select('perfil, tenant_id')
    .eq('user_id', user.id)
    .eq('ativo', true)
    .maybeSingle()
  if (!vinculo || vinculo.perfil !== 'administrador_geral') {
    throw new ErroCliente('Apenas o administrador geral gerencia a assinatura', 403)
  }

  const { data: tenant } = await db
    .from('tenants')
    .select('status, plano_id, ciclo, vigencia_ate, trial_ate, nome_fantasia, razao_social')
    .eq('id', vinculo.tenant_id)
    .single()
  if (!tenant) throw new ErroCliente('Cliente não encontrado', 404)

  return { db, userId: user.id, email: user.email ?? '', tenantId: vinculo.tenant_id, tenant }
}

async function listarPlanos(db: SupabaseClient): Promise<PlanoAssinatura[]> {
  const { data } = await db
    .from('planos')
    .select('id, nome, descricao, preco_mensal, preco_anual, ativo, ordem')
    .order('ordem')
  return (data ?? []).map((p) => ({ ...p, preco_mensal: Number(p.preco_mensal), preco_anual: Number(p.preco_anual) }))
}

// ---------------------------------------------------------------------------
// resumo
// ---------------------------------------------------------------------------
async function resumo(req: Request) {
  const { db, tenantId, tenant } = await contexto(req)
  const planos = await listarPlanos(db)
  const plano = planos.find((p) => p.id === tenant.plano_id) ?? null

  const { data: pagamentos } = await db
    .from('plataforma_pagamentos')
    .select('id, valor, pago_em, forma, ciclo, vencimento_novo')
    .eq('tenant_id', tenantId)
    .is('estornado_em', null)
    .order('pago_em', { ascending: false })
    .limit(12)

  const escolhe = podeEscolherPlano(tenant)
  return json({
    status: tenant.status,
    acesso_suspenso: acessoSuspenso(tenant),
    trial_ate: tenant.trial_ate,
    vigencia_ate: tenant.vigencia_ate,
    ciclo: tenant.ciclo,
    plano,
    planos: escolhe ? planos.filter((p) => p.ativo && (p.preco_mensal > 0 || p.preco_anual > 0)) : [],
    pode_escolher_plano: escolhe,
    pode_pagar: podePagarOnline(tenant),
    pagamento_online: !!tokenMp(),
    dias_tolerancia: DIAS_TOLERANCIA_ATRASO,
    pagamentos: (pagamentos ?? []).map((p) => ({ ...p, valor: Number(p.valor) })),
  })
}

// ---------------------------------------------------------------------------
// pagar
// ---------------------------------------------------------------------------
async function pagar(req: Request, body: Record<string, unknown>) {
  if (!tokenMp()) throw new ErroCliente('Pagamento online indisponível no momento. Fale com a OonSystems.', 503)

  const { db, userId, email, tenantId, tenant } = await contexto(req)
  if (!podePagarOnline(tenant)) {
    throw new ErroCliente('Sua conta está bloqueada ou inativa. Fale com a OonSystems para reativar.', 403)
  }

  const escolha = escolherPlano(tenant, await listarPlanos(db), {
    planoId: typeof body.plano_id === 'string' ? body.plano_id : null,
    ciclo: typeof body.ciclo === 'string' ? body.ciclo : null,
  })
  if ('erro' in escolha) throw new ErroCliente(escolha.erro)
  const { plano, ciclo } = escolha
  const valor = valorDoPlano(plano, ciclo)

  const { data: cobranca, error } = await db
    .from('plataforma_cobrancas')
    .insert({ tenant_id: tenantId, plano_id: plano.id, ciclo, valor, criado_por: userId })
    .select('id')
    .single()
  if (error || !cobranca) {
    console.error('Erro ao criar cobrança', error)
    throw new Error('Falha ao criar a cobrança')
  }

  const base = origemValida(req.headers.get('origin')) ?? origemValida(Deno.env.get('SITE_URL')) ?? ''
  const retorno = body.retorno === 'login'
    ? `${base}/login?pagamento=${cobranca.id}`
    : `${base}/sistema/meu-plano?cobranca=${cobranca.id}`
  const nomeCliente = tenant.nome_fantasia || tenant.razao_social
  const agora = Date.now()

  try {
    const preferencia = await mp<{ id: string; init_point: string }>('/checkout/preferences', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': cobranca.id },
      body: JSON.stringify({
        items: [{
          id: plano.id,
          title: `OonSystems - Plano ${plano.nome} (${ciclo === 'anual' ? 'anual' : 'mensal'})`.slice(0, 250),
          description: `Assinatura de ${nomeCliente}`.slice(0, 250),
          quantity: 1,
          unit_price: valor,
          currency_id: 'BRL',
        }],
        payer: email ? { email } : undefined,
        external_reference: cobranca.id,
        back_urls: { success: retorno, pending: retorno, failure: retorno },
        ...(retorno.startsWith('https:') ? { auto_return: 'approved' } : {}),
        notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/assinatura?webhook=1`,
        payment_methods: { installments: ciclo === 'anual' ? 12 : 1, default_installments: 1 },
        expires: true,
        expiration_date_to: new Date(agora + 3 * 86_400_000).toISOString(),
        statement_descriptor: 'OONSYSTEMS',
        metadata: { cobranca_id: cobranca.id, tenant_id: tenantId },
      }),
    })

    await db.from('plataforma_cobrancas').update({ mp_preference_id: preferencia.id }).eq('id', cobranca.id)
    return json({ cobranca_id: cobranca.id, checkout_url: preferencia.init_point, valor, plano: plano.nome, ciclo })
  } catch (e) {
    await db.from('plataforma_cobrancas').update({ status: 'cancelada' }).eq('id', cobranca.id)
    throw e
  }
}

// ---------------------------------------------------------------------------
// Aplicar pagamento aprovado (webhook e confirmar)
// ---------------------------------------------------------------------------
async function aplicarPagamento(db: SupabaseClient, pagamento: any): Promise<'pago' | 'pendente' | 'ignorado'> {
  const cobrancaId = String(pagamento?.external_reference ?? '')
  if (!UUID_RE.test(cobrancaId)) return 'ignorado'
  if (pagamento.status !== 'approved') return 'pendente'
  if (pagamento.currency_id && pagamento.currency_id !== 'BRL') return 'ignorado'

  const { error } = await db.rpc('fn_confirmar_cobranca', {
    p_cobranca_id: cobrancaId,
    p_mp_payment_id: String(pagamento.id),
    p_valor: Number(pagamento.transaction_amount),
    p_forma: formaDoPagamento(pagamento.payment_type_id),
  })
  if (error) {
    console.error('Erro ao confirmar cobrança', cobrancaId, error)
    throw new Error('Falha ao confirmar o pagamento')
  }
  return 'pago'
}

async function confirmar(req: Request, body: Record<string, unknown>) {
  const { db, tenantId } = await contexto(req)
  const cobrancaId = String(body.cobranca_id ?? '')
  if (!UUID_RE.test(cobrancaId)) throw new ErroCliente('Cobrança inválida')

  const { data: cobranca } = await db
    .from('plataforma_cobrancas')
    .select('id, status')
    .eq('id', cobrancaId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (!cobranca) throw new ErroCliente('Cobrança não encontrada', 404)
  if (cobranca.status === 'paga') return json({ situacao: 'pago' })
  if (!tokenMp()) return json({ situacao: 'pendente' })

  const busca = await mp<{ results?: any[] }>(
    `/v1/payments/search?external_reference=${cobrancaId}&sort=date_created&criteria=desc`,
  )
  const resultados = busca.results ?? []
  const aprovado = resultados.find((p) => p.status === 'approved')
  if (aprovado) return json({ situacao: await aplicarPagamento(db, aprovado) })
  const recusado = resultados.length > 0 && resultados.every((p) => p.status === 'rejected' || p.status === 'cancelled')
  return json({ situacao: recusado ? 'recusado' : 'pendente' })
}

async function webhook(url: URL, req: Request) {
  const body = await req.json().catch(() => ({}))
  const tipo = body?.type ?? body?.topic ?? url.searchParams.get('type') ?? url.searchParams.get('topic')
  const pagamentoId = String(body?.data?.id ?? url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? '')
  if (tipo !== 'payment' || !/^\d+$/.test(pagamentoId) || !tokenMp()) return json({ ignorado: true })

  const segredo = Deno.env.get('MP_PLATAFORMA_WEBHOOK_SECRET')
  if (segredo) {
    const xSignature = req.headers.get('x-signature')
    const valida = xSignature !== null &&
      await assinaturaValida(segredo, xSignature, req.headers.get('x-request-id'), url.searchParams.get('data.id') ?? pagamentoId)
    if (!valida) return json({ error: 'Assinatura inválida' }, 401)
  }

  // A notificação em si não é confiável: o pagamento é lido da API
  const pagamento = await mp<any>(`/v1/payments/${pagamentoId}`)
  return json({ situacao: await aplicarPagamento(admin(), pagamento) })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

  const url = new URL(req.url)
  try {
    if (url.searchParams.get('webhook') === '1') return await webhook(url, req)

    const body = (await req.json().catch(() => null)) ?? {}
    if (body.action === 'resumo') return await resumo(req)
    if (body.action === 'pagar') return await pagar(req, body)
    if (body.action === 'confirmar') return await confirmar(req, body)
    return json({ error: 'Ação inválida' }, 400)
  } catch (e) {
    if (e instanceof ErroCliente) return json({ error: e.message }, e.status)
    console.error('Erro inesperado', e)
    return json({ error: 'Não foi possível concluir. Tente novamente.' }, 500)
  }
})
