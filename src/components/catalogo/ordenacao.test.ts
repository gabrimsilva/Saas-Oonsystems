import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))

import { ordenarProdutos } from './OrdenacaoCatalogo'
import { normalizarBusca } from './BuscaCatalogo'
import { proximaOrdem } from '@/components/CategoriaForm'
import type { ProdutoCatalogo } from '@/components/delivery/CatalogoProdutoCard'

const produto = (id: string, nome: string, preco: number) =>
  ({ id, nome, preco, preco_online: null, preco_promocional: null, preco_atacado: null } as unknown as ProdutoCatalogo)

const lista = [produto('1', 'Copo Térmico', 50), produto('2', 'abacaxi', 10), produto('3', 'Garrafa', 0), produto('4', 'Bola', 30)]
const nomes = (p: ProdutoCatalogo[]) => p.map((x) => x.nome)

describe('ordenação do catálogo', () => {
  it('A–Z e Z–A sem diferenciar maiúsculas e acentos', () => {
    expect(nomes(ordenarProdutos(lista, 'a-z', 'varejo', new Map()))).toEqual(['abacaxi', 'Bola', 'Copo Térmico', 'Garrafa'])
    expect(nomes(ordenarProdutos(lista, 'z-a', 'varejo', new Map()))).toEqual(['Garrafa', 'Copo Térmico', 'Bola', 'abacaxi'])
  })

  it('por preço deixa quem não tem preço no fim', () => {
    expect(nomes(ordenarProdutos(lista, 'menor-preco', 'varejo', new Map()))).toEqual(['abacaxi', 'Bola', 'Copo Térmico', 'Garrafa'])
    expect(nomes(ordenarProdutos(lista, 'maior-preco', 'varejo', new Map()))).toEqual(['Copo Térmico', 'Bola', 'abacaxi', 'Garrafa'])
  })

  it('mais vendidos primeiro; sem vendas, por nome', () => {
    const vendas = new Map([['4', 9], ['3', 2]])
    expect(nomes(ordenarProdutos(lista, 'mais-vendidos', 'varejo', vendas))).toEqual(['Bola', 'Garrafa', 'abacaxi', 'Copo Térmico'])
  })

  it('não altera a lista original', () => {
    const antes = nomes(lista)
    ordenarProdutos(lista, 'z-a', 'varejo', new Map())
    expect(nomes(lista)).toEqual(antes)
  })
})

describe('busca do catálogo', () => {
  it('ignora acento e caixa', () => {
    expect(normalizarBusca('  Pão de Açúcar ')).toBe('pao de acucar')
    expect(normalizarBusca('Copo Térmico').includes(normalizarBusca('termico'))).toBe(true)
  })
})

describe('ordem de exibição da categoria nova', () => {
  it('é a maior existente + 1 (ou 1 sem categorias)', () => {
    expect(proximaOrdem([])).toBe(1)
    expect(proximaOrdem([{ ordem: 1 }, { ordem: 4 }, { ordem: 2 }])).toBe(5)
  })
})
