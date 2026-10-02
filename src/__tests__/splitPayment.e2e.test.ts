/**
 * Ponta a ponta do pagamento dividido no PDV: o caixa escolhe "Dividir em
 * duas formas" no modal de finalizar, preenche as partes, confirma, e a venda
 * é salva com as duas partes (mesmo caminho do PDV: modal -> hook -> serviço).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createElement } from 'react'
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react'
import ModalFinalizarPedido from '@/components/pdv/ModalFinalizarPedido'
import { useFinalizarVendaPDV } from '@/hooks/useFinalizarVendaPDV'
import { vendaService, stockService } from '@/services'
import type { ItemCarrinhoPDV } from '@/components/pdv/types'

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
    produto: { id: 'prod-1', nome: 'Camiseta', preco: 50, categoria: 'roupas', urlImagem: '/c.jpg' },
    quantidade: 3,
    precoUnitario: 50,
    precoTotal: 150,
  },
] as ItemCarrinhoPDV[]

const campo = (id: string) => document.getElementById(id) as HTMLInputElement | HTMLSelectElement

function abrirModal(onConfirmar = vi.fn()) {
  render(
    createElement(ModalFinalizarPedido, {
      isOpen: true,
      onClose: vi.fn(),
      onConfirmar,
      subtotal: 150,
      total: 150,
      taxaEntrega: 0,
      entregaDomicilio: false,
      processando: false,
      simplified: true,
    }),
  )
  fireEvent.change(campo('formaPagamento'), { target: { value: 'dividido' } })
  return onConfirmar
}

const botaoConfirmar = () => screen.getByRole('button', { name: /Confirmar Pedido/i })

describe('E2E: pagamento dividido no PDV', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(vendaService.salvar).mockResolvedValue({ id: 'venda-1', sale_number: 'VENDA-001' } as never)
    vi.mocked(stockService.validarEstoqueVenda).mockResolvedValue(undefined as never)
    vi.mocked(stockService.darBaixaEmVenda).mockResolvedValue(undefined as never)
  })

  it('só libera a confirmação quando as partes fecham o total', () => {
    abrirModal()
    expect(botaoConfirmar()).toBeDisabled()

    fireEvent.change(campo('pdv-divisao-valor-1'), { target: { value: '100' } })
    expect(campo('pdv-divisao-valor-2').value).toBe('50,00')
    expect(botaoConfirmar()).toBeEnabled()

    fireEvent.change(campo('pdv-divisao-valor-2'), { target: { value: '' } })
    expect(botaoConfirmar()).toBeDisabled()
  })

  it('PIX + Dinheiro com troco: do modal até a venda salva', async () => {
    const onConfirmar = abrirModal()
    fireEvent.change(campo('pdv-divisao-valor-1'), { target: { value: '100' } })
    fireEvent.change(campo('pdv-divisao-recebido'), { target: { value: '70' } })
    expect(screen.getByRole('status')).toHaveTextContent('Troco: R$ 20,00')

    fireEvent.click(botaoConfirmar())
    expect(onConfirmar).toHaveBeenCalledTimes(1)
    const dadosPagamento = onConfirmar.mock.calls[0][0]
    expect(dadosPagamento).toMatchObject({
      formaPagamento: 'dividido',
      precisaTroco: true,
      valorTroco: 70,
      pagamentoDividido: { pagamento1Tipo: 'pix', pagamento1Valor: 100, pagamento2Tipo: 'dinheiro', pagamento2Valor: 50 },
    })

    // Mesmo repasse que a página do PDV faz
    const { result } = renderHook(() => useFinalizarVendaPDV())
    await act(async () => {
      await result.current.finalizarVenda({
        carrinho,
        subtotal: 150,
        dadosPagamento,
        pagamentoDividido: dadosPagamento.pagamentoDividido,
      })
    })

    expect(vi.mocked(vendaService.salvar).mock.calls[0][0]).toMatchObject({
      total_amount: 150,
      payment_method: 'SPLIT',
      forma_pagamento_dividido: true,
      pagamento_1_tipo: 'pix',
      pagamento_1_valor: 100,
      pagamento_2_tipo: 'dinheiro',
      pagamento_2_valor: 50,
      needs_change: true,
      change_amount: 70,
    })
  })

  it('Débito + Crédito sem dinheiro não pede valor recebido', () => {
    const onConfirmar = abrirModal()
    fireEvent.change(campo('pdv-divisao-forma-1'), { target: { value: 'cartaoDebito' } })
    fireEvent.change(campo('pdv-divisao-forma-2'), { target: { value: 'cartaoCredito' } })
    expect(campo('pdv-divisao-recebido')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Metade' }))
    fireEvent.click(botaoConfirmar())
    expect(onConfirmar.mock.calls[0][0]).toMatchObject({
      precisaTroco: false,
      pagamentoDividido: { pagamento1Tipo: 'cartaoDebito', pagamento1Valor: 75, pagamento2Tipo: 'cartaoCredito', pagamento2Valor: 75 },
    })
  })
})
