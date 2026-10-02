/**
 * EstabelecimentoPublicoProvider — resolve o estabelecimento público pelo slug
 * da rota (fluxos públicos por prédio: /:slug, /:slug/checkout, /:slug/avaliar).
 *
 * Define o tenant ativo (setEstabelecimentoAtivo) para que os serviços de
 * catálogo já filtrem por estabelecimento e os inserts públicos (pedido,
 * cliente, avaliação) recebam o estabelecimento_id correto (Req 5.2, 11.x).
 *
 * @module contexts/EstabelecimentoPublicoContext
 */

import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { estabelecimentoService, setEstabelecimentoAtivo } from '@/services'
import type { Estabelecimento } from '@/types/estabelecimento'

interface PublicoContextType {
  estabelecimento: Estabelecimento | null
  loading: boolean
  erro: string | null
  /** Retorna o ID do estabelecimento público resolvido (não depende de context admin) */
  obterEstabelecimentoId: () => string | null
}

const PublicoContext = createContext<PublicoContextType>({
  estabelecimento: null,
  loading: true,
  erro: null,
  obterEstabelecimentoId: () => null,
})

export const useEstabelecimentoPublico = () => useContext(PublicoContext)

interface ProviderProps {
  slug: string | undefined
  children: ReactNode
}

export const EstabelecimentoPublicoProvider = ({ slug, children }: ProviderProps) => {
  const [estabelecimento, setEstab] = useState<Estabelecimento | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    const resolver = async () => {
      setLoading(true)
      setErro(null)
      try {
        let estab: Estabelecimento | null = null

        if (slug) {
          // Fluxo por slug (/:slug)
          estab = await estabelecimentoService.buscarPorSlug(slug)
        } else {
          // Rotas legadas sem slug (/checkout, /avaliar...): no SaaS há lojas
          // de vários clientes, então não se escolhe "o primeiro ativo".
          // Usa apenas o último estabelecimento usado neste navegador.
          let preferidoId: string | null = null
          try { preferidoId = localStorage.getItem('estabelecimento_atual_id') } catch { /* ignore */ }
          if (preferidoId) {
            const ativos = await estabelecimentoService.buscarAtivos()
            estab = ativos?.find((e) => e.id === preferidoId) ?? null
          }
        }

        if (cancelado) return

        if (!estab || !estab.ativo) {
          setErro('Estabelecimento não encontrado ou inativo.')
          setEstab(null)
          setEstabelecimentoAtivo(null)
          return
        }
        setEstab(estab)
        setEstabelecimentoAtivo(estab.id)
      } catch (e) {
        if (!cancelado) {
          setErro(e instanceof Error ? e.message : 'Erro ao carregar estabelecimento.')
          setEstabelecimentoAtivo(null)
        }
      } finally {
        if (!cancelado) setLoading(false)
      }
    }
    resolver()
    return () => { cancelado = true }
  }, [slug])

  // Aguarda a resolução do estabelecimento ANTES de renderizar a página pública.
  // Isso evita a condição de corrida em que o catálogo/checkout carrega dados
  // antes do tenant ativo ser definido (catálogo vazio / erro ao finalizar).
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground">Carregando…</p>
        </div>
      </div>
    )
  }

  if (erro || !estabelecimento) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 p-6">
        <div className="max-w-md w-full bg-card rounded-xl border border-border shadow-xs p-8 text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Estabelecimento indisponível</h2>
          <p className="text-muted-foreground">{erro || 'Não foi possível carregar o estabelecimento.'}</p>
        </div>
      </div>
    )
  }

  return (
    <PublicoContext.Provider value={{ 
      estabelecimento, 
      loading, 
      erro,
      obterEstabelecimentoId: () => estabelecimento?.id ?? null
    }}>
      {children}
    </PublicoContext.Provider>
  )
}
