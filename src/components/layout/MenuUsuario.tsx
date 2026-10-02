/**
 * Área do usuário no topo: avatar com iniciais e menu (perfil, catálogo, sair).
 */

import { useState } from 'react'
import { ChevronDown, ExternalLink, LogOut, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import { definirPreferenciaTema, usePreferenciaTema, type PreferenciaTema } from '@/hooks/useTema'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useEstabelecimento } from '@/contexts/EstabelecimentoContext'
import { cn } from '@/lib/utils'

const ROTULO_PERFIL: Record<string, string> = {
  administrador_geral: 'Administrador geral',
  administrador_estabelecimento: 'Administrador',
  operador: 'Operador',
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  return (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase()
}

export function Avatar({ nome, className }: { nome: string; className?: string }) {
  return (
    <span
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary',
        className,
      )}
      aria-hidden="true"
    >
      {iniciais(nome)}
    </span>
  )
}

const OPCOES_TEMA: Array<{ valor: PreferenciaTema; rotulo: string; icone: LucideIcon }> = [
  { valor: 'claro', rotulo: 'Claro', icone: Sun },
  { valor: 'escuro', rotulo: 'Escuro', icone: Moon },
  { valor: 'sistema', rotulo: 'Sistema', icone: Monitor },
]

function SeletorTema() {
  const atual = usePreferenciaTema()
  return (
    <div className="px-2.5 py-2">
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">Tema</p>
      <div className="grid grid-cols-3 gap-1 rounded-md bg-muted p-0.5" role="radiogroup" aria-label="Tema">
        {OPCOES_TEMA.map(({ valor, rotulo, icone: Icone }) => (
          <button
            key={valor}
            type="button"
            role="radio"
            aria-checked={atual === valor}
            onClick={() => definirPreferenciaTema(valor)}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors',
              atual === valor ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icone className="size-3.5" aria-hidden="true" />
            {rotulo}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function MenuUsuario({ onSair }: { onSair?: () => void }) {
  const { usuario, estabelecimentoAtual } = useEstabelecimento()
  const [aberto, setAberto] = useState(false)
  const nome = usuario?.nome || usuario?.email || 'Usuário'

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
          aria-label="Menu do usuário"
        >
          <Avatar nome={nome} />
          <span className="hidden max-w-[160px] text-left leading-tight lg:block">
            <span className="block truncate text-sm font-medium text-foreground">{nome}</span>
            {usuario?.perfil && (
              <span className="block truncate text-xs text-muted-foreground">{ROTULO_PERFIL[usuario.perfil] ?? usuario.perfil}</span>
            )}
          </span>
          <ChevronDown className="hidden size-4 text-muted-foreground lg:block" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-1.5">
        <div className="flex items-center gap-3 px-2.5 py-2">
          <Avatar nome={nome} className="size-9" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{nome}</p>
            {usuario?.email && <p className="truncate text-xs text-muted-foreground">{usuario.email}</p>}
          </div>
        </div>
        <div className="my-1 h-px bg-border" />
        <SeletorTema />
        <div className="my-1 h-px bg-border" />
        {estabelecimentoAtual?.slug && (
          <a
            href={`/${estabelecimentoAtual.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setAberto(false)}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-foreground hover:bg-accent"
          >
            <ExternalLink className="size-4 text-muted-foreground" /> Ver catálogo da loja
          </a>
        )}
        {onSair && (
          <button
            type="button"
            onClick={() => { setAberto(false); onSair() }}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-destructive hover:bg-destructive/5"
          >
            <LogOut className="size-4" /> Sair
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}
