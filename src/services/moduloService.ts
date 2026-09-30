/**
 * Módulos por cliente (tenant).
 *
 * Cada cliente tem um conjunto de módulos ligados (tabela tenant_modulos).
 * No sistema do cliente, um módulo desligado some do menu e não abre nem pela
 * URL (as permissões de tela são cortadas aqui). Parte dos módulos também é
 * bloqueada no banco (políticas RLS restritivas).
 *
 * @module services/moduloService
 */

import { supabase } from '@/lib/supabase'
import type { Permissoes } from '@/hooks/usePermissoes'

export type CodigoModulo =
  | 'pdv'
  | 'comandas'
  | 'pedidos_online'
  | 'estoque'
  | 'metricas'

export interface Modulo {
  codigo: CodigoModulo
  nome: string
  descricao: string | null
  ordem: number
}

/** Permissões de tela que dependem de cada módulo. */
const PERMISSOES_DO_MODULO: Record<CodigoModulo, Array<keyof Permissoes>> = {
  pdv: ['podeAcessarPDV'],
  comandas: ['podeAcessarComandas', 'podeAcessarHistoricoComandas'],
  pedidos_online: ['podeAcessarPedidos', 'podeAcessarHistorico', 'podeAcessarAguardandoPagamento'],
  estoque: ['podeAcessarEstoque'],
  metricas: ['podeAcessarMetricas', 'podeAcessarAnalytics'],
}

/**
 * Recursos herdados que não são mais usados no sistema: ficam desligados para
 * todos os clientes e perfis (no banco, as gravações também são bloqueadas).
 */
const RECURSOS_DESATIVADOS: Array<keyof Permissoes> = ['podeAcessarSabores', 'podeAcessarAdicionais']

/**
 * Corta das permissões tudo o que pertence a módulos desligados e os
 * recursos desativados no sistema.
 * `ligados` null = módulos desconhecidos (não restringe).
 */
export function aplicarModulos(permissoes: Permissoes, ligados: string[] | null): Permissoes {
  const resultado = { ...permissoes }
  for (const chave of RECURSOS_DESATIVADOS) {
    ;(resultado as Record<string, unknown>)[chave] = false
  }
  if (!ligados) return resultado
  for (const [modulo, chaves] of Object.entries(PERMISSOES_DO_MODULO)) {
    if (!ligados.includes(modulo)) {
      for (const chave of chaves) {
        ;(resultado as Record<string, unknown>)[chave] = false
      }
    }
  }
  return resultado
}

export const moduloService = {
  /** Catálogo de módulos disponíveis. */
  async listarCatalogo(): Promise<Modulo[]> {
    const { data, error } = await supabase
      .from('modulos')
      .select('codigo, nome, descricao, ordem')
      .order('ordem')
    if (error) throw new Error(`Falha ao carregar módulos: ${error.message}`)
    return (data ?? []) as Modulo[]
  },

  /**
   * Módulos ligados do cliente do usuário logado (a RLS devolve só os dele).
   * Em caso de erro devolve null (não restringe a interface; os bloqueios
   * críticos estão no banco).
   */
  async meusModulos(): Promise<string[] | null> {
    const { data, error } = await supabase.from('tenant_modulos').select('modulo')
    if (error) {
      console.error('Erro ao carregar módulos do cliente:', error)
      return null
    }
    return (data ?? []).map((m) => m.modulo as string)
  },

  /** Módulos ligados de um cliente (uso da plataforma). */
  async modulosDoCliente(tenantId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('tenant_modulos')
      .select('modulo')
      .eq('tenant_id', tenantId)
    if (error) throw new Error(`Falha ao carregar módulos do cliente: ${error.message}`)
    return (data ?? []).map((m) => m.modulo as string)
  },

  /** Liga ou desliga um módulo de um cliente (uso da plataforma). */
  async definirModulo(tenantId: string, modulo: CodigoModulo, ligado: boolean): Promise<void> {
    const { error } = ligado
      ? await supabase.from('tenant_modulos').insert({ tenant_id: tenantId, modulo })
      : await supabase.from('tenant_modulos').delete().eq('tenant_id', tenantId).eq('modulo', modulo)
    if (error) throw new Error(`Falha ao ${ligado ? 'ligar' : 'desligar'} o módulo: ${error.message}`)
  },
}
