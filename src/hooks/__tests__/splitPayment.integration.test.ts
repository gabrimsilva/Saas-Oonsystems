/**
 * Pagamento dividido no PDV: o hook de finalizar venda grava as duas partes
 * na venda (payment_method = 'dividido' => SPLIT no serviço).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFinalizarVendaPDV } from '../useFinalizarVendaPDV'
import { vendaService, stockService } from '@/services'
import type { ItemCarrinhoPDV } from '@/components/pdv/types'
import type { PagamentoDivididoResolvido } from '@/utils/pagamentoDividido'

vi.mock('@/services', () => ({
  vendaService: { salvar: vi.fn(), criarParcelas: vi.fn() },
  stockService: { validarEstoqueVenda: vi.fn(), darBaixaEmVenda: vi.fn() },
  configuracaoService: { buscarPorChave: vi.fn().mockResolvedValue(null) },
}))
vi.mock('@/services/receiptService', () => ({ receiptService: { generateSaleReceipt: vi.fn() } }))
vi.mock('@/services/printJobService', () => ({ printJobService: { create: vi.fn(), print: vi.fn() } }))

const carrinho = [
  {
    id: 'item-1',
    produto: { id: 'prod-1', nome: 'Camiseta', preco: 45, categoria: 'roupas', urlImagem: '/c.jpg' },
    quantidade: 2,
    precoUnitario: 45,
    precoTotal: 90,
  },
  {
    id: 'item-2',
    produto: { id: 'prod-2', nome: 'Meia', preco: 10, categoria: 'roupas', urlImagem: '/m.jpg' },
    quantidade: 1,
    precoUnitario: 10,
    precoTotal: 10,
  },
] as ItemCarrinhoPDV[]

const divisao: PagamentoDivididoResolvido = {
  formaPagamentoDividido: true,
  pagamento1Tipo: 'pix',
  pagamento1Valor: 60,
  pagamento2Tipo: 'dinheiro',
  pagamento2Valor: 40,
  trocoPara: 50,
}

async function finalizar(params: Parameters<ReturnType<typeof useFinalizarVendaPDV>['finalizarVenda']>[0]) {
  const { result } = renderHook(() => useFinalizarVendaPDV())
  let resposta: Awaited<ReturnType<typeof result.current.finalizarVenda>> | undefined
  await act(async () => {
    resposta = await result.current.finalizarVenda(params)
  })
  return resposta!
}

const vendaSalva = () => vi.mocked(vendaService.salvar).mock.calls[0][0] as Record<string, unknown>

describe('PDV - pagamento dividido', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(vendaService.salvar).mockResolvedValue({ id: 'venda-1', sale_number: 'VENDA-001' } as never)
    vi.mocked(stockService.validarEstoqueVenda).mockResolvedValue(undefined as never)
    vi.mocked(stockService.darBaixaEmVenda).mockResolvedValue(undefined as never)
  })

  it('grava as duas partes e marca a venda como dividida', async () => {
    const resposta = await finalizar({
      carrinho,
      subtotal: 100,
      dadosPagamento: { formaPagamento: 'dividido', precisaTroco: true, valorTroco: 50 },
      pagamentoDividido: divisao,
    })

    expect(resposta.sucesso).toBe(true)
    expect(vendaSalva()).toMatchObject({
      total_amount: 100,
      payment_method: 'SPLIT',
      forma_pagamento_dividido: true,
      pagamento_1_tipo: 'pix',
      pagamento_1_valor: 60,
      pagamento_2_tipo: 'dinheiro',
      pagamento_2_valor: 40,
      needs_change: true,
      change_amount: 50,
    })
    expect(stockService.darBaixaEmVenda).toHaveBeenCalledTimes(2)
  })

  it('venda com uma forma só continua sem campos de divisão', async () => {
    await finalizar({
      carrinho,
      subtotal: 100,
      dadosPagamento: { formaPagamento: 'pix', precisaTroco: false },
    })

    expect(vendaSalva().payment_method).toBe('pix')
    expect(vendaSalva()).not.toHaveProperty('forma_pagamento_dividido')
    expect(vendaSalva()).not.toHaveProperty('pagamento_1_tipo')
  })

  it('consumo interno ignora a divisão', async () => {
    await finalizar({
      carrinho,
      subtotal: 100,
      dadosPagamento: { formaPagamento: 'dividido', precisaTroco: false },
      pagamentoDividido: divisao,
      consumoInterno: true,
    })

    expect(vendaSalva()).toMatchObject({ payment_method: 'INTERNAL_CONSUMPTION', total_amount: 0 })
    expect(vendaSalva()).not.toHaveProperty('forma_pagamento_dividido')
  })

  it('venda dividida não gera parcelas de "A Prazo"', async () => {
    await finalizar({
      carrinho,
      subtotal: 100,
      dadosPagamento: { formaPagamento: 'dividido', precisaTroco: false, prazoDias: 7, numeroParcelas: 3 },
      pagamentoDividido: divisao,
    })

    expect(vendaService.criarParcelas).not.toHaveBeenCalled()
  })

  it('falha ao salvar devolve o erro sem dar baixa no estoque', async () => {
    vi.mocked(vendaService.salvar).mockRejectedValueOnce(new Error('violates check constraint'))

    const resposta = await finalizar({
      carrinho,
      subtotal: 100,
      dadosPagamento: { formaPagamento: 'dividido', precisaTroco: false },
      pagamentoDividido: divisao,
    })

    expect(resposta.sucesso).toBe(false)
    expect(stockService.darBaixaEmVenda).not.toHaveBeenCalled()
  })
})
