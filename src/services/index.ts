/**
 * Exportações centralizadas de todos os services
 *
 * Este arquivo serve como ponto único de importação para todos os services,
 * facilitando a manutenção e organização do código.
 *
 * @module services
 */

// ========================================
// SERVICES MIGRADOS (arquitetura nova)
// ========================================

// Services de categorias
import { categoriaService } from './categoriaService'
export { categoriaService }
export type { CategoriaService } from './categoriaService'

// Services de pedidos
import { pedidoService } from './pedidoService'
export { pedidoService }
export type { PedidoService } from './pedidoService'

import { historicoPedidoService } from './historicoPedidoService'
export { historicoPedidoService }
export type { HistoricoPedidoService } from './historicoPedidoService'

// Services de clientes
import { clienteService } from './clienteService'
export { clienteService }
export type { ClienteService, NovoCliente } from './clienteService'

// Services de configurações
import { configuracaoService } from './configuracaoService'
export { configuracaoService }
export type { ConfiguracaoService } from './configuracaoService'

// Services de produtos
import { produtoService } from './produtoService'
export { produtoService }
export type { ProdutoService } from './produtoService'

// Services de sabores
import { saborService } from './saborService'
export { saborService }
export type { SaborService } from './saborService'

// Services de adicionais
import { adicionalService } from './adicionalService'
export { adicionalService }
export type { AdicionalService } from './adicionalService'

// Services de tamanhos
import { tamanhoService } from './tamanhoService'
export { tamanhoService }
export type { TamanhoService } from './tamanhoService'

// Services de combos
import { comboService } from './comboService'
export { comboService }
export type { ComboService } from './comboService'

// Services de autenticação
import { authService } from './authService'
export { authService }
export type { AuthService } from './authService'

// Services de funcionários
import { funcionarioService } from './funcionarioService'
export { funcionarioService }
export type { FuncionarioService } from './funcionarioService'

// Services de estoque
import { estoqueService } from './estoqueService'
export { estoqueService }
export type { EstoqueService } from './estoqueService'

// Services de controle de estoque (novo sistema)
import { stockService, calcularStatusEstoque } from './stockService'
export { stockService, calcularStatusEstoque }
export type { StockItem, StockVariant, StockMovement, StockStatus } from './stockService'

// Services de vendas
import { vendaService } from './vendaService'
export { vendaService }
export type { Sale, NovaVenda, SaleInstallment } from './vendaService'

// Services de consumo interno
import { consumoInternoService } from './consumoInternoService'
export { consumoInternoService }
export type { RegistrarConsumoResponso, ItemConsumo, ConsumosPorPeriodo } from './consumoInternoService'

// Services de pedidos delivery
import { pedidoDeliveryService } from './pedidoDeliveryService'
export { pedidoDeliveryService }

// Services de cupom fiscal
import { receiptService } from './receiptService'
export { receiptService }

// Services de comandas
import { comandaService } from './comandaService'
export { comandaService }
export type { IComandaService } from './comandaService'

import { historicoComandaService } from './historicoComandaService'
export { historicoComandaService }
export type { IHistoricoComandaService } from './historicoComandaService'

// Services de IA
import { openaiService } from './openaiService'
export { openaiService }
export type { IAConfig, Mensagem, DadosExtraidos } from './openaiService'

// Services de perfil de administradores
import { profileService } from './profileService'
export { profileService }
export type { Profile } from './profileService'

// ========================================
// MULTI-ESTABELECIMENTO
// ========================================

// Helpers de tenant (injeção centralizada de estabelecimento_id)
import {
  setEstabelecimentoAtivo,
  getEstabelecimentoAtivo,
  fromTenant,
  comTenant,
  comTenantLote,
  aplicarFiltroTenant,
  tenantId,
  EstabelecimentoNaoSelecionadoError,
} from './tenant'
export {
  setEstabelecimentoAtivo,
  getEstabelecimentoAtivo,
  fromTenant,
  comTenant,
  comTenantLote,
  aplicarFiltroTenant,
  tenantId,
  EstabelecimentoNaoSelecionadoError,
}

// Service de estabelecimentos
import { estabelecimentoService } from './estabelecimentoService'
export { estabelecimentoService }
export type { EstabelecimentoService, NovoEstabelecimento } from './estabelecimentoService'

// Service de usuários (multi-tenant)
import { usuarioService } from './usuarioService'
export { usuarioService }
export type { UsuarioService, NovoUsuario } from './usuarioService'

// Service de auditoria
import { auditoriaService } from './auditoriaService'
export { auditoriaService }
export type { AuditoriaService, RegistroAuditoria } from './auditoriaService'

// ========================================
// RE-EXPORTAR CLIENTE SUPABASE
// ========================================

// Re-exportar o cliente Supabase para acesso direto quando necessário
export { supabase } from '@/lib/supabase'

// ========================================
// RE-EXPORTAR TIPOS DO SUPABASE
// ========================================

// Re-exportar todos os tipos do Supabase para facilitar imports
export type {
  UsuarioSupabase,
  ProfileSupabase,
  ConfiguracaoSupabase,
  CategoriaSupabase,
  EstoqueSupabase,
  FuncionarioSupabase,
  SaborSupabase,
  AdicionalSupabase,
  ComandaSupabase,
  HistoricoComandaSupabase,
  ProdutoSupabase,
  ComboSupabase,
  TamanhoSupabase,
  ProdutoSaborSupabase,
  ComboProdutoSupabase,
  HistoricoPedidoSupabase,
  PedidoSupabase
} from '@/types/supabase'

// ========================================
// EXPORTS DEFAULT
// ========================================

/**
 * Objeto contendo todos os services para importação em lote
 *
 * @example
 * ```ts
 * import services from '@/services'
 * const pedidos = await services.pedido.buscarTodos()
 * ```
 */
export default {
  categoria: categoriaService,
  pedido: pedidoService,
  historicoPedido: historicoPedidoService,
  cliente: clienteService,
  configuracao: configuracaoService,
  produto: produtoService,
  sabor: saborService,
  adicional: adicionalService,
  tamanho: tamanhoService,
  combo: comboService,
  auth: authService,
  funcionario: funcionarioService,
  estoque: estoqueService,
  stock: stockService,
  comanda: comandaService,
  historicoComanda: historicoComandaService,
  openai: openaiService,
  profile: profileService,
  venda: vendaService,
  consumoInterno: consumoInternoService,
  pedidoDelivery: pedidoDeliveryService,
  receipt: receiptService,
  estabelecimento: estabelecimentoService,
  usuario: usuarioService,
  auditoria: auditoriaService
}
