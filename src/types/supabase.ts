/**
 * Tipos TypeScript para todas as entidades do Supabase
 *
 * Este arquivo centraliza todos os tipos de dados do banco de dados,
 * facilitando a manutenção e garantindo consistência em todo o projeto.
 */

// ========================================
// AUTENTICAÇÃO E USUÁRIOS
// ========================================

/**
 * Representa um usuário do sistema administrativo
 */
export interface UsuarioSupabase {
  id: string
  email: string
  nome?: string
  role?: string
  ativo: boolean
  criado_em?: string
  atualizado_em?: string
}

/**
 * Perfil de administrador com acesso total ao sistema
 */
export interface ProfileSupabase {
  id: string
  user_id: string
  nome: string
  email: string
  telefone?: string
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

// ========================================
// CONFIGURAÇÕES
// ========================================

/**
 * Configuração do sistema (chave-valor)
 */
export interface ConfiguracaoSupabase {
  id?: string
  chave: string
  valor: string
  descricao?: string
  tipo: 'texto' | 'numero' | 'booleano' | 'json'
  categoria: string
  criado_em?: string
  atualizado_em?: string
}

// ========================================
// CATEGORIAS E PRODUTOS
// ========================================

/**
 * Categoria de produtos
 */
export interface CategoriaSupabase {
  id: string
  nome: string
  descricao: string
  ativa: boolean
  ordem: number
  tem_sabores?: boolean
  tem_borda?: boolean
  tem_tamanhos?: boolean
  criado_em?: string
  atualizado_em?: string
}

/**
 * Produto do cardápio
 */
export interface ProdutoSupabase {
  id: string
  nome: string
  descricao: string
  custo?: number
  preco: number
  preco_promocional?: number
  /** Preço nos pedidos do catálogo (null = preço do PDV/promocional) */
  preco_online?: number | null
  /** Preço no modo atacado do catálogo (null = preço de varejo do catálogo) */
  preco_atacado?: number | null
  categoria_id?: string
  categoria_nome?: string
  imagem_path?: string
  sabores_disponiveis: boolean
  quantidade_sabores: number
  ativo: boolean
  criado_em?: string
  atualizado_em?: string
}

/**
 * Combo de produtos
 */
export interface ComboSupabase {
  id: string
  nome: string
  descricao: string
  url_imagem?: string
  preco_combo: number
  preco_original: number
  desconto: number
  ativo: boolean
  criado_em?: string
  atualizado_em?: string
}

/**
 * Tamanhos de produto
 */
export interface TamanhoSupabase {
  id: string
  produto_id: string
  nome: string
  valor: number
  tamanho: string
  ordem: number
  ativo: boolean
  criado_em?: string
  atualizado_em?: string
}

// ========================================
// SABORES E ADICIONAIS
// ========================================

/**
 * Sabor de produto
 */
export interface SaborSupabase {
  id: string
  nome: string
  descricao?: string
  is_premium: boolean
  valor_premium?: number
  tipo: string
  categoria_id?: string
  categoria_sabor?: 'tradicional' | 'especiais' | 'nobres' | 'doces' | 'doces_especiais' | 'refrigerante'
  tipo_sabor?: 'normal' | 'borda'
  ativo: boolean
  criado_em?: string
  atualizado_em?: string
}

/**
 * Adicional de produto
 */
export interface AdicionalSupabase {
  id: string
  categoria_id: string
  nome: string
  valor: number
  ativo: boolean
  criado_em?: string
  atualizado_em?: string
}

// ========================================
// RELACIONAMENTOS
// ========================================

/**
 * Relacionamento produto-sabor
 */
export interface ProdutoSaborSupabase {
  id: string
  produto_id: string
  sabor_id: string
  criado_em?: string
}

/**
 * Relacionamento combo-produto
 */
export interface ComboProdutoSupabase {
  id: string
  combo_id: string
  produto_id: string
  quantidade: number
  criado_em?: string
}

// ========================================
// PEDIDOS
// ========================================

/**
 * Entrada de desconto manual
 */
export interface DescontoInput {
  /** Valor do desconto (R$ ou %) */
  valor: number
  /** Tipo do desconto */
  tipo: 'valor' | 'percentual'
}

/**
 * Dados de pagamento dividido
 * Permite dividir o pagamento entre duas formas diferentes
 */
export interface SplitPaymentData {
  /** Indica que o pagamento é dividido */
  formaPagamentoDividido: true
  /** Tipo da primeira forma de pagamento */
  pagamento1Tipo: string
  /** Valor da primeira forma de pagamento */
  pagamento1Valor: number
  /** Tipo da segunda forma de pagamento */
  pagamento2Tipo: string
  /** Valor da segunda forma de pagamento */
  pagamento2Valor: number
}

/**
 * Resumo de valores do pedido com desconto
 */
export interface ResumoValores {
  /** Subtotal original (soma dos itens) */
  subtotal: number
  /** Valor do desconto informado (R$ ou %) */
  desconto: number
  /** Tipo do desconto */
  tipo_desconto: 'valor' | 'percentual'
  /** Valor em R$ do desconto calculado */
  desconto_calculado: number
  /** Subtotal após aplicação do desconto */
  subtotal_com_desconto: number
  /** Taxa de entrega */
  taxa_entrega: number
  /** Taxa extra por km */
  taxa_extra_km: number
  /** Total final do pedido */
  total: number
}

/**
 * Pedido completo (delivery)
 */
export interface PedidoSupabase {
  id: string
  pedido_id: string
  codigo_pedido?: string

  // Referência ao cliente
  cliente_id?: string

  // Dados do cliente
  cliente_nome: string
  cliente_sobrenome: string
  cliente_cpf?: string
  cliente_telefone: string
  cliente_email?: string
  cliente_cep?: string
  cliente_endereco?: string
  cliente_numero?: string
  cliente_complemento?: string
  cliente_bairro?: string
  cliente_cidade?: string
  cliente_estado?: string

  // Dados do pedido
  entrega_domicilio: boolean
  forma_pagamento: string
  precisa_troco?: boolean
  valor_troco?: number

  // Valores
  subtotal: number
  taxa_entrega: number
  total: number

  // Desconto manual (PDV e Comandas)
  desconto: number
  tipo_desconto: 'valor' | 'percentual'

  // Itens do pedido
  itens: any[] // JSON dos itens

  // Status e datas
  status: string
  previsao_entrega?: string
  observacoes?: string

  criado_em: string
  atualizado_em: string

  // Campos de cancelamento
  cancelado?: boolean
  motivo_cancelamento?: string
  requer_extorno?: boolean
  valor_extorno?: number
  forma_pagamento_extorno?: string
  cancelado_em?: string
  cancelado_por?: string

  // Campos do Mercado Pago
  mercado_pago_payment_id?: string
  mercado_pago_status?: string
  /** varejo | atacado (pedidos do catálogo) */
  tipo_venda?: string
  /** catalogo = pedido feito pelo catálogo público */
  origem?: string | null
  mercado_pago_date_approved?: string

  // Campos de pagamento dividido
  forma_pagamento_dividido?: boolean
  pagamento_1_tipo?: string
  pagamento_1_valor?: number
  pagamento_2_tipo?: string
  pagamento_2_valor?: number
}

/**
 * Histórico de status de pedido
 */
export interface HistoricoPedidoSupabase {
  id: string
  pedido_id: string
  status: string
  observacao?: string
  criado_em: string
  atualizado_em: string
  // Campos de desconto (incluídos no histórico)
  desconto?: number
  tipo_desconto?: 'valor' | 'percentual'
  // Campos de pagamento dividido
  forma_pagamento_dividido?: boolean
  pagamento_1_tipo?: string
  pagamento_1_valor?: number
  pagamento_2_tipo?: string
  pagamento_2_valor?: number
}

// ========================================
// COMANDAS
// ========================================

/**
 * Comanda (PDV)
 */
export interface ComandaSupabase {
  id: string
  numero_comanda: number
  status: 'aberta' | 'finalizada' | 'cancelada'
  itens: any[] // JSON com os itens da comanda
  subtotal: number
  total: number
  // Desconto manual
  desconto: number
  tipo_desconto: 'valor' | 'percentual'
  forma_pagamento?: string
  criado_por?: string
  editado_por?: string
  finalizado_por?: string
  criado_em?: string
  atualizado_em?: string
  finalizado_em?: string
  observacoes?: string
  // Campos de pagamento dividido
  forma_pagamento_dividido?: boolean
  pagamento_1_tipo?: string
  pagamento_1_valor?: number
  pagamento_2_tipo?: string
  pagamento_2_valor?: number
  // Dados dos usuários (quando faz join)
  criador?: {
    id: string
    email: string
  }
  editor?: {
    id: string
    email: string
  }
  finalizador?: {
    id: string
    email: string
  }
}

/**
 * Histórico de comandas finalizadas
 */
export interface HistoricoComandaSupabase {
  id: string
  numero_comanda: number
  itens: any[]
  subtotal: number
  total: number
  // Desconto manual
  desconto: number
  tipo_desconto: 'valor' | 'percentual'
  forma_pagamento?: string
  criado_por?: string
  finalizado_por?: string
  criado_em?: string
  finalizado_em?: string
  observacoes?: string
  // Campos de pagamento dividido
  forma_pagamento_dividido?: boolean
  pagamento_1_tipo?: string
  pagamento_1_valor?: number
  pagamento_2_tipo?: string
  pagamento_2_valor?: number
  // Dados dos usuários (quando faz join)
  criador?: {
    id: string
    email: string
  }
  finalizador?: {
    id: string
    email: string
  }
}

// ========================================
// FUNCIONÁRIOS
// ========================================

/**
 * Funcionário do estabelecimento
 */
export interface FuncionarioSupabase {
  id: string
  nome: string
  cargo?: string // Mantido para compatibilidade
  funcao: 'atendente' | 'garcom' | 'entregador'
  telefone: string
  email: string
  user_id?: string
  ativo: boolean
  bloqueado?: boolean
  criado_em?: string
  atualizado_em?: string
}

// ========================================
// ESTOQUE
// ========================================

/**
 * Item de estoque
 */
export interface EstoqueSupabase {
  id: string
  nome: string
  descricao: string
  validade: string
  quantidade: number
  quantidade_minima: number
  criado_em?: string
  atualizado_em?: string
}

// ========================================
// CLIENTES
// ========================================

/**
 * Cliente cadastrado
 */
export interface ClienteSupabase {
  id: string
  nome: string
  sobrenome: string
  cpf?: string
  telefone: string
  email?: string
  cep?: string
  endereco?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  total_pedidos?: number
  valor_total_gasto?: number
  ultimo_pedido_em?: string
  criado_em?: string
  atualizado_em?: string
}

// ========================================
// ENTREGAS
// ========================================

/**
 * Configuração de taxa de entrega por distância (km)
 */
export interface EntregaKmSupabase {
  id: string
  distancia_minima: number
  distancia_maxima: number
  valor_taxa: number
  ativo: boolean
  criado_em?: string
  atualizado_em?: string
}
