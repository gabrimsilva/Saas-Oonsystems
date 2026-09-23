/**
 * Exports centralizados para funções utilitárias
 */

// Funções de formatação
export {
  formatarTelefone,
  formatarCEP,
  formatarCPF,
  formatarMoeda,
  removerFormatacao,
  aplicarMascaraMoeda,
  numeroParaTextoMoeda
} from './formatacao'

// Funções de validação
export {
  validarCPF,
  validarEmail,
  validarTelefone,
  validarCEP,
  validarCampoObrigatorio
} from './validacao'

// Funções de cálculos
export {
  calcularPrecoItem,
  calcularSubtotal,
  calcularTotal,
  calcularDesconto
} from './calculos'

// Funções de filtros de pedidos
export {
  filtrarPedidosAtivos,
  filtrarPedidosPorBusca,
  getPedidosPorStatus as filtrarPedidosPorStatus,
  getPedidosPorStatus as agruparPedidosPorStatus
} from './pedidosFiltros'
