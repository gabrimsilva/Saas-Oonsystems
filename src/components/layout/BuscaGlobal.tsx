/**
 * Busca global (Ctrl+K / ⌘K): encontra telas do sistema e produtos da loja
 * atual. Setas navegam, Enter abre, Esc fecha.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CornerDownLeft, Package, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { formatarMoeda } from '@/utils/formatacao'
import { produtoService } from '@/services/produtoService'
import { usePermissoes } from '@/hooks/usePermissoes'
import { useEstabelecimento } from '@/contexts/EstabelecimentoContext'
import type { ProdutoSupabase } from '@/types/supabase'
import { filtrarMenu, type ItemMenu } from './navegacao'

interface Resultado {
  chave: string
  tipo: 'Telas' | 'Produtos'
  titulo: string
  detalhe?: string
  icone: ItemMenu['icone']
  destino: string
}

const MAX_PRODUTOS = 8

/** Remove acentos e caixa para comparar textos */
export function normalizarBusca(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Abre a busca com Ctrl+K / ⌘K em qualquer tela do painel */
export function useAtalhoBusca(abrir: () => void) {
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        abrir()
      }
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [abrir])
}

export function BotaoBusca({ onClick, className }: { onClick: () => void; className?: string }) {
  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-9 w-full max-w-64 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground',
        className,
      )}
      aria-label="Buscar telas e produtos"
      aria-keyshortcuts="Control+K"
    >
      <Search className="size-4 shrink-0" aria-hidden="true" />
      <span className="flex-1 truncate text-left">Buscar…</span>
      <kbd className="hidden rounded border border-border bg-muted px-1.5 font-sans text-[11px] font-medium lg:inline">
        {mac ? '⌘' : 'Ctrl'} K
      </kbd>
    </button>
  )
}

export function BuscaGlobal({ aberto, onAbertoChange }: { aberto: boolean; onAbertoChange: (aberto: boolean) => void }) {
  const navigate = useNavigate()
  const { podeAcessarPagina } = usePermissoes()
  const { estabelecimentoAtual } = useEstabelecimento()
  const [termo, setTermo] = useState('')
  const [selecionado, setSelecionado] = useState(0)
  const [produtos, setProdutos] = useState<ProdutoSupabase[] | null>(null)
  const listaRef = useRef<HTMLUListElement>(null)

  const telas = useMemo<Resultado[]>(() => {
    const itens: Resultado[] = []
    for (const grupo of filtrarMenu(podeAcessarPagina)) {
      for (const item of grupo.itens) {
        if (!item.apenasGrupo) {
          itens.push({ chave: `tela-${item.id}`, tipo: 'Telas', titulo: item.titulo, detalhe: grupo.titulo, icone: item.icone, destino: `/sistema/${item.id}` })
        }
        for (const sub of item.submenu ?? []) {
          itens.push({ chave: `tela-${sub.id}`, tipo: 'Telas', titulo: sub.titulo, detalhe: item.titulo, icone: sub.icone, destino: `/sistema/${sub.id}` })
        }
      }
    }
    return itens
  }, [podeAcessarPagina])

  const podeVerProdutos = podeAcessarPagina('produtos')

  // Produtos: carrega ao abrir (uma vez por loja)
  useEffect(() => {
    setProdutos(null)
  }, [estabelecimentoAtual?.id])

  useEffect(() => {
    if (!aberto || !podeVerProdutos || produtos !== null) return
    let ativo = true
    produtoService
      .buscarTodos()
      .then((lista) => ativo && setProdutos(lista))
      .catch(() => ativo && setProdutos([]))
    return () => {
      ativo = false
    }
  }, [aberto, podeVerProdutos, produtos])

  const resultados = useMemo<Resultado[]>(() => {
    const busca = normalizarBusca(termo)
    const telasFiltradas = busca
      ? telas.filter((t) => normalizarBusca(`${t.titulo} ${t.detalhe ?? ''}`).includes(busca))
      : telas
    if (!busca || !produtos) return telasFiltradas
    const produtosFiltrados = produtos
      .filter((p) => normalizarBusca(`${p.nome} ${p.categoria_nome ?? ''}`).includes(busca))
      .slice(0, MAX_PRODUTOS)
      .map<Resultado>((p) => ({
        chave: `produto-${p.id}`,
        tipo: 'Produtos',
        titulo: p.nome,
        detalhe: [p.categoria_nome, formatarMoeda(p.preco)].filter(Boolean).join(' · '),
        icone: Package,
        destino: `/sistema/editar-produto/${p.id}`,
      }))
    return [...telasFiltradas, ...produtosFiltrados]
  }, [termo, telas, produtos])

  useEffect(() => setSelecionado(0), [termo])

  useEffect(() => {
    listaRef.current?.querySelector('[data-selecionado="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [selecionado])

  const fechar = useCallback(() => {
    onAbertoChange(false)
    setTermo('')
  }, [onAbertoChange])

  const abrirResultado = (r: Resultado) => {
    fechar()
    navigate(r.destino)
  }

  const aoTeclar = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelecionado((i) => Math.min(i + 1, resultados.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelecionado((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && resultados[selecionado]) {
      e.preventDefault()
      abrirResultado(resultados[selecionado])
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => (v ? onAbertoChange(true) : fechar())}>
      <DialogContent className="top-[15%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl [&>button:last-child]:hidden">
        <DialogTitle className="sr-only">Buscar</DialogTitle>
        <DialogDescription className="sr-only">Busque telas do sistema e produtos da loja</DialogDescription>
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            autoFocus
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            onKeyDown={aoTeclar}
            placeholder={podeVerProdutos ? 'Buscar telas e produtos…' : 'Buscar telas…'}
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            role="combobox"
            aria-expanded="true"
            aria-controls="busca-global-resultados"
            aria-activedescendant={resultados[selecionado] ? `busca-${resultados[selecionado].chave}` : undefined}
          />
          <kbd className="rounded border border-border bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">Esc</kbd>
        </div>

        <ul id="busca-global-resultados" ref={listaRef} role="listbox" className="max-h-[min(420px,60vh)] overflow-y-auto p-2">
          {resultados.length === 0 && (
            <li className="px-3 py-10 text-center text-sm text-muted-foreground">Nada encontrado para “{termo}”.</li>
          )}
          {resultados.map((r, i) => {
            const Icone = r.icone
            const novoGrupo = i === 0 || resultados[i - 1].tipo !== r.tipo
            return (
              <li key={r.chave} role="presentation">
                {novoGrupo && (
                  <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{r.tipo}</p>
                )}
                <button
                  type="button"
                  id={`busca-${r.chave}`}
                  role="option"
                  aria-selected={i === selecionado}
                  data-selecionado={i === selecionado}
                  onMouseMove={() => setSelecionado(i)}
                  onClick={() => abrirResultado(r)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm',
                    i === selecionado ? 'bg-accent text-foreground' : 'text-foreground/90',
                  )}
                >
                  <Icone className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{r.titulo}</span>
                  {r.detalhe && <span className="shrink-0 truncate text-xs text-muted-foreground">{r.detalhe}</span>}
                  {i === selecionado && <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />}
                </button>
              </li>
            )
          })}
        </ul>

        {podeVerProdutos && termo && produtos === null && (
          <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">Carregando produtos…</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
