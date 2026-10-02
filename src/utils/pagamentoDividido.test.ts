import { describe, it, expect } from 'vitest'
import {
  DIVISAO_INICIAL,
  calcularTroco,
  descreverPagamentoVenda,
  lerValor,
  metades,
  partesDaVenda,
  resolverDivisao,
  restante,
  validarDivisao,
  vendaUsaMetodo,
} from './pagamentoDividido'

const divisao = (mudancas: Partial<typeof DIVISAO_INICIAL>) => ({ ...DIVISAO_INICIAL, ...mudancas })

describe('pagamentoDividido', () => {
  it('lê valores digitados em formato brasileiro ou com ponto', () => {
    expect(lerValor('40,5')).toBe(40.5)
    expect(lerValor('1.234,56')).toBe(1234.56)
    expect(lerValor('12.30')).toBe(12.3)
    expect(lerValor('')).toBe(0)
    expect(lerValor('abc')).toBe(0)
  })

  it('calcula restante e metades sem erro de centavos', () => {
    expect(restante(100, 33.33)).toBe(66.67)
    expect(restante(10, 15)).toBe(0)
    expect(metades(0.03)).toEqual([0.02, 0.01])
  })

  it('valida formas iguais, valores vazios e soma diferente do total', () => {
    expect(validarDivisao(100, divisao({ forma2: 'pix', valor1: '50', valor2: '50' }))).toMatch(/diferentes/)
    expect(validarDivisao(100, divisao({ valor1: '100', valor2: '' }))).toMatch(/maior que zero/)
    expect(validarDivisao(100, divisao({ valor1: '60', valor2: '50' }))).toMatch(/passa do total em R\$\s10,00/)
    expect(validarDivisao(100, divisao({ valor1: '60', valor2: '40' }))).toBeNull()
  })

  it('não aceita recebido em dinheiro menor que a parte em dinheiro', () => {
    const d = divisao({ valor1: '60', valor2: '40', recebidoDinheiro: '30' })
    expect(validarDivisao(100, d)).toMatch(/menor que a parte em dinheiro/)
  })

  it('resolve a divisão com troco sobre a parte em dinheiro', () => {
    const d = divisao({ valor1: '60', valor2: '40', recebidoDinheiro: '50' })
    expect(calcularTroco(d)).toBe(10)
    expect(resolverDivisao(100, d)).toEqual({
      formaPagamentoDividido: true,
      pagamento1Tipo: 'pix',
      pagamento1Valor: 60,
      pagamento2Tipo: 'dinheiro',
      pagamento2Valor: 40,
      trocoPara: 50,
    })
    expect(resolverDivisao(100, divisao({ valor1: '10', valor2: '10' }))).toBeNull()
  })

  it('separa e descreve as partes de uma venda salva', () => {
    const dividida = {
      payment_method: 'SPLIT',
      total_amount: '100.00',
      forma_pagamento_dividido: true,
      pagamento_1_tipo: 'PIX',
      pagamento_1_valor: '60.00',
      pagamento_2_tipo: 'CASH',
      pagamento_2_valor: '40.00',
    }
    expect(partesDaVenda(dividida)).toEqual([
      { metodo: 'PIX', valor: 60 },
      { metodo: 'CASH', valor: 40 },
    ])
    expect(descreverPagamentoVenda(dividida)).toMatch(/^PIX R\$\s60,00 \+ Dinheiro R\$\s40,00$/)
    expect(vendaUsaMetodo(dividida, 'CASH')).toBe(true)
    expect(vendaUsaMetodo(dividida, 'DEBIT')).toBe(false)

    const simples = { payment_method: 'DEBIT', total_amount: 25 }
    expect(partesDaVenda(simples)).toEqual([{ metodo: 'DEBIT', valor: 25 }])
    expect(descreverPagamentoVenda(simples)).toBe('Débito')
  })
})
