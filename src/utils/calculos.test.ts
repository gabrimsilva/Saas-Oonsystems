/**
 * Testes para módulo de cálculos
 */

import { describe, it, expect } from 'vitest'
import {
  calcularSubtotal,
  calcularTotal
} from './calculos'

describe('Cálculos do Sistema', () => {
  describe('calcularSubtotal', () => {
    it('deve calcular subtotal de um item simples', () => {
      const carrinho = [
        {
          produto: { preco: 25.00 },
          quantidade: 2,
          precoFinal: 25.00
        }
      ]

      const result = calcularSubtotal(carrinho)
      expect(result).toBe(50.00)
    })

    it('deve calcular subtotal de múltiplos itens', () => {
      const carrinho = [
        {
          produto: { preco: 25.00 },
          quantidade: 2,
          precoFinal: 25.00
        },
        {
          produto: { preco: 30.00 },
          quantidade: 1,
          precoFinal: 30.00
        }
      ]

      const result = calcularSubtotal(carrinho)
      expect(result).toBe(80.00)
    })

    it('deve retornar 0 para carrinho vazio', () => {
      expect(calcularSubtotal([])).toBe(0)
    })

    it('deve calcular subtotal com adicionais', () => {
      const carrinho = [
        {
          produto: { id: '1', preco: 25.00 },
          quantidade: 2,
          adicionaisSelecionados: [
            { valor: 2.50, quantidade: 1 }
          ]
        }
      ]

      const result = calcularSubtotal(carrinho)
      // 25 + 2.50 = 27.50, * 2 = 55.00
      expect(result).toBe(55.00)
    })
  })

  describe('calcularTotal', () => {
    const carrinho = [
      {
        produto: { preco: 25.00 },
        quantidade: 2,
        precoFinal: 25.00
      }
    ]

    it('deve calcular total sem desconto', () => {
      expect(calcularTotal(carrinho)).toBe(50.00)
    })

    it('deve subtrair o desconto do subtotal', () => {
      expect(calcularTotal(carrinho, 7.5)).toBe(42.50)
    })
  })

})
