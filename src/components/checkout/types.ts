/**
 * Tipos compartilhados para componentes de checkout
 * @module components/checkout/types
 */

import type { Tamanho, Adicional } from '@/types/carrinho'

/**
 * Representa um produto no checkout
 */
export interface Produto {
  /** ID único do produto */
  id: string
  /** Nome do produto */
  nome: string
  /** Descrição detalhada */
  descricao: string
  /** Preço normal */
  preco: number
  /** Preço promocional (opcional) */
  precoPromocional?: number
  /** Categoria do produto */
  categoria: 'pizza' | 'lanche' | 'bebida' | 'combo'
  /** URL da imagem do produto */
  urlImagem: string
}

/**
 * Representa um sabor de pizza
 */
export interface Sabor {
  /** ID único do sabor */
  id: string
  /** Nome do sabor */
  nome: string
  /** Descrição do sabor */
  descricao: string
  /** Categoria (doce ou salgada) */
  categoria: 'doce' | 'salgada'
  /** Lista de ingredientes */
  ingredientes: string[]
  /** Preço adicional do sabor */
  preco: number
}

/**
 * Representa uma borda de pizza
 */
export interface Borda {
  /** ID único da borda */
  id: string
  /** Nome da borda */
  nome: string
  /** Preço adicional da borda */
  preco: number
}

/**
 * Representa um item no carrinho de compras
 */
export interface ItemCarrinho {
  /** Produto base */
  produto: Produto
  /** Quantidade do item */
  quantidade: number
  /** Sabores selecionados (para pizzas) */
  saboresSelecionados?: Sabor[]
  /** Borda selecionada (para pizzas) */
  bordaSelecionada?: Borda
  /** Tamanho selecionado (para produtos com variações) */
  tamanhoSelecionado?: Tamanho
  /** Adicionais selecionados */
  adicionaisSelecionados?: Adicional[]
  /** Observações do item */
  observacoes?: string
  /** Produtos individuais do combo personalizado */
  produtosCombo?: any[]
}

/**
 * Dados do cliente no checkout
 */
export interface DadosCliente {
  /** Nome do cliente */
  nome: string
  /** Sobrenome do cliente */
  sobrenome: string
  /** CPF do cliente */
  cpf: string
  /** CEP do endereço */
  cep: string
  /** Logradouro (rua, avenida, etc) */
  endereco: string
  /** Número da residência */
  numero: string
  /** Complemento (apto, bloco, etc) */
  complemento: string
  /** Bairro */
  bairro: string
  /** Cidade */
  cidade: string
  /** Estado (UF) */
  estado: string
  /** Telefone de contato */
  telefone: string
  /** Email do cliente */
  email: string
  /** Forma de pagamento selecionada */
  formaPagamento: string
  /** Indica se precisa de troco */
  precisaTroco: boolean
  /** Valor para o qual precisa de troco */
  valorTroco: string
  /** Observações do pedido */
  observacoes?: string
}

/**
 * Configurações do estabelecimento usadas no checkout
 */
export interface Configuracao {
  /** Formas de pagamento aceitas */
  formasPagamento: {
    /** Aceita dinheiro */
    dinheiro: boolean
    /** Aceita cartão de débito */
    cartaoDebito: boolean
    /** Aceita cartão de crédito */
    cartaoCredito: boolean
    /** Aceita PIX */
    pix: boolean
  }
  /** WhatsApp para contato */
  whatsapp?: string
  /** Nome do estabelecimento */
  nomeEstabelecimento: string
  /** Endereço do estabelecimento */
  endereco: string
  /** URL da logo */
  logoUrl: string
  /** URL do banner */
  bannerUrl: string
}