import { describe, expect, it } from 'vitest'
import { linkWhatsAppOonSystems, mensagemPagamento } from './plataforma'

describe('contato da OonSystems pelo WhatsApp', () => {
  it('abre o WhatsApp da OonSystems (41) 99144-0115 com a mensagem codificada', () => {
    const link = linkWhatsAppOonSystems('Olá! Quero pagar & assinar')
    expect(link.startsWith('https://wa.me/5541991440115?text=')).toBe(true)
    expect(decodeURIComponent(link.split('text=')[1])).toBe('Olá! Quero pagar & assinar')
  })

  it('mensagem de pagamento com empresa e vencimento', () => {
    expect(mensagemPagamento({ empresa: 'KOBE E-Commerce', vencimento: '20/11/2026' }))
      .toBe('Olá! Sou da KOBE E-Commerce e quero pagar a mensalidade do OonSystems (vencimento 20/11/2026).')
  })

  it('mensagem de assinatura no período de teste', () => {
    expect(mensagemPagamento({ empresa: 'Loja X', assinar: true })).toBe('Olá! Sou da Loja X e quero assinar o OonSystems.')
    expect(mensagemPagamento({})).toBe('Olá! Quero pagar a mensalidade do OonSystems.')
  })
})
