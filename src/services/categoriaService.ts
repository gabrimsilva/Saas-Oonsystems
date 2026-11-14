/**
 * Serviço para gerenciamento de categorias de produtos
 *
 * Este serviço encapsula todas as operações relacionadas a categorias,
 * fornecendo uma interface limpa e bem documentada.
 *
 * @module services/categoriaService
 */

import { supabase } from "@/lib/supabase"
import { comTenant, tenantId } from "./tenant"
import type { CategoriaSupabase } from '@/types/supabase'

/**
 * Interface do serviço de categorias
 */
export interface CategoriaService {
  /**
   * Busca todas as categorias (ativas e inativas)
   * @returns Promise com array de categorias
   */
  buscarTodas(): Promise<CategoriaSupabase[]>

  /**
   * Busca apenas categorias ativas
   * @returns Promise com array de categorias ativas
   */
  buscarAtivas(): Promise<CategoriaSupabase[]>

  /**
   * Busca uma categoria por ID
   * @param id - ID da categoria
   * @returns Promise com a categoria ou null
   */
  buscarPorId(id: string): Promise<CategoriaSupabase | null>

  /**
   * Cria uma nova categoria
   * @param data - Dados da categoria
   * @returns Promise com a categoria criada
   */
  criar(data: Omit<CategoriaSupabase, 'id' | 'criado_em' | 'atualizado_em'>): Promise<CategoriaSupabase>

  /**
   * Atualiza uma categoria existente
   * @param id - ID da categoria
   * @param data - Dados para atualizar
   * @returns Promise com a categoria atualizada
   */
  atualizar(id: string, data: Partial<CategoriaSupabase>): Promise<CategoriaSupabase>

  /**
   * Desativa uma categoria
   * @param id - ID da categoria
   */
  desativar(id: string): Promise<void>

  /**
   * Ativa uma categoria
   * @param id - ID da categoria
   */
  ativar(id: string): Promise<void>

  /**
   * Deleta uma categoria permanentemente
   * @param id - ID da categoria
   */
  deletar(id: string): Promise<void>

  /**
   * Reordena categorias
   * @param categorias - Array com IDs e novas ordens
   */
  reordenar(categorias: Array<{ id: string; ordem: number }>): Promise<void>

  /**
   * Conta todos os itens vinculados a uma categoria
   * @param categoriaId - ID da categoria
   * @returns Promise com contagem de itens
   */
  contarItensVinculados(categoriaId: string): Promise<{
    produtos: number
    total: number
  }>

  /**
   * Exclui uma categoria (alias para deletar)
   * @param id - ID da categoria
   */
  excluir(id: string): Promise<void>

  /**
   * Alterna o status ativo/inativo de uma categoria
   * @param id - ID da categoria
   * @returns Promise com a categoria atualizada
   */
  toggleAtiva(id: string): Promise<CategoriaSupabase>
}

/**
 * Implementação do serviço de categorias
 */
export const categoriaService: CategoriaService = {
  /**
   * Busca todas as categorias (ativas e inativas) ordenadas por ordem
   */
  async buscarTodas(): Promise<CategoriaSupabase[]> {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('estabelecimento_id', tenantId())
      .order('ordem', { ascending: true })

    if (error) {
      console.error('Erro ao buscar categorias:', error)
      throw new Error(`Falha ao buscar categorias: ${error.message}`)
    }

    return data || []
  },

  /**
   * Busca apenas categorias ativas ordenadas por ordem
   */
  async buscarAtivas(): Promise<CategoriaSupabase[]> {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('ativa', true)
      .eq('estabelecimento_id', tenantId())
      .order('ordem', { ascending: true })

    if (error) {
      console.error('Erro ao buscar categorias ativas:', error)
      throw new Error(`Falha ao buscar categorias ativas: ${error.message}`)
    }

    return data || []
  },

  /**
   * Busca uma categoria específica por ID
   */
  async buscarPorId(id: string): Promise<CategoriaSupabase | null> {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Não encontrado
        return null
      }
      console.error('Erro ao buscar categoria:', error)
      throw new Error(`Falha ao buscar categoria: ${error.message}`)
    }

    return data
  },

  /**
   * Cria uma nova categoria
   */
  async criar(data: Omit<CategoriaSupabase, 'id' | 'criado_em' | 'atualizado_em'>): Promise<CategoriaSupabase> {
    const { data: categoria, error } = await supabase
      .from('categorias')
      .insert([comTenant(data as Record<string, unknown>)])
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar categoria:', error)
      throw new Error(`Falha ao criar categoria: ${error.message}`)
    }

    if (!categoria) {
      throw new Error('Categoria não foi criada corretamente')
    }

    return categoria
  },

  /**
   * Atualiza dados de uma categoria
   */
  async atualizar(id: string, data: Partial<CategoriaSupabase>): Promise<CategoriaSupabase> {
    const { data: categoria, error } = await supabase
      .from('categorias')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar categoria:', error)
      throw new Error(`Falha ao atualizar categoria: ${error.message}`)
    }

    if (!categoria) {
      throw new Error('Categoria não encontrada')
    }

    return categoria
  },

  /**
   * Desativa uma categoria (soft delete)
   */
  async desativar(id: string): Promise<void> {
    const { error } = await supabase
      .from('categorias')
      .update({ ativa: false })
      .eq('id', id)

    if (error) {
      console.error('Erro ao desativar categoria:', error)
      throw new Error(`Falha ao desativar categoria: ${error.message}`)
    }
  },

  /**
   * Ativa uma categoria
   */
  async ativar(id: string): Promise<void> {
    const { error } = await supabase
      .from('categorias')
      .update({ ativa: true })
      .eq('id', id)

    if (error) {
      console.error('Erro ao ativar categoria:', error)
      throw new Error(`Falha ao ativar categoria: ${error.message}`)
    }
  },

  /**
   * Remove uma categoria permanentemente
   */
  async deletar(id: string): Promise<void> {
    const { error } = await supabase
      .from('categorias')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Erro ao deletar categoria:', error)
      throw new Error(`Falha ao deletar categoria: ${error.message}`)
    }
  },

  /**
   * Atualiza a ordem de múltiplas categorias de uma vez
   */
  async reordenar(categorias: Array<{ id: string; ordem: number }>): Promise<void> {
    // Usar transação para garantir que todas as atualizações sejam feitas juntas
    const promises = categorias.map(({ id, ordem }) =>
      supabase
        .from('categorias')
        .update({ ordem })
        .eq('id', id)
    )

    const results = await Promise.all(promises)

    // Verificar se alguma atualização falhou
    const errors = results.filter(r => r.error)
    if (errors.length > 0) {
      console.error('Erro ao reordenar categorias:', errors)
      throw new Error('Falha ao reordenar algumas categorias')
    }
  },

  /**
   * Conta todos os itens vinculados a uma categoria
   */
  async contarItensVinculados(categoriaId: string): Promise<{
    produtos: number
    total: number
  }> {
    const { count } = await supabase
      .from('produtos')
      .select('*', { count: 'exact', head: true })
      .eq('categoria_id', categoriaId)

    const produtos = count || 0
    return { produtos, total: produtos }
  },

  /**
   * Exclui uma categoria (alias para deletar)
   */
  async excluir(id: string): Promise<void> {
    return this.deletar(id)
  },

  /**
   * Alterna o status ativo/inativo de uma categoria
   */
  async toggleAtiva(id: string): Promise<CategoriaSupabase> {
    // Primeiro buscar o status atual
    const categoria = await this.buscarPorId(id)
    if (!categoria) {
      throw new Error('Categoria não encontrada')
    }

    // Atualizar com o status invertido
    return this.atualizar(id, { ativa: !categoria.ativa })
  }
}

/**
 * Exportar como default para facilitar importação
 */
export default categoriaService
