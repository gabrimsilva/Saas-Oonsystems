// Regras puras da assinatura (testáveis sem rede nem banco).

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Dias de acesso após o vencimento (igual a fn_dias_tolerancia_atraso no banco). */
export const DIAS_TOLERANCIA_ATRASO = 5

export type Ciclo = 'mensal' | 'anual'

export interface TenantAssinatura {
  status: string
  plano_id: string | null
  ciclo: Ciclo
  vigencia_ate: string | null
  trial_ate: string | null
}

export interface PlanoAssinatura {
  id: string
  nome: string
  preco_mensal: number
  preco_anual: number
  ativo: boolean
}

/** Acesso suspenso pela regra de fn_tenant_liberado. */
export function acessoSuspenso(t: TenantAssinatura, agora = Date.now()): boolean {
  if (t.status === 'trial') return !!t.trial_ate && new Date(t.trial_ate).getTime() <= agora
  if (t.status === 'ativo') {
    if (!t.vigencia_ate) return false
    return new Date(t.vigencia_ate).getTime() + DIAS_TOLERANCIA_ATRASO * 86_400_000 <= agora
  }
  return true
}

/** Só teste e ativo pagam online; bloqueio manual e inativo passam pela OonSystems. */
export const podePagarOnline = (t: TenantAssinatura) => t.status === 'trial' || t.status === 'ativo'

/** Em teste ou sem plano o cliente escolhe o plano; depois disso a troca é com a OonSystems. */
export const podeEscolherPlano = (t: TenantAssinatura) => t.status === 'trial' || !t.plano_id

export const valorDoPlano = (p: PlanoAssinatura, ciclo: Ciclo) =>
  Number(ciclo === 'anual' ? p.preco_anual : p.preco_mensal)

/**
 * Plano e ciclo a cobrar. Quem pode escolher usa o pedido (ou, sem pedido, o
 * plano atual / o primeiro plano ativo); os demais pagam o plano atual.
 */
export function escolherPlano(
  t: TenantAssinatura,
  planos: PlanoAssinatura[],
  pedido: { planoId?: string | null; ciclo?: string | null },
): { plano: PlanoAssinatura; ciclo: Ciclo } | { erro: string } {
  const ativos = planos.filter((p) => p.ativo)
  let plano: PlanoAssinatura | undefined
  let ciclo: Ciclo = t.ciclo

  if (podeEscolherPlano(t)) {
    if (pedido.ciclo === 'mensal' || pedido.ciclo === 'anual') ciclo = pedido.ciclo
    plano = pedido.planoId
      ? ativos.find((p) => p.id === pedido.planoId)
      : (ativos.find((p) => p.id === t.plano_id) ?? ativos.find((p) => valorDoPlano(p, ciclo) > 0))
    if (!plano) return { erro: 'Plano não encontrado' }
  } else {
    plano = planos.find((p) => p.id === t.plano_id)
    if (!plano) return { erro: 'Plano atual não encontrado. Fale com a OonSystems.' }
  }

  if (!(valorDoPlano(plano, ciclo) > 0)) return { erro: 'Este plano não tem valor para cobrança online' }
  return { plano, ciclo }
}

/** Forma registrada em plataforma_pagamentos a partir do payment_type_id do Mercado Pago. */
export function formaDoPagamento(paymentTypeId: string | null | undefined): string {
  switch (paymentTypeId) {
    case 'bank_transfer':
      return 'pix'
    case 'ticket':
    case 'atm':
      return 'boleto'
    case 'credit_card':
    case 'debit_card':
    case 'prepaid_card':
      return 'cartao'
    default:
      return 'outro'
  }
}

/** Origem aceita para as URLs de retorno do checkout (só esquema + host). */
export function origemValida(origem: string | null | undefined): string | null {
  if (!origem) return null
  try {
    const url = new URL(origem)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url.origin
  } catch {
    return null
  }
}
