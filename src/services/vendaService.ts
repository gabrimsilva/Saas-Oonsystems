/**
 * Serviço para gerenciamento de vendas do PDV
 * 
 * @module services/vendaService
 */

import { supabase } from "@/lib/supabase"
import { comTenant, tenantId } from "./tenant"

/**
 * Interface para uma venda
 */
export interface Sale {
  id: string
  sale_number: string
  total_amount: number
  payment_method: 'DEBIT' | 'CREDIT' | 'PIX' | 'CASH'
  needs_change: boolean
  change_amount?: number
  sale_type: string
  items: any[]
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
}

/**
 * Dados para criar uma nova venda
 */
export type NovaVenda = Omit<Sale, 'id' | 'created_at' | 'updated_at'>

/**
 * Classe de serviço para gerenciar vendas
 */
class VendaService {
  /**
   * Gera um número único para a venda
   * Formato: VENDA-YYYYMMDD-XXX
   */
  private async gerarNumeroVenda(): Promise<string> {
    const hoje = new Date()
    const ano = hoje.getFullYear()
    const mes = String(hoje.getMonth() + 1).padStart(2, '0')
    const dia = String(hoje.getDate()).padStart(2, '0')
    const dataStr = `${ano}${mes}${dia}`

    // Buscar vendas do dia para gerar sequencial
    const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
    const fimDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1)

    const { data, error } = await supabase
      .from('sales')
      .select('sale_number')
      .eq('estabelecimento_id', tenantId())
      .gte('created_at', inicioDia.toISOString())
      .lt('created_at', fimDia.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error('Erro ao buscar vendas do dia:', error)
    }

    let sequencial = 1
    if (data && data.length > 0) {
      const ultimoNumero = data[0].sale_number
      const match = ultimoNumero.match(/-(\d+)$/)
      if (match) {
        sequencial = parseInt(match[1]) + 1
      }
    }

    return `VENDA-${dataStr}-${String(sequencial).padStart(3, '0')}`
  }

  /**
   * Mapeia forma de pagamento do formato antigo para o novo
   */
  private mapearFormaPagamento(formaPagamento: string): 'DEBIT' | 'CREDIT' | 'PIX' | 'CASH' {
    const mapa: { [key: string]: 'DEBIT' | 'CREDIT' | 'PIX' | 'CASH' } = {
      'dinheiro': 'CASH',
      'cartaoDebito': 'DEBIT',
      'cartaoCredito': 'CREDIT',
      'cartao_debito': 'DEBIT',           // Adicionar suporte a underscore
      'cartao_credito': 'CREDIT',         // Adicionar suporte a underscore
      'pix': 'PIX',
      'CASH': 'CASH',
      'DEBIT': 'DEBIT',
      'CREDIT': 'CREDIT',
      'PIX': 'PIX'
    }

    return mapa[formaPagamento] || 'CASH'
  }

  /**
   * Enriquece os items com o custo atual dos produtos
   * Busca o custo na tabela produtos para garantir cálculo correto do lucro
   */
  private async enriquecerItensComCusto(itens: any[]): Promise<any[]> {
    if (!itens || itens.length === 0) return []

    try {
      // Extrair IDs únicos dos produtos
      const produtoIds = [...new Set(itens.map(item => item.produto?.id).filter(Boolean))]

      if (produtoIds.length === 0) return itens

      // Buscar custos dos produtos
      const { data: produtos, error } = await supabase
        .from('produtos')
        .select('id, custo')
        .in('id', produtoIds)

      if (error) {
        console.error('⚠️ Erro ao buscar custos dos produtos:', error)
        return itens // Retornar items originais em caso de erro
      }

      // Criar mapa de custos
      const custosMap = new Map<string, number>()
      produtos?.forEach(p => {
        custosMap.set(p.id, p.custo || 0)
      })

      // Enriquecer items com custo
      return itens.map(item => {
        if (!item.produto) return item

        const custo = custosMap.get(item.produto.id) || 0
        return {
          ...item,
          produto: {
            ...item.produto,
            custo
          }
        }
      })
    } catch (error) {
      console.error('⚠️ Erro ao enriquecer items com custo:', error)
      return itens // Retornar items originais em caso de erro
    }
  }

  /**
   * Salva uma nova venda no banco de dados
   */
  async salvar(vendaData: Partial<NovaVenda> & { 
    payment_method?: string,
    needs_change?: boolean,
    change_amount?: number,
    items: any[],
    total_amount: number
  }): Promise<Sale> {
    try {
      // Gerar número da venda se não foi fornecido
      const saleNumber = vendaData.sale_number || await this.gerarNumeroVenda()

      // Obter usuário atual
      const { data: { user } } = await supabase.auth.getUser()

      // Preparar dados da venda
      const dadosVenda = comTenant({
        sale_number: saleNumber,
        total_amount: vendaData.total_amount,
        payment_method: this.mapearFormaPagamento(vendaData.payment_method || 'CASH'),
        needs_change: vendaData.needs_change || false,
        change_amount: vendaData.change_amount || null,
        sale_type: vendaData.sale_type || 'PDV',
        items: vendaData.items,
        notes: vendaData.notes || null,
        created_by: user?.id || null
      })

      // Inserir venda
      const { data, error } = await supabase
        .from('sales')
        .insert(dadosVenda)
        .select()
        .single()

      if (error) {
        console.error('Erro ao salvar venda:', error)
        throw new Error(`Erro ao salvar venda: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Erro ao salvar venda:', error)
      throw error
    }
  }

  /**
   * Busca todas as vendas
   */
  async buscarTodas(): Promise<Sale[]> {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('estabelecimento_id', tenantId())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar vendas:', error)
      throw new Error(`Erro ao buscar vendas: ${error.message}`)
    }

    return data || []
  }

  /**
   * Busca uma venda por número
   */
  async buscarPorNumero(saleNumber: string): Promise<Sale | null> {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('sale_number', saleNumber)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Erro ao buscar venda:', error)
      throw new Error(`Erro ao buscar venda: ${error.message}`)
    }

    return data
  }

  /**
   * Busca vendas por período
   */
  async buscarPorPeriodo(dataInicio: Date, dataFim: Date): Promise<Sale[]> {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('estabelecimento_id', tenantId())
      .gte('created_at', dataInicio.toISOString())
      .lt('created_at', dataFim.toISOString()) // Usar < ao invés de <=
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar vendas por período:', error)
      throw new Error(`Erro ao buscar vendas: ${error.message}`)
    }

    return data || []
  }

  /**
   * Busca vendas por forma de pagamento
   */
  async buscarPorFormaPagamento(paymentMethod: 'DEBIT' | 'CREDIT' | 'PIX' | 'CASH'): Promise<Sale[]> {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('payment_method', paymentMethod)
      .eq('estabelecimento_id', tenantId())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar vendas por forma de pagamento:', error)
      throw new Error(`Erro ao buscar vendas: ${error.message}`)
    }

    return data || []
  }

  /**
   * Exclui uma venda do banco de dados
   * Remove a venda e todas as suas referências
   * 
   * @param vendaId - ID da venda a ser excluída
   */
  async excluir(vendaId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', vendaId)
        .eq('estabelecimento_id', tenantId())

      if (error) {
        console.error('Erro ao excluir venda:', error)
        throw new Error(`Erro ao excluir venda: ${error.message}`)
      }

      console.log(`✅ Venda ${vendaId} excluída com sucesso`)
    } catch (error) {
      console.error('Erro ao excluir venda:', error)
      throw error
    }
  }

  /**
   * Cria uma venda a partir de um pedido delivery finalizado
   * 
   * @param pedido - Dados do pedido delivery
   * @returns Venda criada
   */
  async criarVendaDelivery(pedido: any): Promise<Sale> {
    try {
      // Gerar número da venda
      const saleNumber = await this.gerarNumeroVenda()

      // Obter usuário atual (admin que finalizou)
      const { data: { user } } = await supabase.auth.getUser()

      // Mapear forma de pagamento
      let paymentMethod = this.mapearFormaPagamento(pedido.forma_pagamento || 'PIX')

      // ✅ Enriquecer items com custo atual dos produtos
      const itensEnriquecidos = await this.enriquecerItensComCusto(pedido.itens || [])

      // Preparar dados da venda
      const dadosVenda = comTenant({
        sale_number: saleNumber,
        total_amount: pedido.total || 0,
        payment_method: paymentMethod,
        needs_change: pedido.precisa_troco || false,
        change_amount: pedido.valor_troco || null,
        sale_type: 'DELIVERY',
        items: itensEnriquecidos,
        notes: `Pedido Delivery #${pedido.codigo_pedido || pedido.pedido_id} - Cliente: ${pedido.cliente_nome} ${pedido.cliente_sobrenome || ''}`,
        created_by: user?.id || null
      })

      // Inserir venda
      const { data, error } = await supabase
        .from('sales')
        .insert(dadosVenda)
        .select()
        .single()

      if (error) {
        console.error('Erro ao criar venda delivery:', error)
        throw new Error(`Erro ao criar venda delivery: ${error.message}`)
      }

      console.log(`✅ Venda delivery criada: ${saleNumber} (Pedido: ${pedido.codigo_pedido})`)
      return data
    } catch (error) {
      console.error('Erro ao criar venda delivery:', error)
      throw error
    }
  }
}

// Exportar instância única do serviço
export const vendaService = new VendaService()
