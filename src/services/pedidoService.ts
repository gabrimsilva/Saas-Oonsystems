/**
 * Serviço para gerenciamento de pedidos
 *
 * Este serviço encapsula todas as operações relacionadas a pedidos de delivery,
 * incluindo criação, busca, atualização de status e realtime.
 *
 * @module services/pedidoService
 */

import { supabase } from "@/lib/supabase"
import { getEstabelecimentoAtivo, comTenant } from "./tenant"
import type { PedidoSupabase } from '@/types/supabase'

/**
 * Interface do serviço de pedidos
 */
export interface PedidoService {
  /**
   * Gera um código único de 4 dígitos para o pedido
   * @returns Promise com o código gerado
   */
  gerarCodigoUnico(): Promise<string>

  /**
   * Salva um novo pedido
   * @param pedidoData - Dados do pedido
   * @returns Promise com o pedido salvo
   */
  salvar(pedidoData: Omit<PedidoSupabase, 'id' | 'criado_em' | 'atualizado_em'>): Promise<PedidoSupabase>

  /**
   * Busca pedido por ID interno
   * @param pedidoId - ID do pedido
   * @returns Promise com o pedido ou null
   */
  buscarPorId(pedidoId: string): Promise<PedidoSupabase | null>

  /**
   * Busca pedido por código amigável
   * @param codigo - Código de 4 dígitos
   * @returns Promise com o pedido ou null
   */
  buscarPorCodigo(codigo: string): Promise<PedidoSupabase | null>

  /**
   * Busca pedidos por telefone do cliente
   * @param telefone - Telefone do cliente
   * @returns Promise com array de pedidos
   */
  buscarPorTelefone(telefone: string): Promise<PedidoSupabase[]>

  /**
   * Busca pedidos no histórico por telefone
   * @param telefone - Telefone do cliente
   * @returns Promise com array de pedidos históricos
   */
  buscarHistoricoPorTelefone(telefone: string): Promise<PedidoSupabase[]>

  /**
   * Busca todos os pedidos (ativos + histórico) por telefone
   * @param telefone - Telefone do cliente
   * @returns Promise com array de todos os pedidos
   */
  buscarTodosPorTelefone(telefone: string): Promise<PedidoSupabase[]>

  /**
   * Atualiza o status de um pedido
   * @param pedidoId - ID do pedido
   * @param novoStatus - Novo status
   * @param observacoes - Observações opcionais
   * @returns Promise com o pedido atualizado
   */
  atualizarStatus(pedidoId: string, novoStatus: string, observacoes?: string): Promise<PedidoSupabase>

  /**
   * Busca todos os pedidos (para admin)
   * @param limite - Limite de pedidos (padrão: 50)
   * @returns Promise com array de pedidos
   */
  buscarTodos(limite?: number): Promise<PedidoSupabase[]>

  /**
   * Busca pedidos por status
   * @param status - Status do pedido
   * @returns Promise com array de pedidos
   */
  buscarPorStatus(status: string): Promise<PedidoSupabase[]>

  /**
   * Configura realtime para receber atualizações de pedidos
   * @param callback - Função chamada quando há mudanças
   * @returns Canal de subscrição
   */
  configurarRealtime(callback: (payload: any) => void): any

  /**
   * Remove canal de realtime
   * @param channel - Canal a ser removido
   */
  removerRealtime(channel: any): Promise<'ok' | 'timed out' | 'error'>

}

/**
 * Implementação do serviço de pedidos
 */
export const pedidoService: PedidoService = {
  /**
   * Gera código único de 4 dígitos para identificação do pedido
   */
  async gerarCodigoUnico(): Promise<string> {
    let tentativas = 0
    const maxTentativas = 100

    while (tentativas < maxTentativas) {
      // Gerar código de 4 dígitos (1000-9999)
      const codigo = Math.floor(Math.random() * 9000) + 1000
      const codigoStr = codigo.toString()

      // Verificar se já existe
      const { data, error } = await supabase
        .from('pedidos')
        .select('codigo_pedido')
        .eq('codigo_pedido', codigoStr)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao verificar código único:', error)
        tentativas++
        continue
      }

      // Se não existe, retornar o código
      if (!data) {
        return codigoStr
      }

      tentativas++
    }

    // Se não conseguiu gerar código único, usar timestamp como fallback
    return Date.now().toString().slice(-4)
  },

  /**
   * Salva um novo pedido no banco de dados
   * 
   * Garante que campos de desconto sejam incluídos com valores padrão
   * se não forem fornecidos (desconto = 0, tipo_desconto = 'valor')
   */
  async salvar(pedidoData: Omit<PedidoSupabase, 'id' | 'criado_em' | 'atualizado_em'>): Promise<PedidoSupabase> {
    // Gerar código único se não foi fornecido
    if (!pedidoData.codigo_pedido) {
      const codigoUnico = await pedidoService.gerarCodigoUnico()
      pedidoData = { ...pedidoData, codigo_pedido: codigoUnico }
    }

    // Garantir valores padrão para campos de desconto.
    // Se o pedido já trouxer estabelecimento_id (ex.: checkout público resolvido
    // pelo slug), respeita-o; caso contrário injeta o tenant ativo da sessão.
    const base = {
      ...pedidoData,
      desconto: pedidoData.desconto ?? 0,
      tipo_desconto: pedidoData.tipo_desconto ?? 'valor' as const
    }
    const pedidoComDesconto = (pedidoData as Record<string, unknown>).estabelecimento_id
      ? base
      : comTenant(base as Record<string, unknown>)

    const { data, error } = await supabase
      .from('pedidos')
      .insert(pedidoComDesconto)
      .select()
      .single()

    if (error) {
      console.error('Erro ao salvar pedido:', error)
      throw new Error(`Falha ao salvar pedido: ${error.message}`)
    }

    if (!data) {
      throw new Error('Pedido não foi salvo corretamente')
    }

    return data
  },

  /**
   * Busca pedido pelo ID interno
   */
  async buscarPorId(pedidoId: string): Promise<PedidoSupabase | null> {
    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .eq('pedido_id', pedidoId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao buscar pedido:', error)
      throw new Error(`Falha ao buscar pedido: ${error.message}`)
    }

    return data
  },

  /**
   * Busca pedido pelo código amigável de 4 dígitos
   */
  async buscarPorCodigo(codigo: string): Promise<PedidoSupabase | null> {
    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .eq('codigo_pedido', codigo)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao buscar pedido por código:', error)
      throw new Error(`Falha ao buscar pedido por código: ${error.message}`)
    }

    return data
  },

  /**
   * Busca pedidos ativos por telefone do cliente
   */
  async buscarPorTelefone(telefone: string): Promise<PedidoSupabase[]> {
    // Limpar telefone para busca (apenas números)
    const telefoneNumeros = telefone.replace(/\D/g, '')

    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .order('criado_em', { ascending: false })

      if (error) {
        console.error('Erro ao buscar pedidos por telefone:', error)
        throw new Error(`Falha ao buscar pedidos: ${error.message}`)
      }

      // Filtrar no código
      const pedidosFiltrados = (data || []).filter(pedido => {
        const pedidoTelefoneNumeros = pedido.cliente_telefone?.replace(/\D/g, '') || ''
        return pedidoTelefoneNumeros.includes(telefoneNumeros)
      })

      return pedidosFiltrados
    } catch (err) {
      console.error('Erro geral na busca:', err)
      throw err
    }
  },

  /**
   * Busca pedidos no histórico geral por telefone
   * 
   * Nota: Os campos de desconto (desconto, tipo_desconto) são incluídos
   * automaticamente no histórico quando pedidos são movidos para historico_geral
   */
  async buscarHistoricoPorTelefone(telefone: string): Promise<PedidoSupabase[]> {
    const telefoneNumeros = telefone.replace(/\D/g, '')

    try {
      const { data, error } = await supabase
        .from('historico_geral')
        .select('*')
        .order('criado_em', { ascending: false })

      if (error) {
        console.error('Erro ao buscar pedidos no histórico por telefone:', error)
        throw new Error(`Falha ao buscar histórico: ${error.message}`)
      }

      // Filtrar no código
      const pedidosFiltrados = (data || []).filter(pedido => {
        const pedidoTelefoneNumeros = pedido.cliente_telefone?.replace(/\D/g, '') || ''
        return pedidoTelefoneNumeros.includes(telefoneNumeros)
      })

      return pedidosFiltrados
    } catch (err) {
      console.error('Erro geral na busca do histórico:', err)
      throw err
    }
  },

  /**
   * Busca todos os pedidos (ativos + histórico) por telefone
   * 
   * Nota: Combina pedidos da tabela 'pedidos' e 'historico_geral',
   * ambos incluindo campos de desconto (desconto, tipo_desconto)
   */
  async buscarTodosPorTelefone(telefone: string): Promise<PedidoSupabase[]> {
    const telefoneNumeros = telefone.replace(/\D/g, '')

    try {
      // Buscar em ambas as tabelas simultaneamente
      const [resultadoPedidos, resultadoHistorico] = await Promise.all([
        supabase
          .from('pedidos')
          .select('*')
          .order('criado_em', { ascending: false }),
        supabase
          .from('historico_geral')
          .select('*')
          .order('criado_em', { ascending: false })
      ])

      const pedidosAtivos = resultadoPedidos.data || []
      const pedidosHistorico = resultadoHistorico.data || []

      // Verificar erros
      if (resultadoPedidos.error) {
        console.error('Erro ao buscar pedidos ativos:', resultadoPedidos.error)
      }
      if (resultadoHistorico.error) {
        console.error('Erro ao buscar histórico:', resultadoHistorico.error)
      }

      // Filtrar por telefone no código
      const pedidosAtivosFiltrados = pedidosAtivos.filter(pedido => {
        const pedidoTelefoneNumeros = pedido.cliente_telefone?.replace(/\D/g, '') || ''
        return pedidoTelefoneNumeros.includes(telefoneNumeros)
      })

      const pedidosHistoricoFiltrados = pedidosHistorico.filter(pedido => {
        const pedidoTelefoneNumeros = pedido.cliente_telefone?.replace(/\D/g, '') || ''
        return pedidoTelefoneNumeros.includes(telefoneNumeros)
      })

      // Combinar e ordenar por data
      const todosPedidos = [...pedidosAtivosFiltrados, ...pedidosHistoricoFiltrados]
      const pedidosOrdenados = todosPedidos.sort((a, b) =>
        new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
      )

      return pedidosOrdenados
    } catch (error) {
      console.error('Erro ao buscar todos os pedidos por telefone:', error)
      throw error
    }
  },

  /**
   * Atualiza o status de um pedido
   */
  async atualizarStatus(pedidoId: string, novoStatus: string, observacoes?: string): Promise<PedidoSupabase> {
    console.log('🔄 Atualizando status do pedido:', { pedidoId, novoStatus, observacoes })
    
    const updateData: any = {
      status: novoStatus,
      atualizado_em: new Date().toISOString() // Garantir atualização explícita
    }

    if (observacoes) {
      updateData.observacoes = observacoes
    }

    console.log('📤 Dados do update:', updateData)

    const { data, error } = await supabase
      .from('pedidos')
      .update(updateData)
      .eq('pedido_id', pedidoId)
      .select()
      .single()

    console.log('📥 Resposta do Supabase:', { 
      sucesso: !error, 
      pedidoAtualizado: data?.pedido_id,
      novoStatus: data?.status 
    })

    if (error) {
      console.error('❌ Erro detalhado ao atualizar status:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        pedidoId,
        novoStatus
      })
      throw new Error(`Falha ao atualizar status: ${error.message}`)
    }

    if (!data) {
      console.error('❌ Pedido não encontrado:', pedidoId)
      throw new Error('Pedido não encontrado')
    }

    console.log('✅ Status atualizado com sucesso')


    return data
  },

  /**
   * Busca todos os pedidos para área administrativa
   */
  async buscarTodos(limite: number = 50): Promise<PedidoSupabase[]> {
    const estabId = getEstabelecimentoAtivo()
    let query = supabase.from('pedidos').select('*')
    if (estabId) query = query.eq('estabelecimento_id', estabId)
    const { data, error } = await query
      .order('criado_em', { ascending: false })
      .limit(limite)

    if (error) {
      console.error('Erro ao buscar todos os pedidos:', error)
      throw new Error(`Falha ao buscar pedidos: ${error.message}`)
    }

    return data || []
  },

  /**
   * Busca pedidos filtrados por status
   */
  async buscarPorStatus(status: string): Promise<PedidoSupabase[]> {
    const estabId = getEstabelecimentoAtivo()
    let query = supabase.from('pedidos').select('*').eq('status', status)
    if (estabId) query = query.eq('estabelecimento_id', estabId)
    const { data, error } = await query
      .order('criado_em', { ascending: false })

    if (error) {
      console.error('Erro ao buscar pedidos por status:', error)
      throw new Error(`Falha ao buscar pedidos por status: ${error.message}`)
    }

    return data || []
  },

  /**
   * Configura canal realtime para receber atualizações em tempo real
   */
  configurarRealtime(callback: (payload: any) => void) {
    const estabId = getEstabelecimentoAtivo()
    const channel = supabase
      .channel(`pedidos-realtime-${Date.now()}`) // Canal único
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pedidos',
          // Escopa o realtime ao estabelecimento atual (quando definido)
          ...(estabId ? { filter: `estabelecimento_id=eq.${estabId}` } : {})
        },
        (payload) => {
          callback(payload)
        }
      )
      .subscribe()

    return channel
  },

  /**
   * Remove canal de subscrição realtime
   */
  removerRealtime(channel: any) {
    return supabase.removeChannel(channel)
  }
}

/**
 * Exportar como default para facilitar importação
 */
export default pedidoService
