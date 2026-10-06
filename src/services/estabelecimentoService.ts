/**
 * Serviço de Estabelecimentos (multi-tenant)
 *
 * CRUD de estabelecimentos. Restrito a Administrador_Geral pela RLS (Req 1.6);
 * a UI também esconde as ações para outros perfis. Validações de nome, cor e
 * unicidade conforme Req 1.2, 1.3, 1.7, 1.8.
 *
 * @module services/estabelecimentoService
 */

import { supabase } from '@/lib/supabase'
import type { Estabelecimento } from '@/types/estabelecimento'

export type NovoEstabelecimento = {
  nome: string
  slug: string
  descricao?: string | null
  cor_tema: string
  ativo?: boolean
}

const HEX_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

/** Gera um slug a partir do nome (minúsculo, sem acentos, hifenizado). */
export function gerarSlug(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/** Valida os campos obrigatórios. Retorna mensagem de erro ou null se válido. */
export function validarEstabelecimento(dados: Partial<NovoEstabelecimento>): string | null {
  const nome = (dados.nome ?? '').trim()
  if (nome.length < 1 || nome.length > 100) {
    return 'O nome é obrigatório e deve ter entre 1 e 100 caracteres.'
  }
  if (dados.descricao && dados.descricao.length > 500) {
    return 'A descrição deve ter no máximo 500 caracteres.'
  }
  if (!dados.cor_tema || !HEX_REGEX.test(dados.cor_tema)) {
    return 'A cor de tema é obrigatória e deve estar em formato hexadecimal (ex: #2563EB).'
  }
  return null
}

export interface EstabelecimentoService {
  buscarTodos(): Promise<Estabelecimento[]>
  buscarAtivos(): Promise<Estabelecimento[]>
  buscarPorId(id: string): Promise<Estabelecimento | null>
  buscarPorSlug(slug: string): Promise<Estabelecimento | null>
  criar(dados: NovoEstabelecimento): Promise<Estabelecimento>
  atualizar(id: string, dados: Partial<NovoEstabelecimento>): Promise<Estabelecimento>
  definirAtivo(id: string, ativo: boolean): Promise<void>
}

export const estabelecimentoService: EstabelecimentoService = {
  async buscarTodos(): Promise<Estabelecimento[]> {
    const { data, error } = await supabase
      .from('estabelecimentos')
      .select('*')
      .order('nome', { ascending: true })
    if (error) {
      console.error('Erro ao buscar estabelecimentos:', error)
      throw new Error(`Falha ao buscar estabelecimentos: ${error.message}`)
    }
    return data || []
  },

  async buscarAtivos(): Promise<Estabelecimento[]> {
    const { data, error } = await supabase
      .from('estabelecimentos')
      .select('*')
      .eq('ativo', true)
      .order('nome', { ascending: true })
    if (error) {
      console.error('Erro ao buscar estabelecimentos ativos:', error)
      throw new Error(`Falha ao buscar estabelecimentos: ${error.message}`)
    }
    return data || []
  },

  async buscarPorId(id: string): Promise<Estabelecimento | null> {
    const { data, error } = await supabase
      .from('estabelecimentos')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) {
      console.error('Erro ao buscar estabelecimento:', error)
      throw new Error(`Falha ao buscar estabelecimento: ${error.message}`)
    }
    return data
  },

  async buscarPorSlug(slug: string): Promise<Estabelecimento | null> {
    const { data, error } = await supabase
      .from('estabelecimentos')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()
    if (error) {
      console.error('Erro ao buscar estabelecimento por slug:', error)
      throw new Error(`Falha ao buscar estabelecimento: ${error.message}`)
    }
    return data
  },

  async criar(dados: NovoEstabelecimento): Promise<Estabelecimento> {
    const erro = validarEstabelecimento(dados)
    if (erro) throw new Error(erro)

    const slug = dados.slug?.trim() || gerarSlug(dados.nome)
    const payload = {
      nome: dados.nome.trim(),
      slug,
      descricao: dados.descricao?.trim() || null,
      cor_tema: dados.cor_tema,
      ativo: dados.ativo ?? true,
    }

    const { data, error } = await supabase
      .from('estabelecimentos')
      .insert(payload)
      .select()
      .single()

    if (error) {
      // 23505 = unique_violation (nome ou slug duplicado) — Req 1.7
      if (error.code === '23505') {
        throw new Error('Já existe um estabelecimento com este nome ou identificador (slug).')
      }
      // Trigger fn_verificar_limite_plano: estabelecimentos acima do limite do plano
      if (error.message?.startsWith('Limite do plano')) {
        throw new Error(error.message)
      }
      console.error('Erro ao criar estabelecimento:', error)
      throw new Error(`Falha ao criar estabelecimento: ${error.message}`)
    }
    return data
  },

  async atualizar(id: string, dados: Partial<NovoEstabelecimento>): Promise<Estabelecimento> {
    // Validar apenas os campos enviados que tenham regra
    if (dados.nome !== undefined || dados.cor_tema !== undefined) {
      const erro = validarEstabelecimento({
        nome: dados.nome ?? 'x', // placeholder para não falhar quando só cor muda
        cor_tema: dados.cor_tema ?? '#000000',
        descricao: dados.descricao ?? null,
      })
      // Revalida especificamente os campos presentes
      if (dados.nome !== undefined && (dados.nome.trim().length < 1 || dados.nome.trim().length > 100)) {
        throw new Error('O nome deve ter entre 1 e 100 caracteres.')
      }
      if (dados.cor_tema !== undefined && !HEX_REGEX.test(dados.cor_tema)) {
        throw new Error('A cor de tema deve estar em formato hexadecimal (ex: #2563EB).')
      }
      if (dados.descricao && dados.descricao.length > 500) {
        throw new Error('A descrição deve ter no máximo 500 caracteres.')
      }
      void erro
    }

    const payload: Record<string, unknown> = {}
    if (dados.nome !== undefined) payload.nome = dados.nome.trim()
    if (dados.slug !== undefined) payload.slug = dados.slug.trim()
    if (dados.descricao !== undefined) payload.descricao = dados.descricao?.trim() || null
    if (dados.cor_tema !== undefined) payload.cor_tema = dados.cor_tema
    if (dados.ativo !== undefined) payload.ativo = dados.ativo

    const { data, error } = await supabase
      .from('estabelecimentos')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new Error('Já existe um estabelecimento com este nome ou identificador (slug).')
      }
      console.error('Erro ao atualizar estabelecimento:', error)
      throw new Error(`Falha ao atualizar estabelecimento: ${error.message}`)
    }
    return data
  },

  async definirAtivo(id: string, ativo: boolean): Promise<void> {
    const { error } = await supabase
      .from('estabelecimentos')
      .update({ ativo })
      .eq('id', id)
    if (error) {
      console.error('Erro ao alterar status do estabelecimento:', error)
      throw new Error(`Falha ao alterar status: ${error.message}`)
    }
  },
}

export default estabelecimentoService
