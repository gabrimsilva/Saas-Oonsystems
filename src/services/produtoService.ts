/**
 * Serviço para gerenciamento de produtos
 *
 * Este serviço encapsula todas as operações relacionadas a produtos,
 * incluindo gerenciamento de imagens e associação com sabores.
 *
 * @module services/produtoService
 */

import { supabase } from "@/lib/supabase"
import { getEstabelecimentoAtivo, comTenant } from "./tenant"
import type { ProdutoSupabase, SaborSupabase } from '@/types/supabase'

/**
 * Interface do serviço de produtos
 */
export interface ProdutoService {
  /**
   * Busca todos os produtos ativos
   * @returns Promise com array de produtos
   */
  buscarTodos(): Promise<ProdutoSupabase[]>

  /**
   * Busca um produto por ID
   * @param id - ID do produto
   * @returns Promise com o produto ou null
   */
  buscarPorId(id: string): Promise<ProdutoSupabase | null>

  /**
   * Busca produtos por categoria
   * @param categoria - Nome da categoria
   * @returns Promise com array de produtos
   */
  buscarPorCategoria(categoria: string): Promise<ProdutoSupabase[]>

  /**
   * Cria um novo produto
   * @param data - Dados do produto
   * @returns Promise com o produto criado
   */
  criar(data: Omit<ProdutoSupabase, 'id' | 'criado_em' | 'atualizado_em'>): Promise<ProdutoSupabase>

  /**
   * Atualiza um produto existente
   * @param id - ID do produto
   * @param data - Dados para atualizar
   * @returns Promise com o produto atualizado
   */
  atualizar(id: string, data: Partial<ProdutoSupabase>): Promise<ProdutoSupabase>

  /**
   * Deleta um produto permanentemente (inclui imagem do storage)
   * @param id - ID do produto
   */
  excluir(id: string): Promise<void>

  /**
   * Busca sabores associados a um produto
   * @param produtoId - ID do produto
   * @returns Promise com array de sabores
   */
  buscarSaboresProduto(produtoId: string): Promise<SaborSupabase[]>

  /**
   * Associa sabores a um produto
   * @param produtoId - ID do produto
   * @param saborIds - Array de IDs dos sabores
   */
  associarSabores(produtoId: string, saborIds: string[]): Promise<void>

  /**
   * Remove imagens órfãs do storage
   */
  limparImagensOrfas(): Promise<void>

  /**
   * Remove duplicatas de stock_items para um produto
   * @param produtoId - ID do produto
   * @returns Promise com quantidade de duplicatas removidas
   */
  limparDuplicatasEstoque(produtoId: string): Promise<number>
}

/**
 * Implementação do serviço de produtos
 */
/**
 * Trava de custo maior que o preço de venda (defesa além do formulário):
 * evita lucro negativo nas métricas por valor digitado sem os centavos.
 */
function validarCustoPreco(custo: unknown, preco: unknown): void {
  const c = Number(custo) || 0
  const p = Number(preco) || 0
  if (c > 0 && p > 0 && c > p) {
    throw new Error('O custo do produto é maior que o preço de venda. Confira os valores digitados.')
  }
}

export const produtoService: ProdutoService = {
  /**
   * Busca todos os produtos ativos ordenados por categoria e nome
   */
  async buscarTodos(): Promise<ProdutoSupabase[]> {
    const estabId = getEstabelecimentoAtivo()
    let query = supabase
      .from('produtos')
      .select('*')
      .eq('ativo', true)
    if (estabId) query = query.eq('estabelecimento_id', estabId)
    const { data, error } = await query
      .order('categoria_nome', { ascending: true })
      .order('nome', { ascending: true })

    if (error) {
      console.error('Erro ao buscar produtos:', error)
      throw new Error(`Falha ao buscar produtos: ${error.message}`)
    }

    return data || []
  },

  /**
   * Busca produto específico por ID
   */
  async buscarPorId(id: string): Promise<ProdutoSupabase | null> {
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Erro ao buscar produto:', error)
      throw new Error(`Falha ao buscar produto: ${error.message}`)
    }

    return data
  },

  /**
   * Busca produtos de uma categoria específica
   */
  async buscarPorCategoria(categoria: string): Promise<ProdutoSupabase[]> {
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('categoria_nome', categoria)
      .eq('ativo', true)
      .eq('estabelecimento_id', getEstabelecimentoAtivo() ?? '00000000-0000-0000-0000-000000000000')
      .order('nome', { ascending: true })

    if (error) {
      console.error('Erro ao buscar produtos por categoria:', error)
      throw new Error(`Falha ao buscar produtos por categoria: ${error.message}`)
    }

    return data || []
  },

  /**
   * Cria um novo produto
   */
  async criar(data: Omit<ProdutoSupabase, 'id' | 'criado_em' | 'atualizado_em'>): Promise<ProdutoSupabase> {
    try {
      validarCustoPreco(data.custo, data.preco)

      // 1. Criar produto (injeta estabelecimento_id do tenant atual)
      const { data: produto, error } = await supabase
        .from('produtos')
        .insert([comTenant(data as Record<string, unknown>)])
        .select()
        .single()

      if (error) {
        console.error('Erro ao criar produto:', error)
        throw new Error(`Falha ao criar produto: ${error.message}`)
      }

      if (!produto) {
        throw new Error('Produto não foi criado corretamente')
      }

      // 2. Se requires_stock = true, garantir que exista UM stock_item.
      // IMPORTANTE: o banco possui um trigger (trigger_criar_estoque_automatico)
      // que já cria o stock_item no INSERT do produto. Para evitar duplicidade,
      // só inserimos aqui caso ainda não exista estoque vinculado ao produto.
      const requiresStock = (data as any).requires_stock ?? true

      if (requiresStock) {
        // Verifica se o trigger (ou qualquer outro fluxo) já criou o estoque
        const { data: stockExistentes } = await supabase
          .from('stock_items')
          .select('id')
          .eq('product_id', produto.id)

        if (!stockExistentes || stockExistentes.length === 0) {
          // Nenhum estoque existe, criar um novo
          const { data: novoStock, error: stockError } = await supabase
            .from('stock_items')
            .insert([comTenant({
              product_id: produto.id,
              nome: produto.nome,
              descricao: `Estoque de ${produto.nome}`,
              quantidade: 0,
              ativo: true
            })])
            .select('id')
            .single()

          if (stockError) {
            // Se já existir (UNIQUE constraint), ignorar erro
            if (stockError.code !== '23505') {
              console.error('Erro ao criar item de estoque:', stockError)
              // Não interromper criação do produto
            }
          } else if (novoStock && !(produto as any).stock_item_id) {
            // Vincula o estoque ao produto caso o trigger não tenha feito
            await supabase
              .from('produtos')
              .update({ stock_item_id: novoStock.id })
              .eq('id', produto.id)
            ;(produto as any).stock_item_id = novoStock.id
          }
        } else if (stockExistentes.length > 1) {
          // ⚠️ DUPLICAÇÃO DETECTADA: mais de um stock_item para este produto
          console.warn('⚠️ DUPLICAÇÃO: Produto tem múltiplos stock_items!', { 
            productId: produto.id, 
            count: stockExistentes.length,
            ids: stockExistentes.map(s => s.id)
          })
          
          // Manter apenas o primeiro ativo, desativar os demais
          const idsParaDesativar = stockExistentes.slice(1).map(s => s.id)
          const { error: cleanupError } = await supabase
            .from('stock_items')
            .update({ ativo: false })
            .in('id', idsParaDesativar)
          
          if (cleanupError) {
            console.error('Erro ao limpar stock_items duplicados:', cleanupError)
          } else {
            console.log('✅ Stock_items duplicados desativados', { count: idsParaDesativar.length })
          }
        }
      }

      return produto
    } catch (err) {
      console.error('Erro ao criar produto:', err)
      throw err instanceof Error ? err : new Error('Erro desconhecido ao criar produto')
    }
  },

  /**
   * Atualiza dados de um produto
   */
  async atualizar(id: string, data: Partial<ProdutoSupabase>): Promise<ProdutoSupabase> {
    try {
      // 1. Buscar produto atual para comparar requires_stock
      const produtoAtual = await this.buscarPorId(id)
      
      if (!produtoAtual) {
        throw new Error('Produto não encontrado')
      }

      // 2. Atualizar produto
      // IMPORTANTE: Não usar comTenant no UPDATE, pois comTenant injeta estabelecimento_id
      // no payload que seria ATUALIZADO, e a RLS já protege via cláusula USING/WITH CHECK.
      // Apenas adicionar atualizado_em.
      console.log('📝 Atualizando produto:', { id, data })
      
      // Limpar dados para apenas incluir campos válidos da tabela
      // Remover qualquer campo que não existe na tabela produtos
      const dataLimpa = {
        nome: data.nome,
        descricao: data.descricao,
        custo: (data as any).custo !== undefined ? (data as any).custo : undefined,
        preco: data.preco,
        preco_promocional: data.preco_promocional ?? null,
        preco_online: data.preco_online,
        preco_atacado: data.preco_atacado,
        categoria_id: data.categoria_id,
        categoria_nome: data.categoria_nome,
        imagem_path: data.imagem_path,
        sabores_disponiveis: data.sabores_disponiveis ?? false,
        quantidade_sabores: data.quantidade_sabores ?? 1,
        permite_adicionais: (data as any).permite_adicionais ?? false,
        requires_stock: (data as any).requires_stock,
        ativo: data.ativo !== undefined ? data.ativo : true,
        atualizado_em: new Date().toISOString()
      }

      // Remover campos undefined
      Object.keys(dataLimpa).forEach(key => {
        const value = (dataLimpa as any)[key]
        if (value === undefined) {
          delete (dataLimpa as any)[key]
        }
      })

      // Compara os valores efetivos depois da alteração (custo ou preço podem vir sozinhos)
      validarCustoPreco(
        dataLimpa.custo !== undefined ? dataLimpa.custo : (produtoAtual as ProdutoSupabase).custo,
        dataLimpa.preco !== undefined ? dataLimpa.preco : produtoAtual.preco
      )

      console.log('✅ Dados validados:', dataLimpa)
      
      const { data: produto, error } = await supabase
        .from('produtos')
        .update(dataLimpa)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('❌ Erro ao atualizar produto:', { 
          message: error.message, 
          code: error.code,
          details: (error as any).details,
          id,
          data
        })
        throw new Error(`Falha ao atualizar produto: ${error.message}`)
      }

      if (!produto) {
        throw new Error('Produto não encontrado')
      }
      
      console.log('✅ Produto atualizado:', produto.id)

      // 3. Verificar se requires_stock mudou
      const requiresStockAtual = (produtoAtual as any).requires_stock ?? true
      const requiresStockNovo = (data as any).requires_stock ?? requiresStockAtual

      // 4. Se requires_stock foi ativado, criar stock_item se não existir
      if (!requiresStockAtual && requiresStockNovo) {
        // Verificar se já existe stock_item (ativo ou não)
        const { data: stockExistentes } = await supabase
          .from('stock_items')
          .select('id, ativo')
          .eq('product_id', id)

        if (!stockExistentes || stockExistentes.length === 0) {
          // Nenhum estoque existe, criar um novo
          const { error: stockError } = await supabase
            .from('stock_items')
            .insert([comTenant({
              product_id: id,
              nome: produto.nome,
              descricao: `Estoque de ${produto.nome}`,
              quantidade: 0,
              ativo: true
            })])

          if (stockError && stockError.code !== '23505') {
            console.error('Erro ao criar item de estoque:', stockError)
            // Não interromper atualização do produto
          }
        } else {
          // Já existe(m) stock_item(ns), reativar o(s) ativo(s)
          const { error: reactivateError } = await supabase
            .from('stock_items')
            .update({ ativo: true })
            .eq('product_id', id)

          if (reactivateError) {
            console.error('Erro ao reativar stock_item:', reactivateError)
          } else {
            console.log('✅ Stock_item reativado')
          }

          // Se há duplicatas, limpar
          if (stockExistentes.length > 1) {
            console.warn('⚠️ DUPLICAÇÃO: Produto tem múltiplos stock_items!', {
              productId: id,
              count: stockExistentes.length
            })
            // Desativar todos menos o primeiro
            const idsParaDesativar = stockExistentes.slice(1).map(s => s.id)
            await supabase
              .from('stock_items')
              .update({ ativo: false })
              .in('id', idsParaDesativar)
          }
        }
      }

      // 5. Se requires_stock foi desativado, desativar todos os stock_items deste produto
      if (requiresStockAtual && !requiresStockNovo) {
        console.log('🔴 Desativando stock_item para produto:', { id })
        
        // Buscar TODOS os stock_items ativos deste produto
        const { data: stocksAtivos, error: queryError } = await supabase
          .from('stock_items')
          .select('id')
          .eq('product_id', id)
          .eq('ativo', true)

        if (queryError) {
          console.error('❌ Erro ao buscar stock_items ativos:', {
            message: queryError.message,
            code: queryError.code,
            id
          })
        } else if (stocksAtivos && stocksAtivos.length > 0) {
          // Desativar CADA stock_item individualmente
          const { error: stockUpdateError } = await supabase
            .from('stock_items')
            .update({ ativo: false })
            .in('id', stocksAtivos.map(s => s.id))

          if (stockUpdateError) {
            console.error('❌ Erro ao desativar stock_items:', {
              message: stockUpdateError.message,
              code: stockUpdateError.code,
              details: (stockUpdateError as any).details,
              stocksCount: stocksAtivos.length,
              id
            })
          } else {
            console.log('✅ Stock_items desativados com sucesso', { count: stocksAtivos.length })
          }
        }
      }

      return produto
    } catch (err) {
      console.error('Erro ao atualizar produto:', err)
      throw err instanceof Error ? err : new Error('Erro desconhecido ao atualizar produto')
    }
  },

  /**
   * Remove produto e sua imagem do storage
   */
  async excluir(id: string): Promise<void> {
    try {
      // Buscar produto para obter caminho da imagem
      const produto = await this.buscarPorId(id)

      if (produto && produto.imagem_path) {
        // Extrair nome do arquivo da URL
        const urlParts = produto.imagem_path.split('/')
        const fileName = urlParts[urlParts.length - 1]

        // Deletar imagem do storage
        const { error: storageError } = await supabase.storage
          .from('produtos-imagens')
          .remove([`produtos/${fileName}`])

        if (storageError) {
          // Não interromper exclusão do produto
        }
      }

      // Deletar produto do banco
      const { error } = await supabase
        .from('produtos')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Erro ao excluir produto:', error)
        throw new Error(`Falha ao excluir produto: ${error.message}`)
      }
    } catch (err) {
      console.error('Erro ao excluir produto:', err)
      throw err instanceof Error ? err : new Error('Erro desconhecido ao excluir produto')
    }
  },

  /**
   * Busca sabores associados ao produto
   */
  async buscarSaboresProduto(produtoId: string): Promise<SaborSupabase[]> {
    try {
      // Buscar IDs dos sabores associados
      const { data: produtoSabores, error: produtoSaboresError } = await supabase
        .from('produto_sabores')
        .select('sabor_id')
        .eq('produto_id', produtoId)

      if (produtoSaboresError) {
        console.error('Erro ao buscar associações produto-sabores:', produtoSaboresError)
        throw new Error(`Falha ao buscar associações: ${produtoSaboresError.message}`)
      }

      if (!produtoSabores || produtoSabores.length === 0) {
        return []
      }

      // Extrair IDs dos sabores
      const saborIds = produtoSabores.map(ps => ps.sabor_id)

      // Buscar sabores pelos IDs
      const { data: sabores, error: saboresError } = await supabase
        .from('sabores')
        .select('*')
        .in('id', saborIds)
        .eq('ativo', true)
        .order('nome', { ascending: true })

      if (saboresError) {
        console.error('Erro ao buscar sabores:', saboresError)
        throw new Error(`Falha ao buscar sabores: ${saboresError.message}`)
      }

      return sabores || []
    } catch (error) {
      console.error('Erro ao buscar sabores do produto:', error)
      throw error instanceof Error ? error : new Error('Erro desconhecido ao buscar sabores')
    }
  },

  /**
   * Associa sabores a um produto (remove associações antigas)
   */
  async associarSabores(produtoId: string, saborIds: string[]): Promise<void> {
    // Remover associações existentes
    await supabase
      .from('produto_sabores')
      .delete()
      .eq('produto_id', produtoId)

    // Criar novas associações
    if (saborIds.length > 0) {
      const associacoes = saborIds.map(saborId => comTenant({
        produto_id: produtoId,
        sabor_id: saborId
      }))

      const { error } = await supabase
        .from('produto_sabores')
        .insert(associacoes)

      if (error) {
        console.error('Erro ao associar sabores:', error)
        throw new Error(`Falha ao associar sabores: ${error.message}`)
      }
    }
  },

  /**
   * Remove imagens órfãs do storage
   */
  async limparImagensOrfas(): Promise<void> {
    try {
      // Buscar todos os arquivos no storage
      const { data: files, error: listError } = await supabase.storage
        .from('produtos-imagens')
        .list('produtos')

      if (listError) {
        console.error('Erro ao listar arquivos do storage:', listError)
        return
      }

      if (!files || files.length === 0) {
        return
      }

      // Buscar produtos ativos
      const produtos = await this.buscarTodos()
      const imagensEmUso = produtos
        .filter(p => p.imagem_path)
        .map(p => {
          const urlParts = p.imagem_path!.split('/')
          return urlParts[urlParts.length - 1]
        })

      // Encontrar arquivos órfãos
      const arquivosOrfaos = files
        .filter(file => !imagensEmUso.includes(file.name))
        .map(file => `produtos/${file.name}`)

      if (arquivosOrfaos.length > 0) {
        // Deletar arquivos órfãos
        const { error: deleteError } = await supabase.storage
          .from('produtos-imagens')
          .remove(arquivosOrfaos)

        if (deleteError) {
          console.error('Erro ao deletar imagens órfãs:', deleteError)
          throw new Error(`Falha ao deletar imagens órfãs: ${deleteError.message}`)
        }
      }
    } catch (err) {
      console.error('Erro ao limpar imagens órfãs:', err)
      throw err instanceof Error ? err : new Error('Erro desconhecido ao limpar imagens órfãs')
    }
  },

  /**
   * Remove duplicatas de stock_items para um produto específico
   * Mantém apenas o primeiro ativo, desativa os demais
   * @param produtoId - ID do produto
   * @returns Promise com quantidade de duplicatas removidas
   */
  async limparDuplicatasEstoque(produtoId: string): Promise<number> {
    try {
      console.log('🧹 Limpando duplicatas de estoque para:', produtoId)

      // Buscar TODOS os stock_items deste produto
      const { data: stocks, error: queryError } = await supabase
        .from('stock_items')
        .select('id, ativo, criado_em')
        .eq('product_id', produtoId)
        .order('criado_em', { ascending: true })

      if (queryError) {
        console.error('Erro ao buscar stock_items:', queryError)
        throw new Error(`Falha ao buscar stock_items: ${queryError.message}`)
      }

      if (!stocks || stocks.length <= 1) {
        console.log('ℹ️ Nenhuma duplicata encontrada')
        return 0
      }

      console.warn(`⚠️ Encontradas ${stocks.length} duplicatas para o produto`)

      // Desativar todos menos o primeiro
      const idsParaDesativar = stocks.slice(1).map(s => s.id)
      const { error: deleteError } = await supabase
        .from('stock_items')
        .update({ ativo: false })
        .in('id', idsParaDesativar)

      if (deleteError) {
        console.error('Erro ao desativar duplicatas:', deleteError)
        throw new Error(`Falha ao desativar duplicatas: ${deleteError.message}`)
      }

      console.log(`✅ ${idsParaDesativar.length} duplicatas desativadas`)
      return idsParaDesativar.length
    } catch (err) {
      console.error('Erro ao limpar duplicatas de estoque:', err)
      throw err instanceof Error ? err : new Error('Erro desconhecido ao limpar duplicatas')
    }
  }
}

/**
 * Exportar como default para facilitar importação
 */
export default produtoService
