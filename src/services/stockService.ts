/**
 * Serviço para gerenciamento de estoque e variedades
 * 
 * @module services/stockService
 */

import { supabase } from "@/lib/supabase"
import { comTenant, tenantId } from "./tenant"

/**
 * Interface para Stock Item
 */
export interface StockItem {
  id: string
  product_id: string
  nome: string
  descricao?: string
  quantidade: number
  unidade?: string
  preco_custo?: number
  fornecedor?: string
  categoria?: string
  ativo: boolean
  criado_em: string
  atualizado_em: string
  /** Estoque mínimo (alerta crítico) */
  min_qty?: number
  /** Quantidade sugerida de reposição */
  reorder_qty?: number
}

/**
 * Tipo de status do estoque
 */
export type StockStatus = 'CRITICAL' | 'WARNING' | 'HEALTHY'

/**
 * Calcula o status do estoque a partir das duas faixas configuradas no item:
 *
 *   🔴 CRITICAL — quantidade ≤ estoque mínimo (min_qty)
 *   🟡 WARNING  — quantidade acima do mínimo e ≤ quantidade de reposição (reorder_qty)
 *   🟢 HEALTHY  — quantidade acima da quantidade de reposição
 *
 * Regras de borda:
 * - Quantidade 0 (ou negativa) é sempre CRITICAL, mesmo sem configuração.
 * - Sem mínimo e sem reposição configurados (ambos 0) não há controle: HEALTHY.
 * - Se a reposição não for maior que o mínimo, não existe faixa de atenção:
 *   o item passa direto de CRITICAL para HEALTHY.
 *
 * As colunas min_qty/reorder_qty/quantidade são NUMERIC no Postgres e podem
 * chegar como string via PostgREST — por isso os valores são normalizados com
 * Number() antes de qualquer comparação (comparar strings faria '10' <= '8').
 *
 * @param quantidade - Quantidade total em estoque
 * @param quantidade_minima - Estoque mínimo configurado (min_qty), padrão 0
 * @param quantidade_reposicao - Quantidade de reposição (reorder_qty), padrão 0
 * @returns Status do estoque (CRITICAL, WARNING ou HEALTHY)
 *
 * @example
 * // min_qty = 3, reorder_qty = 8
 * calcularStatusEstoque(3, 3, 8)  // 'CRITICAL' (3 ≤ 3)
 * calcularStatusEstoque(4, 3, 8)  // 'WARNING'  (4 até 8)
 * calcularStatusEstoque(8, 3, 8)  // 'WARNING'  (8 ≤ 8)
 * calcularStatusEstoque(9, 3, 8)  // 'HEALTHY'  (9 > 8)
 * calcularStatusEstoque(0, 3, 8)  // 'CRITICAL' (sem estoque)
 * calcularStatusEstoque(10)       // 'HEALTHY'  (sem controle configurado)
 */
export function calcularStatusEstoque(
  quantidade: number,
  quantidade_minima: number = 0,
  quantidade_reposicao: number = 0
): StockStatus {
  const qtd = Number(quantidade) || 0
  const minimo = Math.max(0, Number(quantidade_minima) || 0)
  const reposicao = Math.max(0, Number(quantidade_reposicao) || 0)

  // Crítico: sem estoque (sempre, independente da configuração)
  if (qtd <= 0) {
    return 'CRITICAL'
  }

  // Sem nenhum controle configurado: considerar saudável
  if (minimo === 0 && reposicao === 0) {
    return 'HEALTHY'
  }

  // Crítico: do estoque mínimo para baixo
  if (qtd <= minimo) {
    return 'CRITICAL'
  }

  // Atenção: acima do mínimo e até a quantidade de reposição (inclusive).
  // Só existe faixa de atenção quando a reposição é maior que o mínimo.
  if (reposicao > minimo && qtd <= reposicao) {
    return 'WARNING'
  }

  // Saudável: acima da quantidade de reposição
  return 'HEALTHY'
}

/**
 * Interface para Stock Variant
 */
export interface StockVariant {
  id: string
  stock_item_id: string
  // Nomenclatura em português (algumas tabelas/colunas legadas)
  nome?: string
  quantidade?: number
  criado_em?: string
  atualizado_em?: string
  // Nomenclatura em inglês (schema de variantes com SKU/código de barras)
  label?: string
  qty?: number
  sku?: string
  barcode?: string
  created_at?: string
  updated_at?: string
}

/**
 * Interface para Stock Movement
 */
export interface StockMovement {
  id: string
  stock_item_id: string
  // Nomenclatura em português
  tipo?: 'entrada' | 'saida' | 'ajuste'
  quantidade?: number
  motivo?: string
  usuario_id?: string
  criado_em?: string
  // Nomenclatura em inglês (histórico de movimentações)
  type?: string
  qty?: number
  ref_type?: string
  ref_id?: string
  notes?: string
  variant_id?: string
  created_at?: string
}

/**
 * Serviço de estoque
 */
export const stockService = {
  /**
   * Busca item de estoque por produto
   */
  async buscarPorProduto(productId: string): Promise<StockItem | null> {
    const { data, error } = await supabase
      .from('stock_items')
      .select('*')
      .eq('product_id', productId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Erro ao buscar estoque:', error)
      throw new Error(`Falha ao buscar estoque: ${error.message}`)
    }

    return data
  },

  /**
   * Busca todos os itens de estoque
   */
  async buscarTodos(): Promise<StockItem[]> {
    const { data, error } = await supabase
      .from('stock_items')
      .select('*')
      .eq('ativo', true)
      .eq('estabelecimento_id', tenantId())
      .order('criado_em', { ascending: false })

    if (error) {
      console.error('Erro ao buscar estoques:', error)
      throw new Error(`Falha ao buscar estoques: ${error.message}`)
    }

    return data || []
  },

  /**
   * Atualiza quantidade total do estoque (apenas se não houver variantes)
   */
  async atualizarQuantidade(stockItemId: string, quantidade: number): Promise<void> {
    // Verificar se existem variantes
    const { data: variants } = await supabase
      .from('stock_variants')
      .select('id')
      .eq('stock_item_id', stockItemId)
      .limit(1)

    if (variants && variants.length > 0) {
      throw new Error('Não é possível atualizar quantidade total quando existem variantes. Edite as variantes individualmente.')
    }

    const { error } = await supabase
      .from('stock_items')
      .update({ quantidade })
      .eq('id', stockItemId)

    if (error) {
      console.error('Erro ao atualizar quantidade:', error)
      throw new Error(`Falha ao atualizar quantidade: ${error.message}`)
    }
  },

  /**
   * Atualiza a quantidade mínima (alerta de estoque crítico)
   */
  async atualizarQuantidadeMinima(stockItemId: string, minQty: number): Promise<void> {
    const { error } = await supabase
      .from('stock_items')
      .update({ min_qty: minQty })
      .eq('id', stockItemId)

    if (error) {
      console.error('Erro ao atualizar quantidade mínima:', error)
      throw new Error(`Falha ao atualizar quantidade mínima: ${error.message}`)
    }
  },

  /**
   * Atualiza a quantidade sugerida de reposição
   */
  async atualizarQuantidadeReposicao(stockItemId: string, reorderQty: number): Promise<void> {
    const { error } = await supabase
      .from('stock_items')
      .update({ reorder_qty: reorderQty })
      .eq('id', stockItemId)

    if (error) {
      console.error('Erro ao atualizar quantidade de reposição:', error)
      throw new Error(`Falha ao atualizar quantidade de reposição: ${error.message}`)
    }
  },



  /**
   * Busca variedades de um item de estoque
   */
  async buscarVariantes(stockItemId: string): Promise<StockVariant[]> {
    const { data, error } = await supabase
      .from('stock_variants')
      .select('*')
      .eq('stock_item_id', stockItemId)
      .eq('estabelecimento_id', tenantId())
      .order('nome', { ascending: true })

    if (error) {
      console.error('Erro ao buscar variantes:', error)
      throw new Error(`Falha ao buscar variantes: ${error.message}`)
    }

    return data || []
  },

  /**
   * Cria uma nova variante
   *
   * O total do stock_item é recalculado em seguida: quando o item passa a ter
   * variantes, stock_items.quantidade deixa de ser editável direto e vira a
   * soma das variantes. Sem esse recálculo o saldo (e o status crítico/
   * atenção/saudável) ficaria divergente da soma real.
   */
  async criarVariante(data: Omit<StockVariant, 'id' | 'created_at' | 'updated_at'>): Promise<StockVariant> {
    const { data: variant, error } = await supabase
      .from('stock_variants')
      .insert([comTenant(data as Record<string, unknown>)])
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar variante:', error)
      throw new Error(`Falha ao criar variante: ${error.message}`)
    }

    if (!variant) {
      throw new Error('Variante não foi criada')
    }

    await this.recalcularQuantidadeTotal(variant.stock_item_id as string)

    return variant
  },

  /**
   * Recalcula a quantidade total do stock_item baseado na soma das variantes
   */
  async recalcularQuantidadeTotal(stockItemId: string): Promise<void> {
    console.log(`📊 [recalcularQuantidadeTotal] Iniciando para stock_item: ${stockItemId}`)

    // Buscar todas as variantes
    const { data: variantes, error: errorVariantes } = await supabase
      .from('stock_variants')
      .select('id, quantidade, nome')
      .eq('stock_item_id', stockItemId)
      .eq('estabelecimento_id', tenantId())

    if (errorVariantes) {
      console.error('❌ Erro ao buscar variantes para recalcular total:', errorVariantes)
      throw new Error(`Falha ao recalcular quantidade total: ${errorVariantes.message}`)
    }

    console.log(`  → Variantes encontradas: ${variantes?.length || 0}`)
    if (variantes) {
      variantes.forEach(v => {
        console.log(`    - ${v.nome}: ${v.quantidade}`)
      })
    }

    // Calcular soma.
    // Number() é obrigatório: quantidade é NUMERIC e pode chegar como string
    // pelo PostgREST — sem a coerção, `0 + '2' + '3'` concatenaria em "023".
    const totalVariantes = (variantes || []).reduce(
      (sum, v) => sum + (Number(v.quantidade) || 0),
      0
    )

    console.log(`  → Total a ser atualizado: ${totalVariantes} unidades`)

    // Atualizar stock_items.quantidade com a soma
    const { data: updateResult, error: errorUpdate } = await supabase
      .from('stock_items')
      .update({ quantidade: totalVariantes })
      .eq('id', stockItemId)
      .eq('estabelecimento_id', tenantId())
      .select('id, quantidade')

    if (errorUpdate) {
      console.error('❌ Erro ao atualizar quantidade total:', errorUpdate)
      throw new Error(`Falha ao atualizar quantidade total: ${errorUpdate.message}`)
    }

    console.log(`  → Resultado da atualização:`, updateResult)
    console.log(`✅ Quantidade total recalculada com sucesso para ${totalVariantes}`)
  },

  /**
   * Atualiza quantidade de uma variante
   */
  async atualizarQuantidadeVariante(variantId: string, quantidade: number): Promise<void> {
    if (quantidade < 0) {
      throw new Error('Quantidade não pode ser negativa')
    }

    // Primeiro, buscar a variante para obter o stock_item_id
    const { data: variant, error: errorSelect } = await supabase
      .from('stock_variants')
      .select('id, stock_item_id, quantidade')
      .eq('id', variantId)
      .eq('estabelecimento_id', tenantId())
      .single()

    if (errorSelect || !variant) {
      console.error(`Variante ${variantId} não encontrada:`, errorSelect)
      throw new Error('Variante não encontrada')
    }

    // Atualizar a variante
    const { data, error } = await supabase
      .from('stock_variants')
      .update({ quantidade })
      .eq('id', variantId)
      .eq('estabelecimento_id', tenantId())
      .select('id')

    if (error) {
      console.error('Erro ao atualizar variante:', error)
      throw new Error(`Falha ao atualizar variante: ${error.message}`)
    }

    if (!data || data.length === 0) {
      console.error(`Variante ${variantId} não encontrada ou não pertence ao estabelecimento`)
      throw new Error('Variante não encontrada ou não pode ser atualizada')
    }

    console.log(`✅ Quantidade de variante ${variantId} atualizada para ${quantidade}`)

    // Após atualizar a variante, recalcular o total do stock_item
    console.log(`  → Recalculando total do stock_item ${variant.stock_item_id}...`)
    await this.recalcularQuantidadeTotal(variant.stock_item_id)
  },

  /**
   * Atualiza dados de uma variante
   */
  async atualizarVariante(variantId: string, data: Partial<StockVariant>): Promise<void> {
    const { error } = await supabase
      .from('stock_variants')
      .update(data)
      .eq('id', variantId)
      .eq('estabelecimento_id', tenantId())

    if (error) {
      console.error('Erro ao atualizar variante:', error)
      throw new Error(`Falha ao atualizar variante: ${error.message}`)
    }
  },

  /**
   * Remove uma variante
   *
   * O stock_item_id é lido ANTES do delete para permitir recalcular o total
   * depois — caso contrário stock_items.quantidade continuaria contando a
   * variante removida.
   */
  async removerVariante(variantId: string): Promise<void> {
    const { data: variante } = await supabase
      .from('stock_variants')
      .select('stock_item_id')
      .eq('id', variantId)
      .eq('estabelecimento_id', tenantId())
      .maybeSingle()

    const { error } = await supabase
      .from('stock_variants')
      .delete()
      .eq('id', variantId)
      .eq('estabelecimento_id', tenantId())

    if (error) {
      console.error('Erro ao remover variante:', error)
      throw new Error(`Falha ao remover variante: ${error.message}`)
    }

    if (variante?.stock_item_id) {
      await this.recalcularQuantidadeTotal(variante.stock_item_id as string)
    }
  },

  // ============================================
  // MOVIMENTAÇÕES
  // ============================================

  /**
   * Registra uma movimentação de estoque
   */
  async registrarMovimento(data: Omit<StockMovement, 'id' | 'criado_em'>): Promise<void> {
    const { error } = await supabase
      .from('stock_movements')
      .insert([comTenant(data as Record<string, unknown>)])

    if (error) {
      console.error('Erro ao registrar movimento:', error)
      throw new Error(`Falha ao registrar movimento: ${error.message}`)
    }
  },

  /**
   * Movimentações recentes da loja ativa numa consulta só (mais recentes primeiro).
   */
  async buscarMovimentosDaLoja(limit: number = 2000): Promise<StockMovement[]> {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('estabelecimento_id', tenantId())
      .order('criado_em', { ascending: false })
      .limit(limit)
    if (error) throw new Error(`Falha ao buscar movimentações: ${error.message}`)
    return data || []
  },

  /** Variantes de todos os itens da loja ativa. */
  async buscarVariantesDaLoja(): Promise<StockVariant[]> {
    const { data, error } = await supabase
      .from('stock_variants')
      .select('*')
      .eq('estabelecimento_id', tenantId())
    if (error) throw new Error(`Falha ao buscar variantes: ${error.message}`)
    return data || []
  },

  /** Nome de todos os produtos da loja ativa, inclusive desativados (id → nome). */
  async buscarNomesProdutosDaLoja(): Promise<Map<string, string>> {
    const { data, error } = await supabase
      .from('produtos')
      .select('id, nome')
      .eq('estabelecimento_id', tenantId())
    if (error) throw new Error(`Falha ao buscar produtos: ${error.message}`)
    return new Map((data ?? []).map((p: { id: string; nome: string }) => [p.id, p.nome]))
  },

  /**
   * Busca histórico de movimentações
   */
  async buscarMovimentos(stockItemId: string, limit: number = 50): Promise<StockMovement[]> {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('stock_item_id', stockItemId)
      .order('criado_em', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Erro ao buscar movimentos:', error)
      throw new Error(`Falha ao buscar movimentos: ${error.message}`)
    }

    return data || []
  },

  /**
   * Dar baixa no estoque (saída)
   *
   * Usada tanto pelas vendas (via darBaixaEmVenda) quanto pela saída manual
   * feita direto no estoque do produto. Sempre lança quando o saldo é
   * insuficiente — a mensagem contém a palavra "insuficiente", da qual os
   * fluxos de venda dependem para bloquear a finalização.
   */
  async darBaixa(
    stockItemId: string,
    quantidade: number,
    variantId?: string,
    usuarioId?: string,
    motivo: string = 'Venda'
  ): Promise<void> {
    const qtdBaixa = Number(quantidade) || 0

    if (qtdBaixa <= 0) {
      throw new Error('Quantidade deve ser maior que zero')
    }

    // Se houver variante, dar baixa na variante (o total do item é recalculado
    // automaticamente por atualizarQuantidadeVariante)
    if (variantId) {
      const { data: variant } = await supabase
        .from('stock_variants')
        .select('quantidade')
        .eq('id', variantId)
        .eq('estabelecimento_id', tenantId())
        .single()

      if (!variant) {
        throw new Error('Variante não encontrada')
      }

      const disponivel = Number(variant.quantidade) || 0

      if (disponivel < qtdBaixa) {
        throw new Error(`Estoque insuficiente. Disponível: ${disponivel}, Solicitado: ${qtdBaixa}`)
      }

      await this.atualizarQuantidadeVariante(variantId, disponivel - qtdBaixa)
    } else {
      const { data: stockItem } = await supabase
        .from('stock_items')
        .select('quantidade')
        .eq('id', stockItemId)
        .eq('estabelecimento_id', tenantId())
        .single()

      if (!stockItem) {
        throw new Error('Item de estoque não encontrado')
      }

      const disponivel = Number(stockItem.quantidade) || 0

      if (disponivel < qtdBaixa) {
        throw new Error(`Estoque insuficiente. Disponível: ${disponivel}, Solicitado: ${qtdBaixa}`)
      }

      await this.atualizarQuantidade(stockItemId, disponivel - qtdBaixa)
    }

    // Registrar movimento
    await this.registrarMovimento({
      stock_item_id: stockItemId,
      tipo: 'saida',
      quantidade: qtdBaixa,
      motivo,
      usuario_id: usuarioId
    })
  },

  /**
   * Resolve o contexto de estoque de um produto para venda.
   *
   * Centraliza a leitura de produtos.requires_stock + stock_items, de modo que
   * PDV, delivery e comandas apliquem exatamente a mesma regra.
   *
   * @returns `controla: false` quando o produto não deve movimentar estoque
   *          (requires_stock = false, ou sem stock_item cadastrado).
   */
  async resolverContextoEstoque(productId: string): Promise<{
    controla: boolean
    motivo?: 'sem_controle' | 'sem_item'
    stockItem?: StockItem
    produtoNome?: string
  }> {
    const { data: produto } = await supabase
      .from('produtos')
      .select('nome, requires_stock')
      .eq('id', productId)
      .eq('estabelecimento_id', tenantId())
      .maybeSingle()

    // Produto sem cadastro (combo, item avulso): não movimenta estoque
    if (!produto) {
      return { controla: false, motivo: 'sem_controle' }
    }

    // requires_stock = false → produto vendido sem controle de estoque
    if (produto.requires_stock === false) {
      return { controla: false, motivo: 'sem_controle', produtoNome: produto.nome as string }
    }

    const stockItem = await this.buscarPorProduto(productId)

    if (!stockItem) {
      return { controla: false, motivo: 'sem_item', produtoNome: produto.nome as string }
    }

    return { controla: true, stockItem, produtoNome: produto.nome as string }
  },

  /**
   * Valida se há saldo suficiente para todos os itens ANTES de criar a venda.
   *
   * Deve ser chamada por todos os canais de venda (PDV, delivery, comanda)
   * antes de persistir a venda, para que nunca se registre uma venda que o
   * estoque não consegue cobrir. Lança na primeira falha.
   */
  async validarEstoqueVenda(
    itens: Array<{ produtoId: string; quantidade: number; variantId?: string; nome?: string }>
  ): Promise<void> {
    for (const item of itens) {
      if (!item.produtoId) continue

      const qtd = Number(item.quantidade) || 0
      if (qtd <= 0) continue

      const ctx = await this.resolverContextoEstoque(item.produtoId)

      // Produto sem controle de estoque: nada a validar
      if (!ctx.controla || !ctx.stockItem) continue

      const nome = item.nome || ctx.produtoNome || 'Produto'

      if (item.variantId) {
        const variantes = await this.buscarVariantes(ctx.stockItem.id)
        const variante = variantes.find(v => v.id === item.variantId)

        if (!variante) {
          throw new Error(`Variante não encontrada para "${nome}"`)
        }

        const disponivel = Number(variante.quantidade ?? variante.qty ?? 0) || 0
        if (disponivel < qtd) {
          throw new Error(
            `Estoque insuficiente para "${nome} - ${variante.nome ?? variante.label ?? ''}". ` +
            `Disponível: ${disponivel}, Solicitado: ${qtd}`
          )
        }
        continue
      }

      const disponivel = Number(ctx.stockItem.quantidade) || 0
      if (disponivel < qtd) {
        throw new Error(
          `Estoque insuficiente para "${nome}". Disponível: ${disponivel}, Solicitado: ${qtd}`
        )
      }
    }
  },

  /**
   * Dar baixa no estoque a partir do PRODUTO (usado em vendas: PDV, delivery, comandas).
   *
   * Aplica a mesma regra para todos os canais:
   * - respeita produtos.requires_stock (não movimenta quando é false);
   * - pula produtos sem stock_item cadastrado (combos, serviços);
   * - lança quando o saldo é insuficiente, para que o canal possa bloquear.
   *
   * @param productId - ID do produto vendido
   * @param quantidade - Quantidade vendida
   * @param variantId - ID da variante (opcional)
   * @param refType - Origem da baixa (ex.: 'SALE', 'COMANDA', 'DELIVERY')
   * @param refId - ID de referência (ex.: id da venda/comanda), usado no motivo
   */
  async darBaixaEmVenda(
    productId: string,
    quantidade: number,
    variantId?: string,
    refType?: string,
    refId?: string
  ): Promise<void> {
    const ctx = await this.resolverContextoEstoque(productId)

    if (!ctx.controla || !ctx.stockItem) {
      console.warn(
        `⚠️ Produto ${ctx.produtoNome || productId} sem controle de estoque (${ctx.motivo}), baixa ignorada`
      )
      return
    }

    // stock_movements não tem colunas ref_type/ref_id, então a origem da baixa
    // fica registrada no motivo para permitir conciliação pelo histórico.
    const motivo = refType
      ? `Venda (${refType}${refId ? ` ${refId}` : ''})`
      : 'Venda'

    await this.darBaixa(ctx.stockItem.id, quantidade, variantId, undefined, motivo)
  },

  /**
   * Dar entrada no estoque
   */
  async darEntrada(stockItemId: string, quantidade: number, variantId?: string, motivo?: string, usuarioId?: string): Promise<void> {
    const qtdEntrada = Number(quantidade) || 0

    if (qtdEntrada <= 0) {
      throw new Error('Quantidade deve ser maior que zero')
    }

    // Se houver variante, dar entrada na variante (o total do item é recalculado
    // automaticamente por atualizarQuantidadeVariante)
    if (variantId) {
      const { data: variant } = await supabase
        .from('stock_variants')
        .select('quantidade')
        .eq('id', variantId)
        .eq('estabelecimento_id', tenantId())
        .single()

      if (!variant) {
        throw new Error('Variante não encontrada')
      }

      await this.atualizarQuantidadeVariante(variantId, (Number(variant.quantidade) || 0) + qtdEntrada)
    } else {
      // Dar entrada no total
      const { data: stockItem } = await supabase
        .from('stock_items')
        .select('quantidade')
        .eq('id', stockItemId)
        .eq('estabelecimento_id', tenantId())
        .single()

      if (!stockItem) {
        throw new Error('Item de estoque não encontrado')
      }

      await this.atualizarQuantidade(stockItemId, (Number(stockItem.quantidade) || 0) + qtdEntrada)
    }

    // Registrar movimento
    await this.registrarMovimento({
      stock_item_id: stockItemId,
      tipo: 'entrada',
      quantidade: qtdEntrada,
      motivo: motivo || 'Entrada manual',
      usuario_id: usuarioId
    })
  },

  /**
   * Busca um produto pelo código de barras, aceitando tanto o código da
   * VARIANTE (stock_variants.barcode) quanto o código genérico do PRODUTO
   * (produtos.codigo_barras). Usada pelo leitor no PDV e nas Comandas.
   *
   * A variante tem prioridade: se o código bipado for de uma variante,
   * o item já entra no carrinho com a variante correta selecionada.
   */
  async buscarPorCodigoBarras(barcode: string): Promise<{
    tipo: 'variante' | 'produto'
    produto: Record<string, unknown>
    variante?: { id: string; label: string; quantidade: number }
  } | null> {
    const codigo = (barcode || '').trim()
    if (!codigo) return null

    // 1) Código de barras de uma variante
    const { data: variante } = await supabase
      .from('stock_variants')
      .select('id, nome, quantidade, stock_item_id')
      .eq('barcode', codigo)
      .eq('estabelecimento_id', tenantId())
      .maybeSingle()

    if (variante) {
      const { data: stockItem } = await supabase
        .from('stock_items')
        .select('product_id')
        .eq('id', variante.stock_item_id as string)
        .eq('estabelecimento_id', tenantId())
        .maybeSingle()

      if (stockItem?.product_id) {
        const { data: produto } = await supabase
          .from('produtos')
          .select('*')
          .eq('id', stockItem.product_id as string)
          .eq('estabelecimento_id', tenantId())
          .maybeSingle()

        if (produto) {
          return {
            tipo: 'variante',
            produto,
            variante: {
              id: variante.id as string,
              label: (variante.nome as string) || '',
              quantidade: Number(variante.quantidade) || 0
            }
          }
        }
      }
    }

    // 2) Código de barras genérico do produto
    const { data: produto } = await supabase
      .from('produtos')
      .select('*')
      .eq('codigo_barras', codigo)
      .eq('estabelecimento_id', tenantId())
      .eq('ativo', true)
      .maybeSingle()

    if (produto) {
      return { tipo: 'produto', produto }
    }

    return null
  },

}

export default stockService
