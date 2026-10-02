/**
 * Menu de navegação do sistema (desktop e celular).
 * Grupos, item ativo com destaque, submenus e modo recolhido com tooltips.
 */

import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { ramoAtivo, itemAtivo, type GrupoMenu, type ItemMenu } from './navegacao'

interface MenuLateralProps {
  grupos: GrupoMenu[]
  paginaAtual: string
  onNavegar: (pagina: string) => void
  /** Só ícones, com tooltip (desktop recolhido) */
  recolhido?: boolean
}

function ComTooltip({ ativo, rotulo, children }: { ativo: boolean; rotulo: string; children: React.ReactElement }) {
  if (!ativo) return children
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>{rotulo}</TooltipContent>
    </Tooltip>
  )
}

export default function MenuLateral({ grupos, paginaAtual, onNavegar, recolhido = false }: MenuLateralProps) {
  const [abertos, setAbertos] = useState<Record<string, boolean>>({})

  // Abre automaticamente o submenu da página atual
  useEffect(() => {
    const ativos: Record<string, boolean> = {}
    for (const g of grupos) for (const item of g.itens) {
      if (item.submenu?.length && ramoAtivo(item, paginaAtual)) ativos[item.id] = true
    }
    setAbertos((prev) => (Object.keys(ativos).some((k) => !prev[k]) ? { ...prev, ...ativos } : prev))
  }, [paginaAtual, grupos])

  const alternar = (id: string) => setAbertos((prev) => ({ ...prev, [id]: !prev[id] }))

  const classeItem = (ativo: boolean, filho = false) =>
    cn(
      'group relative flex w-full items-center gap-3 rounded-md text-sm transition-colors duration-150',
      filho ? 'h-8 pl-9 pr-2' : 'h-9 px-3',
      recolhido && !filho && 'justify-center px-0',
      ativo
        ? 'bg-primary/10 font-semibold text-primary'
        : 'font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
    )

  const renderItem = (item: ItemMenu) => {
    const temSub = (item.submenu?.length ?? 0) > 0
    const ativoProprio = !item.apenasGrupo && itemAtivo(item.id, paginaAtual)
    const ramo = ramoAtivo(item, paginaAtual)
    const aberto = !!abertos[item.id] && !recolhido
    const Icone = item.icone

    // Grupo sem página própria (Configurações): abre o submenu; recolhido, vai ao 1º subitem
    const clicar = () => {
      if (!item.apenasGrupo) onNavegar(item.id)
      else if (recolhido) onNavegar(item.submenu![0].id)
      else alternar(item.id)
    }

    return (
      <li key={item.id}>
        <div className="relative">
          <ComTooltip ativo={recolhido} rotulo={item.titulo}>
            <button
              type="button"
              onClick={clicar}
              aria-current={ativoProprio ? 'page' : undefined}
              aria-expanded={temSub && !recolhido ? aberto : undefined}
              className={cn(
                classeItem(ativoProprio || (recolhido && ramo)),
                !ativoProprio && ramo && !recolhido && 'text-foreground',
                temSub && !recolhido && 'pr-9',
              )}
            >
              {(ativoProprio || (recolhido && ramo)) && (
                <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-primary" aria-hidden="true" />
              )}
              <Icone className={cn('size-[18px] shrink-0', ativoProprio || (recolhido && ramo) ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
              {!recolhido && <span className="truncate">{item.titulo}</span>}
            </button>
          </ComTooltip>

          {temSub && !recolhido && (
            <button
              type="button"
              onClick={() => alternar(item.id)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-border/60 hover:text-foreground"
              aria-label={`${aberto ? 'Recolher' : 'Expandir'} ${item.titulo}`}
              aria-expanded={aberto}
            >
              <ChevronDown className={cn('size-4 transition-transform duration-200', !aberto && '-rotate-90')} />
            </button>
          )}
        </div>

        {temSub && aberto && (
          <ul className="relative mt-0.5 space-y-0.5 before:absolute before:inset-y-1 before:left-[21px] before:w-px before:bg-border">
            {item.submenu!.map((sub) => {
              const ativo = itemAtivo(sub.id, paginaAtual)
              return (
                <li key={sub.id}>
                  <button
                    type="button"
                    onClick={() => onNavegar(sub.id)}
                    aria-current={ativo ? 'page' : undefined}
                    className={classeItem(ativo, true)}
                  >
                    <span className="truncate">{sub.titulo}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </li>
    )
  }

  return (
    <nav aria-label="Menu principal" className="space-y-5">
      {grupos.map((grupo) => (
        <div key={grupo.titulo}>
          {recolhido ? (
            <div className="mx-auto mb-2 h-px w-6 bg-border" aria-hidden="true" />
          ) : (
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              {grupo.titulo}
            </p>
          )}
          <ul className="space-y-0.5">{grupo.itens.map(renderItem)}</ul>
        </div>
      ))}
    </nav>
  )
}
