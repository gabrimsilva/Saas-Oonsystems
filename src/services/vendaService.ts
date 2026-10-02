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
  payment_method: 'DEBIT' | 'CREDIT' | 'PIX' | 'CASH' | 'A_PRAZO' | 'INTERNAL_CONSUMPTION' | 'SPLIT'
  needs_change: boolean
  change_amount?: number
  sale_type: string
  items: any[]
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
  /** Prazo em dias até o vencimento da 1ª parcela (venda A_PRAZO) */
  payment_term_days?: number | null
  /** Número de parcelas da venda A_PRAZO (1 a 12) */
  installments_count?: number | null
  /** Nome do cliente (opcional, útil para vendas A_PRAZO) */
  customer_name?: string | null
  /** Venda paga em duas formas (payment_method = 'SPLIT') */
  forma_pagamento_dividido?: boolean
  pagamento_1_tipo?: 'DEBIT' | 'CREDIT' | 'PIX' | 'CASH' | null
  pagamento_1_valor?: number | null
  pagamento_2_tipo?: 'DEBIT' | 'CREDIT' | 'PIX' | 'CASH' | null
  pagamento_2_valor?: number | null
}

/**
 * Parcela de uma venda "A Prazo"
 */
export interface SaleInstallment {
  id: string
  sale_id: string
  numero_parcela: number
  valor: number
  data_vencimento: string
  pago: boolean
  pago_em?: string | null
  criado_em: string
  atualizado_em: string
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
  private mapearFormaPagamento(formaPagamento: string): Sale['payment_method'] {
    const mapa: { [key: string]: Sale['payment_method'] } = {
      'dividido': 'SPLIT',
      'SPLIT': 'SPLIT',
      'dinheiro': 'CASH',
      'cartaoDebito': 'DEBIT',
      'cartaoCredito': 'CREDIT',
      'cartao_debito': 'DEBIT',           // Adicionar suporte a underscore
      'cartao_credito': 'CREDIT',         // Adicionar suporte a underscore
      'pix': 'PIX',
      'aPrazo': 'A_PRAZO',
      'a_prazo': 'A_PRAZO',
      'CASH': 'CASH',
      'DEBIT': 'DEBIT',
      'CREDIT': 'CREDIT',
      'PIX': 'PIX',
      'A_PRAZO': 'A_PRAZO',
      'INTERNAL_CONSUMPTION': 'INTERNAL_CONSUMPTION'
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
    total_amount: number,
    payment_term_days?: number,
    installments_count?: number,
    customer_name?: string,
    forma_pagamento_dividido?: boolean,
    pagamento_1_tipo?: string,
    pagamento_1_valor?: number,
    pagamento_2_tipo?: string,
    pagamento_2_valor?: number
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
        created_by: user?.id || null,
        payment_term_days: vendaData.payment_term_days ?? null,
        installments_count: vendaData.installments_count ?? null,
        customer_name: vendaData.customer_name ?? null,
        ...(vendaData.forma_pagamento_dividido
          ? {
              forma_pagamento_dividido: true,
              pagamento_1_tipo: this.mapearFormaPagamento(vendaData.pagamento_1_tipo || ''),
              pagamento_1_valor: vendaData.pagamento_1_valor,
              pagamento_2_tipo: this.mapearFormaPagamento(vendaData.pagamento_2_tipo || ''),
              pagamento_2_valor: vendaData.pagamento_2_valor
            }
          : {})
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
   * Gera e salva as parcelas de uma venda "A Prazo".
   *
   * Divide o valor total em `numeroParcelas` parcelas iguais (a última
   * absorve a diferença de centavos por arredondamento) e calcula a data de
   * vencimento de cada uma espaçando pelo intervalo de `prazoDias`.
   *
   * Exemplo: prazoDias=7, numeroParcelas=3
   * - 1ª parcela: hoje + 7 dias
   * - 2ª parcela: hoje + 14 dias
   * - 3ª parcela: hoje + 21 dias
   *
   * @param saleId - ID da venda já criada
   * @param totalAmount - Valor total da venda
   * @param prazoDias - Dias entre cada vencimento (intervalo de parcelamento)
   * @param numeroParcelas - Número de parcelas (1 a 12)
   */
  async criarParcelas(
    saleId: string,
    totalAmount: number,
    prazoDias: number,
    numeroParcelas: number
  ): Promise<SaleInstallment[]> {
    try {
      const qtd = Math.min(Math.max(numeroParcelas || 1, 1), 12)
      const valorParcela = Math.floor((totalAmount / qtd) * 100) / 100
      const somaParcelas = valorParcela * (qtd - 1)
      const valorUltimaParcela = Math.round((totalAmount - somaParcelas) * 100) / 100

      const hoje = new Date()
      const parcelas = Array.from({ length: qtd }, (_, i) => {
        const dataVencimento = new Date(hoje)
        // Cada parcela vence a cada "prazoDias" dias (ex: 7, 14, 21 dias)
        dataVencimento.setDate(dataVencimento.getDate() + (prazoDias * (i + 1)))

        return comTenant({
          sale_id: saleId,
          numero_parcela: i + 1,
          valor: i === qtd - 1 ? valorUltimaParcela : valorParcela,
          data_vencimento: dataVencimento.toISOString().slice(0, 10),
          pago: false
        })
      })

      const { data, error } = await supabase
        .from('sale_installments')
        .insert(parcelas)
        .select()

      if (error) {
        console.error('Erro ao criar parcelas:', error)
        throw new Error(`Erro ao criar parcelas: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Erro ao criar parcelas:', error)
      throw error
    }
  }

  /**
   * Busca todas as parcelas de uma venda específica, ordenadas por número
   */
  async buscarParcelasPorVenda(saleId: string): Promise<SaleInstallment[]> {
    const { data, error } = await supabase
      .from('sale_installments')
      .select('*')
      .eq('sale_id', saleId)
      .order('numero_parcela', { ascending: true })

    if (error) {
      console.error('Erro ao buscar parcelas da venda:', error)
      throw new Error(`Erro ao buscar parcelas: ${error.message}`)
    }

    return data || []
  }

  /**
   * Busca todas as parcelas de todas as vendas "A Prazo" do estabelecimento,
   * usado para montar a aba "Faturados" no Histórico de Vendas.
   */
  async buscarTodasParcelas(): Promise<SaleInstallment[]> {
    const { data, error } = await supabase
      .from('sale_installments')
      .select('*')
      .eq('estabelecimento_id', tenantId())
      .order('data_vencimento', { ascending: true })

    if (error) {
      console.error('Erro ao buscar parcelas:', error)
      throw new Error(`Erro ao buscar parcelas: ${error.message}`)
    }

    return data || []
  }

  /**
   * Marca (ou desmarca) uma parcela como paga
   */
  async definirParcelaPaga(parcelaId: string, pago: boolean): Promise<SaleInstallment> {
    const { data, error } = await supabase
      .from('sale_installments')
      .update({ pago, pago_em: pago ? new Date().toISOString() : null })
      .eq('id', parcelaId)
      .eq('estabelecimento_id', tenantId())
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar parcela:', error)
      throw new Error(`Erro ao atualizar parcela: ${error.message}`)
    }

    return data
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
      .eq('estabelecimento_id', tenantId())
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
  async buscarPorFormaPagamento(paymentMethod: 'DEBIT' | 'CREDIT' | 'PIX' | 'CASH' | 'A_PRAZO'): Promise<Sale[]> {
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
   * Busca todas as vendas "A Prazo" do estabelecimento, independente de
   * período — usado na aba "Faturados" do Histórico de Vendas, que precisa
   * mostrar todas as parcelas pendentes/atrasadas mesmo de vendas antigas.
   */
  async buscarVendasAPrazo(): Promise<Sale[]> {
    return this.buscarPorFormaPagamento('A_PRAZO')
  }

  /**
   * Exclui uma venda do banco de dados
   * Remove a venda e todas as suas referências
   * 
   * @param vendaId - ID da venda a ser excluída
   */
  async excluir(vendaId: string): Promise<void> {
    try {
      // .select() no delete força o retorno das linhas removidas, permitindo
      // detectar quando o RLS bloqueia silenciosamente a exclusão (retorna
      // sucesso com 0 linhas afetadas em vez de erro).
      const { data, error } = await supabase
        .from('sales')
        .delete()
        .eq('id', vendaId)
        .eq('estabelecimento_id', tenantId())
        .select('id')

      if (error) {
        console.error('Erro ao excluir venda:', error)
        throw new Error(`Erro ao excluir venda: ${error.message}`)
      }

      if (!data || data.length === 0) {
        throw new Error('Venda não encontrada ou sem permissão para excluir.')
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
