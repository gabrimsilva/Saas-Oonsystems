import { useEffect, useSyncExternalStore } from 'react'

/**
 * Tema do painel (claro, escuro ou o do sistema operacional). Vale só para as
 * telas internas: o catálogo e as páginas públicas continuam claros.
 */
export type PreferenciaTema = 'claro' | 'escuro' | 'sistema'

const CHAVE = 'oonsystems_tema'
const ouvintes = new Set<() => void>()

function lerPreferencia(): PreferenciaTema {
  try {
    const valor = localStorage.getItem(CHAVE)
    return valor === 'escuro' || valor === 'sistema' ? valor : 'claro'
  } catch {
    return 'claro'
  }
}

export function definirPreferenciaTema(tema: PreferenciaTema) {
  try {
    localStorage.setItem(CHAVE, tema)
  } catch {
    // sem armazenamento (navegação privada): vale só nesta sessão
  }
  ouvintes.forEach((ouvir) => ouvir())
}

function assinar(ouvir: () => void) {
  ouvintes.add(ouvir)
  return () => ouvintes.delete(ouvir)
}

export function usePreferenciaTema(): PreferenciaTema {
  return useSyncExternalStore(assinar, lerPreferencia, () => 'claro')
}

/** Aplica o tema escolhido enquanto o painel estiver aberto */
export function useAplicarTema() {
  const preferencia = usePreferenciaTema()

  useEffect(() => {
    const raiz = document.documentElement
    const midia = window.matchMedia('(prefers-color-scheme: dark)')
    const aplicar = () => {
      const escuro = preferencia === 'escuro' || (preferencia === 'sistema' && midia.matches)
      raiz.classList.toggle('dark', escuro)
      raiz.style.colorScheme = escuro ? 'dark' : ''
    }
    aplicar()
    midia.addEventListener('change', aplicar)
    return () => {
      midia.removeEventListener('change', aplicar)
      raiz.classList.remove('dark')
      raiz.style.colorScheme = ''
    }
  }, [preferencia])
}
