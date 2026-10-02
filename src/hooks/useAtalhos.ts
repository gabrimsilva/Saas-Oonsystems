import { useEffect, useRef } from 'react'

/**
 * Atalhos de teclado de uma tela (ex.: { F2: buscar, F4: finalizar }).
 * Ficam desligados enquanto houver um modal aberto, para não disparar a
 * ação da tela por trás dele.
 */
export function useAtalhos(atalhos: Record<string, () => void>, ativo = true) {
  const ref = useRef(atalhos)
  ref.current = atalhos

  useEffect(() => {
    if (!ativo) return
    const aoTeclar = (e: KeyboardEvent) => {
      const acao = ref.current[e.key]
      if (!acao || e.ctrlKey || e.altKey || e.metaKey) return
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return
      e.preventDefault()
      acao()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [ativo])
}
