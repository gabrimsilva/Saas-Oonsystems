/**
 * TemaClienteProvider — tema do painel escolhido pelo cliente (tenant).
 *
 * Lê `tenants.tema` (a RLS devolve só o cliente do usuário logado), aplica no
 * <html> como `data-tema` e permite trocar na hora (Configurações > Tema do
 * sistema). Vale só dentro do painel (/sistema): ao sair, o atributo é removido,
 * então o catálogo e a plataforma ficam com o tema padrão.
 *
 * O último tema fica no navegador só para evitar a troca visível de cor ao abrir
 * o painel; o valor que vale é sempre o do banco.
 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { aplicarTemaSistema, TEMA_PADRAO, temaValido, type IdTema } from '@/lib/temasSistema'

const CHAVE_CACHE = 'oonsystems_tema_painel'

function lerCache(): IdTema | null {
  try {
    const v = localStorage.getItem(CHAVE_CACHE)
    return temaValido(v) ? v : null
  } catch {
    return null
  }
}

function gravarCache(id: IdTema) {
  try {
    localStorage.setItem(CHAVE_CACHE, id)
  } catch {
    /* sem armazenamento: só não evita a troca visível */
  }
}

interface ContextoTema {
  tema: IdTema
  /** Grava o tema do cliente (só administrador geral) e aplica. */
  mudarTema: (id: IdTema) => Promise<void>
}

const TemaClienteContext = createContext<ContextoTema | null>(null)

export function TemaClienteProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<IdTema>(() => lerCache() ?? TEMA_PADRAO)

  // Aplica já com o cache e remove ao sair do painel
  useEffect(() => {
    aplicarTemaSistema(tema)
  }, [tema])
  useEffect(() => () => aplicarTemaSistema(null), [])

  useEffect(() => {
    let cancelado = false
    supabase
      .from('tenants')
      .select('tema')
      .maybeSingle()
      .then(({ data }) => {
        if (cancelado || !data) return
        const id = temaValido(data.tema) ? data.tema : TEMA_PADRAO
        setTema(id)
        gravarCache(id)
      })
    return () => {
      cancelado = true
    }
  }, [])

  const mudarTema = useCallback(async (id: IdTema) => {
    const { error } = await supabase.rpc('definir_tema_sistema', { p_tema: id })
    if (error) throw new Error(error.message)
    setTema(id)
    gravarCache(id)
  }, [])

  return <TemaClienteContext.Provider value={{ tema, mudarTema }}>{children}</TemaClienteContext.Provider>
}

export function useTemaCliente() {
  const ctx = useContext(TemaClienteContext)
  if (!ctx) throw new Error('useTemaCliente deve ser usado dentro de TemaClienteProvider')
  return ctx
}
