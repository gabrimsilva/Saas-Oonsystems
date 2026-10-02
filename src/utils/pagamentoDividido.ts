/**
 * Regras do pagamento dividido (PDV e comandas): duas formas de pagamento
 * diferentes cuja soma é o total da venda. Se uma das partes for em dinheiro,
 * o caixa pode informar quanto recebeu para calcular o troco.
 */

export const FORMAS_DIVISIVEIS = [
  { valor: 'pix', rotulo: 'PIX' },
  { valor: 'dinheiro', rotulo: 'Dinheiro' },
  { valor: 'cartaoDebito', rotulo: 'Cartão de débito' },
  { valor: 'cartaoCredito', rotulo: 'Cartão de crédito' },
] as const

export type FormaDivisivel = (typeof FORMAS_DIVISIVEIS)[number]['valor']

/** Estado do formulário (valores como texto digitado, ex.: "40,50") */
export interface DivisaoPagamento {
  forma1: FormaDivisivel
  valor1: string
  forma2: FormaDivisivel
  valor2: string
  /** Quanto o cliente entregou em dinheiro (só quando uma parte é dinheiro) */
  recebidoDinheiro: string
}

/** Resultado pronto para salvar */
export interface PagamentoDivididoResolvido {
  formaPagamentoDividido: true
  pagamento1Tipo: FormaDivisivel
  pagamento1Valor: number
  pagamento2Tipo: FormaDivisivel
  pagamento2Valor: number
  /** Valor entregue em dinheiro, quando há troco a devolver */
  trocoPara?: number
}

export const DIVISAO_INICIAL: DivisaoPagamento = {
  forma1: 'pix',
  valor1: '',
  forma2: 'dinheiro',
  valor2: '',
  recebidoDinheiro: '',
}

const centavos = (valor: number) => Math.round(valor * 100)
const deCentavos = (valor: number) => valor / 100

/** "1.234,56" | "1234.56" | "40,5" -> número (0 se vazio/inválido) */
export function lerValor(texto: string): number {
  if (!texto) return 0
  let limpo = texto.replace(/[^\d,.]/g, '')
  if (limpo.includes(',')) limpo = limpo.replace(/\./g, '').replace(',', '.')
  const numero = Number.parseFloat(limpo)
  return Number.isFinite(numero) ? deCentavos(centavos(numero)) : 0
}

/** Número -> texto do campo ("40,50") */
export function escreverValor(valor: number): string {
  return valor.toFixed(2).replace('.', ',')
}

export const formatarReais = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** O que falta para completar o total depois de uma parte (nunca negativo) */
export function restante(total: number, parte: number): number {
  return deCentavos(Math.max(0, centavos(total) - centavos(parte)))
}

/** Divide o total em duas metades (a primeira fica com o centavo ímpar) */
export function metades(total: number): [number, number] {
  const t = centavos(total)
  const segunda = Math.floor(t / 2)
  return [deCentavos(t - segunda), deCentavos(segunda)]
}

export const temParteEmDinheiro = (d: DivisaoPagamento) => d.forma1 === 'dinheiro' || d.forma2 === 'dinheiro'

/** Valor da parte paga em dinheiro (0 se nenhuma) */
export function parteEmDinheiro(d: DivisaoPagamento): number {
  if (d.forma1 === 'dinheiro') return lerValor(d.valor1)
  if (d.forma2 === 'dinheiro') return lerValor(d.valor2)
  return 0
}

/** Troco a devolver (0 se não informou o valor recebido) */
export function calcularTroco(d: DivisaoPagamento): number {
  const recebido = lerValor(d.recebidoDinheiro)
  if (!temParteEmDinheiro(d) || recebido <= 0) return 0
  return restante(recebido, parteEmDinheiro(d))
}

/** Primeiro problema encontrado, ou null quando a divisão está correta */
export function validarDivisao(total: number, d: DivisaoPagamento): string | null {
  const v1 = lerValor(d.valor1)
  const v2 = lerValor(d.valor2)
  if (d.forma1 === d.forma2) return 'Escolha duas formas de pagamento diferentes.'
  if (v1 <= 0 || v2 <= 0) return 'Informe um valor maior que zero nas duas partes.'
  const diferenca = centavos(total) - centavos(v1 + v2)
  if (diferenca > 0) return `Faltam ${formatarReais(deCentavos(diferenca))} para completar o total.`
  if (diferenca < 0) return `A soma passa do total em ${formatarReais(deCentavos(-diferenca))}.`
  const recebido = lerValor(d.recebidoDinheiro)
  if (temParteEmDinheiro(d) && recebido > 0 && centavos(recebido) < centavos(parteEmDinheiro(d))) {
    return 'O valor recebido em dinheiro é menor que a parte em dinheiro.'
  }
  return null
}

/** Converte o formulário no formato salvo; null se ainda estiver inválido */
export function resolverDivisao(total: number, d: DivisaoPagamento): PagamentoDivididoResolvido | null {
  if (validarDivisao(total, d)) return null
  const troco = calcularTroco(d)
  return {
    formaPagamentoDividido: true,
    pagamento1Tipo: d.forma1,
    pagamento1Valor: lerValor(d.valor1),
    pagamento2Tipo: d.forma2,
    pagamento2Valor: lerValor(d.valor2),
    trocoPara: troco > 0 ? lerValor(d.recebidoDinheiro) : undefined,
  }
}

/* ------------------------------------------------ Vendas salvas (tabela sales) */

const ROTULO_METODO_VENDA: Record<string, string> = {
  CASH: 'Dinheiro',
  DEBIT: 'Débito',
  CREDIT: 'Crédito',
  PIX: 'PIX',
  A_PRAZO: 'A Prazo',
  INTERNAL_CONSUMPTION: 'Consumo interno',
  SPLIT: 'Dividido',
}

export const rotuloMetodoVenda = (metodo: string) => ROTULO_METODO_VENDA[metodo] ?? metodo

interface VendaComPagamento {
  payment_method: string
  total_amount: number | string
  forma_pagamento_dividido?: boolean | null
  pagamento_1_tipo?: string | null
  pagamento_1_valor?: number | string | null
  pagamento_2_tipo?: string | null
  pagamento_2_valor?: number | string | null
}

/** Partes de uma venda: uma só, ou duas quando o pagamento foi dividido */
export function partesDaVenda(venda: VendaComPagamento): Array<{ metodo: string; valor: number }> {
  if (venda.forma_pagamento_dividido && venda.pagamento_1_tipo && venda.pagamento_2_tipo) {
    return [
      { metodo: venda.pagamento_1_tipo, valor: Number(venda.pagamento_1_valor) || 0 },
      { metodo: venda.pagamento_2_tipo, valor: Number(venda.pagamento_2_valor) || 0 },
    ]
  }
  return [{ metodo: venda.payment_method, valor: Number(venda.total_amount) || 0 }]
}

/** Texto da forma de pagamento ("PIX" ou "PIX R$ 60,00 + Dinheiro R$ 40,00") */
export function descreverPagamentoVenda(venda: VendaComPagamento): string {
  const partes = partesDaVenda(venda)
  if (partes.length === 1) return rotuloMetodoVenda(partes[0].metodo)
  return partes.map((p) => `${rotuloMetodoVenda(p.metodo)} ${formatarReais(p.valor)}`).join(' + ')
}

/** A venda usou a forma de pagamento (inteira ou como uma das partes)? */
export const vendaUsaMetodo = (venda: VendaComPagamento, metodo: string) =>
  partesDaVenda(venda).some((p) => p.metodo === metodo)
