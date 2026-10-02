import { useCallback, useRef } from 'react'

/**
 * Tabela que vira lista de cartões no celular. Passe o ref para um elemento
 * que contenha a <table> e tenha a classe `tabela-responsiva`: cada célula
 * recebe o título da sua coluna (data-rotulo), que o CSS mostra à esquerda
 * do valor em telas pequenas. É um ref de callback, então funciona mesmo
 * quando a tabela só aparece depois do carregamento.
 */
export function useTabelaResponsiva<T extends HTMLElement = HTMLDivElement>() {
  const observador = useRef<MutationObserver | null>(null)

  return useCallback((raiz: T | null) => {
    observador.current?.disconnect()
    observador.current = null
    if (!raiz) return

    const rotular = () => {
      raiz.querySelectorAll('table').forEach((tabela) => {
        const titulos = Array.from(tabela.querySelectorAll('thead th')).map((th) => th.textContent?.trim() ?? '')
        tabela.querySelectorAll('tbody tr').forEach((tr) => {
          let coluna = 0
          Array.from(tr.children).forEach((celula) => {
            const td = celula as HTMLTableCellElement
            const rotulo = titulos[coluna] ?? ''
            if (td.dataset.rotulo !== rotulo) td.dataset.rotulo = rotulo
            coluna += td.colSpan || 1
          })
        })
      })
    }

    rotular()
    observador.current = new MutationObserver(rotular)
    observador.current.observe(raiz, { childList: true, subtree: true })
  }, [])
}
