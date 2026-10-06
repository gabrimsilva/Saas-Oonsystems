/**
 * Assinatura do cliente com a OonSystems: resumo do plano e pagamento online
 * da mensalidade (Edge Function `assinatura`, Checkout Pro do Mercado Pago).
 *
 * @module services/assinaturaService
 */

import { supabase } from '@/lib/supabase'
import { mensagemErroEdgeFunction } from './edgeFunction'

export type CicloAssinatura = 'mensal' | 'anual'

export interface PlanoAssinatura {
  id: string
  nome: string
  descricao: string | null
  preco_mensal: number
  preco_anual: number
}

export interface PagamentoAssinatura {
  id: string
  valor: number
  pago_em: string
  forma: string
  ciclo: CicloAssinatura
  vencimento_novo: string
}

export interface ResumoAssinatura {
  status: 'trial' | 'ativo' | 'suspenso' | 'cancelado'
  acesso_suspenso: boolean
  trial_ate: string | null
  vigencia_ate: string | null
  ciclo: CicloAssinatura
  plano: PlanoAssinatura | null
  planos: PlanoAssinatura[]
  pode_escolher_plano: boolean
  pode_pagar: boolean
  pagamento_online: boolean
  dias_tolerancia: number
  pagamentos: PagamentoAssinatura[]
}

export interface CheckoutAssinatura {
  cobranca_id: string
  checkout_url: string
  valor: number
  plano: string
  ciclo: CicloAssinatura
}

export type SituacaoCobranca = 'pago' | 'pendente' | 'recusado' | 'ignorado'

async function chamar<T>(body: Record<string, unknown>, padrao: string): Promise<T> {
  const { data, error } = await supabase.functions.invoke('assinatura', { body })
  if (error) throw new Error(await mensagemErroEdgeFunction(error, padrao))
  return data as T
}

export const assinaturaService = {
  resumo(): Promise<ResumoAssinatura> {
    return chamar({ action: 'resumo' }, 'Não foi possível carregar a assinatura')
  },

  /** Cria a cobrança e devolve o link do checkout do Mercado Pago. */
  pagar(opcoes: { planoId?: string; ciclo?: CicloAssinatura; retorno?: 'meu-plano' | 'login' } = {}): Promise<CheckoutAssinatura> {
    return chamar(
      { action: 'pagar', plano_id: opcoes.planoId, ciclo: opcoes.ciclo, retorno: opcoes.retorno ?? 'meu-plano' },
      'Não foi possível gerar o pagamento',
    )
  },

  /** Consulta no Mercado Pago a cobrança que acabou de voltar do checkout. */
  async confirmar(cobrancaId: string): Promise<SituacaoCobranca> {
    const r = await chamar<{ situacao: SituacaoCobranca }>(
      { action: 'confirmar', cobranca_id: cobrancaId },
      'Não foi possível confirmar o pagamento',
    )
    return r.situacao
  },
}
