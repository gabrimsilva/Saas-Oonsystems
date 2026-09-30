/**
 * Helper centralizado de tenant (multi-estabelecimento)
 *
 * Mantém o identificador do Estabelecimento_Atual num store leve a nível de
 * módulo e oferece utilitários para injetar/filtrar `estabelecimento_id` nas
 * operações Supabase de forma consistente, reduzindo o risco de esquecer o
 * filtro em algum service (Req 5.2, 5.8).
 *
 * IMPORTANTE: a barreira real de segurança é a RLS no PostgreSQL. Este helper é
 * uma camada de conveniência/escopo de exibição. O `EstabelecimentoProvider`
 * é responsável por chamar `setEstabelecimentoAtivo` sempre que o
 * Estabelecimento_Atual mudar, mantendo este store sincronizado (Property 7).
 *
 * @module services/tenant
 */

import { supabase } from '@/lib/supabase'

/** Estabelecimento atualmente ativo na sessão (id) — null se nenhum selecionado. */
let estabelecimentoAtualId: string | null = null

/**
 * Define o estabelecimento ativo. Chamado pelo EstabelecimentoProvider em toda
 * inicialização e troca de estabelecimento.
 */
export function setEstabelecimentoAtivo(id: string | null): void {
  estabelecimentoAtualId = id
}

/**
 * Chave de localStorage separada por estabelecimento.
 *
 * No SaaS o mesmo navegador pode abrir lojas de clientes diferentes (e o
 * mesmo caixa pode trocar de estabelecimento): dados guardados no navegador
 * (carrinhos, telefone da loja) nunca podem ser compartilhados entre eles.
 */
export function chaveLocalDoEstabelecimento(base: string, estabelecimentoId: string | null = estabelecimentoAtualId): string {
  return `${base}:${estabelecimentoId ?? 'sem-estabelecimento'}`
}

/** Chave do carrinho do catálogo público (por loja). */
export const chaveCarrinhoPublico = (): string => chaveLocalDoEstabelecimento('carrinho')

/** Chave do telefone/WhatsApp da loja usado no catálogo (por loja). */
export const chaveTelefoneLoja = (): string => chaveLocalDoEstabelecimento('estabelecimento_telefone')

/** Retorna o id do estabelecimento ativo (ou null). */
export function getEstabelecimentoAtivo(): string | null {
  return estabelecimentoAtualId
}

/**
 * Retorna o id do estabelecimento ativo para uso direto em `.eq('estabelecimento_id', ...)`.
 * Quando não há estabelecimento ativo, retorna um UUID impossível, garantindo
 * que a consulta não retorne dados de nenhum estabelecimento (defesa de conveniência).
 */
const UUID_IMPOSSIVEL = '00000000-0000-0000-0000-000000000000'
export function tenantId(): string {
  return estabelecimentoAtualId ?? UUID_IMPOSSIVEL
}

/**
 * Erro lançado quando uma operação que exige escopo de estabelecimento é
 * realizada sem um Estabelecimento_Atual definido (Req 5.8).
 */
export class EstabelecimentoNaoSelecionadoError extends Error {
  constructor() {
    super('Nenhum estabelecimento selecionado. Selecione um estabelecimento antes de continuar.')
    this.name = 'EstabelecimentoNaoSelecionadoError'
  }
}

/**
 * Retorna um query builder de SELECT já filtrado pelo estabelecimento ativo.
 * Quando não há estabelecimento ativo, aplica um filtro impossível para evitar
 * leitura acidental fora de escopo no frontend (a RLS já garante isolamento,
 * mas mantemos a coerência da camada de conveniência).
 *
 * @param tabela nome da tabela de domínio
 * @param colunas projeção (default '*')
 */
export function fromTenant(tabela: string, colunas: string = '*') {
  const query = supabase.from(tabela).select(colunas)
  if (estabelecimentoAtualId) {
    return query.eq('estabelecimento_id', estabelecimentoAtualId)
  }
  // Sem estabelecimento ativo: não retornar nada (defesa de conveniência).
  return query.eq('estabelecimento_id', '00000000-0000-0000-0000-000000000000')
}

/**
 * Aplica o filtro de estabelecimento ativo a um query builder existente
 * (útil quando o service precisa de um SELECT customizado).
 */
export function aplicarFiltroTenant<T>(query: T): T {
  if (estabelecimentoAtualId) {
    // @ts-expect-error - encadeamento dinâmico do PostgREST builder
    return query.eq('estabelecimento_id', estabelecimentoAtualId)
  }
  // @ts-expect-error - encadeamento dinâmico do PostgREST builder
  return query.eq('estabelecimento_id', '00000000-0000-0000-0000-000000000000')
}

/**
 * Injeta `estabelecimento_id` num payload de INSERT/UPDATE.
 * Lança EstabelecimentoNaoSelecionadoError se não houver estabelecimento ativo
 * (Req 5.8 — Property 3).
 *
 * @example
 * await supabase.from('produtos').insert(comTenant({ nome, preco }))
 */
export function comTenant<T extends Record<string, unknown>>(payload: T): T & { estabelecimento_id: string } {
  if (!estabelecimentoAtualId) {
    throw new EstabelecimentoNaoSelecionadoError()
  }
  return { ...payload, estabelecimento_id: estabelecimentoAtualId }
}

/**
 * Variante para múltiplos registros (insert em lote).
 */
export function comTenantLote<T extends Record<string, unknown>>(
  payloads: T[]
): (T & { estabelecimento_id: string })[] {
  if (!estabelecimentoAtualId) {
    throw new EstabelecimentoNaoSelecionadoError()
  }
  const id = estabelecimentoAtualId
  return payloads.map((p) => ({ ...p, estabelecimento_id: id }))
}
