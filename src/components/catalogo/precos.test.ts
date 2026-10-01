import { describe, expect, it } from 'vitest'
import type { ProdutoCatalogo } from '@/components/delivery/CatalogoProdutoCard'
import { disponivelParaCompra, precoAnterior, precoUnitario } from './precos'
import { linkWhatsAppLoja, montarMensagemPedido } from './whatsappPedido'

const produto = (parcial: Partial<ProdutoCatalogo>): ProdutoCatalogo => ({
  id: 'p1',
  nome: 'Camiseta',
  descricao: '',
  preco: 50,
  categoria: 'Roupas',
  urlImagem: '',
  ...parcial,
})

describe('preços do catálogo', () => {
  it('usa o promocional quando houver e risca o preço cheio', () => {
    const p = produto({ precoPromocional: 39.9 })
    expect(precoUnitario(p)).toBe(39.9)
    expect(precoAnterior(p)).toBe(50)
  })

  it('preço online substitui o do PDV no varejo', () => {
    const p = produto({ precoPromocional: 45, precoOnline: 48 })
    expect(precoUnitario(p, 'varejo')).toBe(48)
    expect(precoAnterior(p, 'varejo')).toBeNull()
  })

  it('atacado usa o preço de atacado e risca o de varejo', () => {
    const p = produto({ precoOnline: 48, precoAtacado: 30 })
    expect(precoUnitario(p, 'atacado')).toBe(30)
    expect(precoAnterior(p, 'atacado')).toBe(48)
    // Sem preço de atacado, vale o varejo do catálogo
    expect(precoUnitario(produto({ precoOnline: 48 }), 'atacado')).toBe(48)
    expect(precoAnterior(produto({ precoOnline: 48 }), 'atacado')).toBeNull()
  })

  it('sem promoção usa o preço e não risca nada', () => {
    const p = produto({ precoPromocional: 0 })
    expect(precoUnitario(p)).toBe(50)
    expect(precoAnterior(p)).toBeNull()
  })
})

describe('disponível para compra', () => {
  it('produto sem controle de estoque não tem limite', () => {
    expect(disponivelParaCompra(produto({ controlaEstoque: false }))).toBeNull()
  })

  it('usa o saldo da variante escolhida', () => {
    const p = produto({
      controlaEstoque: true,
      quantidadeEstoque: 5,
      variantes: [{ id: 'v1', nome: 'P', quantidade: 2 }],
    })
    expect(disponivelParaCompra(p, 'v1')).toBe(2)
    expect(disponivelParaCompra(p, 'outra')).toBe(0)
    expect(disponivelParaCompra(p)).toBe(5)
  })
})

describe('pedido pelo WhatsApp', () => {
  it('monta o resumo com itens, total e forma de pagamento', () => {
    const msg = montarMensagemPedido({
      codigo_pedido: '1001',
      cliente_nome: 'Maria Silva',
      forma_pagamento: 'cartao_debito',
      pagamento_online: false,
      total: 100,
      itens: [{ nome: 'Camiseta - P', quantidade: 2, subtotal: 100 }],
    })
    expect(msg).toContain('*pedido #1001*')
    expect(msg).toContain('2x Camiseta - P')
    expect(msg).toContain('Cartão de débito (na retirada/entrega)')
  })

  it('só gera link com número válido', () => {
    expect(linkWhatsAppLoja('(41) 99999-8888', 'oi')).toBe('https://wa.me/5541999998888?text=oi')
    expect(linkWhatsAppLoja('+55 41 99999-8888', 'oi')).toBe('https://wa.me/5541999998888?text=oi')
    expect(linkWhatsAppLoja('123', 'oi')).toBeNull()
  })
})
