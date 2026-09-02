/**
 * Tipos compartilhados para componentes do PDV (Ponto de Venda)
 * @module components/pdv/types
 */

import { type ProdutoSupabase } from "@/services"
import type { Sabor, Borda, Tamanho, Adicional } from '@/types/carrinho'
import type { DescontoInput } from '@/types/supabase'

/**
 * Representa um produto no PDV
 * Estende ProdutoSupabase com campos adicionais para o PDV
 */
export interface ProdutoPDV extends ProdutoSupabase {
  /** Categoria do produto */
  categoria: string
  /** URL da imagem do produto */
  urlImagem: string
  /** Preço promocional (opcional) */
  precoPromocional?: number
  /** Indica se o produto tem sabores disponíveis */
  saboresDisponiveis: boolean
  /** Quantidade de sabores permitidos */
  quantidadeSabores: number
}

/**
 * Representa um item no carrinho do PDV
 */
export interface ItemCarrinhoPDV {
  /** Produto base */
  produto: ProdutoPDV
  /** Quantidade do item */
  quantidade: number
  /** Observações adicionais */
  observacoes?: string
  /** Preço unitário calculado (com personalizações) */
  precoUnitario: number
  /** Preço total do item (precoUnitario × quantidade) */
  precoTotal: number
  /** Sabores selecionados (para pizzas) */
  saboresSelecionados?: Sabor[]
  /** Borda selecionada (para pizzas) */
  bordaSelecionada?: Borda
  /** Tamanho selecionado (para produtos com variações) */
  tamanhoSelecionado?: Tamanho
  /** Adicionais selecionados */
  adicionaisSelecionados?: Adicional[]
  /** Produtos individuais do combo personalizado */
  produtosCombo?: any[]
  /** ID da variante selecionada (para produtos com variantes de estoque) */
  variantId?: string
  /** Label da variante selecionada (para exibição) */
  variantLabel?: string
  /** Desconto aplicado ao item */
  desconto?: number
  /** Tipo de desconto ('percentual' ou 'valor') */
  tipoDesconto?: 'percentual' | 'valor'
  /** Preço original antes do desconto */
  precoOriginal?: number
}

/**
 * Dados do cliente no PDV
 */
export interface DadosClientePDV {
  /** Nome do cliente */
  nome: string
  /** Sobrenome do cliente */
  sobrenome: string
  /** Telefone de contato */
  telefone: string
  /** Email do cliente (opcional) */
  email?: string
  /** Logradouro (rua, avenida, etc) */
  endereco?: string
  /** Número da residência */
  numero?: string
  /** Complemento (apto, bloco, etc) */
  complemento?: string
  /** Bairro */
  bairro?: string
  /** Cidade */
  cidade?: string
  /** Estado (UF) */
  estado?: string
  /** CEP */
  cep?: string
}

/**
 * Dados para finalização de pedido no PDV
 */
export interface FinalizacaoPedido {
  /** Dados do cliente */
  cliente: DadosClientePDV
  /** Forma de pagamento selecionada */
  forma_pagamento: string
  /** Desconto manual aplicado */
  desconto: DescontoInput
  /** Observações adicionais do pedido */
  observacoes?: string
}
