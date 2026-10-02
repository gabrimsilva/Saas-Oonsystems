/**
 * SeletorEstabelecimento — controle de troca de estabelecimento no header.
 *
 * Administrador_Geral: lista estabelecimentos ativos ordenados por nome e
 * permite trocar. Demais perfis: exibe o estabelecimento vinculado em modo
 * somente leitura (Req 3.1, 3.2, 3.3, 3.4).
 *
 * @module components/estabelecimento/SeletorEstabelecimento
 */

import { useState } from 'react'
import { Building2, ChevronDown, Check, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { useEstabelecimento } from '@/contexts/EstabelecimentoContext'
import { corPersonalizada } from '@/utils/cor'

export default function SeletorEstabelecimento() {
  const {
    estabelecimentoAtual,
    estabelecimentosAutorizados,
    podeTrocar,
    trocarEstabelecimento,
    loading,
  } = useEstabelecimento()
  const [aberto, setAberto] = useState(false)
  const [trocando, setTrocando] = useState(false)

  const cor = corPersonalizada(estabelecimentoAtual?.cor_tema) ?? 'var(--primary)'

  const handleTrocar = async (id: string) => {
    if (id === estabelecimentoAtual?.id) {
      setAberto(false)
      return
    }
    try {
      setTrocando(true)
      await trocarEstabelecimento(id)
      setAberto(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao trocar de estabelecimento')
    } finally {
      setTrocando(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-9 items-center gap-2 rounded-md bg-muted px-3 animate-pulse">
        <Building2 className="size-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Carregando…</span>
      </div>
    )
  }

  // Perfis sem permissão de troca: somente leitura (Req 3.3)
  if (!podeTrocar) {
    return (
      <div
        className="flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-foreground"
        title="Você não tem permissão para trocar de estabelecimento"
      >
        <span className="size-2.5 shrink-0 rounded-full ring-2 ring-white" style={{ backgroundColor: cor }} aria-hidden="true" />
        <span className="max-w-[200px] truncate text-sm font-medium">
          {estabelecimentoAtual?.nome ?? 'Nenhum estabelecimento'}
        </span>
        <Lock className="size-3 text-muted-foreground" />
      </div>
    )
  }

  // Admin geral sem estabelecimentos ativos (Req 3.2)
  if (estabelecimentosAutorizados.length === 0) {
    return (
      <div className="flex h-9 items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3">
        <Building2 className="size-4 text-warning-foreground" />
        <span className="text-sm text-warning-foreground">Nenhum estabelecimento disponível</span>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        disabled={trocando}
        className="flex h-9 items-center gap-2 rounded-md border border-input bg-card px-3 text-foreground shadow-xs hover:bg-accent hover:border-border-strong disabled:opacity-60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        title="Trocar de estabelecimento"
      >
        <span className="size-2.5 shrink-0 rounded-full ring-2 ring-white" style={{ backgroundColor: cor }} aria-hidden="true" />
        <span className="max-w-[200px] truncate text-sm font-medium">
          {estabelecimentoAtual?.nome ?? 'Selecione'}
        </span>
        <ChevronDown className={`size-4 text-muted-foreground transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {aberto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          <div role="listbox" className="absolute right-0 z-50 mt-1.5 w-64 max-h-80 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-[0.98]">
            <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Estabelecimentos</p>
            {estabelecimentosAutorizados.map((e) => {
              const ativoSel = e.id === estabelecimentoAtual?.id
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => handleTrocar(e.id)}
                  role="option"
                  aria-selected={ativoSel}
                  className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm hover:bg-accent ${ativoSel ? 'bg-primary/5 font-medium text-foreground' : 'text-foreground/90'}`}
                >
                  <span
                    className="inline-block size-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: corPersonalizada(e.cor_tema) ?? 'var(--primary)' }}
                  />
                  <span className="flex-1 truncate">{e.nome}</span>
                  {ativoSel && <Check className="size-4 text-primary" />}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
