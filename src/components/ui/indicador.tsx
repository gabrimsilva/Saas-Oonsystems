/**
 * Cartão de indicador (KPI) do design system: fundo neutro, ícone em selo de
 * cor suave e valor em destaque. A cor fica no ícone e, quando faz sentido,
 * no valor — nunca no fundo do cartão.
 */

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TomIndicador = 'neutro' | 'primario' | 'sucesso' | 'atencao' | 'perigo' | 'info'

const TONS: Record<TomIndicador, { selo: string; valor: string }> = {
  neutro: { selo: 'bg-muted text-muted-foreground', valor: 'text-foreground' },
  primario: { selo: 'bg-primary/10 text-primary', valor: 'text-foreground' },
  sucesso: { selo: 'bg-success/10 text-success', valor: 'text-success' },
  atencao: { selo: 'bg-warning/15 text-warning-foreground', valor: 'text-foreground' },
  perigo: { selo: 'bg-destructive/10 text-destructive', valor: 'text-destructive' },
  info: { selo: 'bg-info/10 text-info', valor: 'text-foreground' },
}

export function CartaoIndicador({
  titulo,
  valor,
  descricao,
  icone: Icone,
  tom = 'neutro',
  colorirValor = false,
  ativo = false,
  onClick,
  children,
  className,
}: {
  titulo: string
  valor: ReactNode
  descricao?: ReactNode
  icone?: LucideIcon
  tom?: TomIndicador
  /** Usa a cor do tom também no valor (ex.: lucro, perdas) */
  colorirValor?: boolean
  /** Indicador selecionado (quando funciona como filtro) */
  ativo?: boolean
  onClick?: () => void
  children?: ReactNode
  className?: string
}) {
  const t = TONS[tom]
  const Raiz = onClick ? 'button' : 'div'
  return (
    <Raiz
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? ativo : undefined}
      className={cn(
        'flex w-full flex-col rounded-xl border bg-card p-4 text-left shadow-xs',
        ativo ? 'border-primary ring-1 ring-primary/30' : 'border-border',
        onClick && 'cursor-pointer transition-[box-shadow,border-color] duration-200 hover:border-border-strong hover:shadow-md',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{titulo}</p>
        {Icone && (
          <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', t.selo)} aria-hidden="true">
            <Icone className="size-4" />
          </span>
        )}
      </div>
      <p className={cn('mt-1 text-2xl font-semibold tracking-tight tabular-nums', colorirValor ? t.valor : 'text-foreground')}>
        {valor}
      </p>
      {descricao && <p className="mt-1 text-xs text-muted-foreground">{descricao}</p>}
      {children}
    </Raiz>
  )
}

/** Título de seção com ícone (substitui emojis em títulos) */
export function TituloSecao({ icone: Icone, children, acao }: { icone?: LucideIcon; children: ReactNode; acao?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {Icone && <Icone className="size-4" aria-hidden="true" />}
        {children}
      </h3>
      {acao}
    </div>
  )
}
