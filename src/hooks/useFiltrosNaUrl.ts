import { useEffect } from 'react'
import { format, isValid, parse } from 'date-fns'

/**
 * Filtros de tela guardados na URL (?periodo=30&tipo=...): sobrevivem ao
 * recarregar a página e podem ser compartilhados por link.
 */

/** Lê um filtro da URL atual (no estado inicial do componente) */
export function lerFiltroUrl(nome: string): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get(nome)
}

/** Lê uma data no formato yyyy-MM-dd da URL */
export function lerDataUrl(nome: string): Date | null {
  const valor = lerFiltroUrl(nome)
  if (!valor) return null
  const data = parse(valor, 'yyyy-MM-dd', new Date())
  return isValid(data) ? data : null
}

export const dataParaUrl = (data: Date | null | undefined) => (data ? format(data, 'yyyy-MM-dd') : '')

/**
 * Mantém a URL igual aos filtros. Valores iguais ao padrão (ou vazios) saem
 * da URL. Usa replaceState para não encher o histórico do navegador.
 */
export function useFiltrosNaUrl(valores: Record<string, string>, padroes: Record<string, string> = {}) {
  const chave = JSON.stringify(valores)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    for (const [nome, valor] of Object.entries(valores)) {
      if (!valor || valor === padroes[nome]) params.delete(nome)
      else params.set(nome, valor)
    }
    const busca = params.toString()
    const url = `${window.location.pathname}${busca ? `?${busca}` : ''}${window.location.hash}`
    if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState(window.history.state, '', url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave])
}
