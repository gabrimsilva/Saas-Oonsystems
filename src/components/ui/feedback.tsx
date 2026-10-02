/**
 * Componentes de feedback do design system: spinner, estado vazio, alerta
 * (cor + ícone + texto) e cabeçalho de página.
 */

import * as React from "react"
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Loader2, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

// ---------------------------------------------------------------- Spinner
export function Spinner({ className, rotulo = "Carregando" }: { className?: string; rotulo?: string }) {
  return (
    <Loader2 className={cn("size-5 animate-spin text-muted-foreground", className)} role="status" aria-label={rotulo} />
  )
}

/** Bloco de carregamento centralizado para áreas de conteúdo */
export function Carregando({ texto, className }: { texto?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted-foreground", className)}>
      <Spinner />
      {texto && <p>{texto}</p>}
    </div>
  )
}

/**
 * Esqueleto de página inteira enquanto os dados carregam, na forma
 * aproximada do conteúdo: tabela, grade de cartões, formulário ou painel.
 */
export function CarregandoPagina({
  variante = "tabela",
  className,
}: {
  variante?: "tabela" | "cartoes" | "formulario" | "painel"
  className?: string
}) {
  return (
    <div className={cn("space-y-6 p-4 sm:p-6", className)} role="status" aria-label="Carregando">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      {variante === "painel" && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        </>
      )}
      {variante === "tabela" && <TabelaCarregando />}
      {variante === "cartoes" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      )}
      {variante === "formulario" && (
        <div className="max-w-2xl space-y-5 rounded-xl border border-border bg-card p-6">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Esqueleto de tabela (cabeçalho + linhas) */
export function TabelaCarregando({ linhas = 6, colunas = 5, className }: { linhas?: number; colunas?: number; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-card", className)} aria-hidden="true">
      <div className="flex gap-4 border-b border-border bg-muted/40 px-4 py-3">
        {Array.from({ length: colunas }, (_, i) => <Skeleton key={i} className="h-3.5 flex-1" />)}
      </div>
      {Array.from({ length: linhas }, (_, l) => (
        <div key={l} className="flex items-center gap-4 border-b border-border px-4 py-3.5 last:border-0">
          {Array.from({ length: colunas }, (_, c) => (
            <Skeleton key={c} className={cn("h-4 flex-1", c === 0 && "flex-[2]")} />
          ))}
        </div>
      ))}
    </div>
  )
}

// ----------------------------------------------------------- Estado vazio
export function EstadoVazio({
  icone: Icone,
  titulo,
  descricao,
  acao,
  className,
}: {
  icone?: LucideIcon
  titulo: string
  descricao?: React.ReactNode
  acao?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-6 py-12 text-center", className)}>
      {Icone && (
        <div className="mb-1 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icone className="size-5" aria-hidden="true" />
        </div>
      )}
      <p className="text-sm font-semibold text-foreground">{titulo}</p>
      {descricao && <p className="max-w-sm text-sm text-muted-foreground">{descricao}</p>}
      {acao && <div className="mt-3">{acao}</div>}
    </div>
  )
}

// ----------------------------------------------------------------- Alerta
type TipoAlerta = "info" | "sucesso" | "atencao" | "erro"

const ALERTA: Record<TipoAlerta, { icone: LucideIcon; classe: string; iconeClasse: string }> = {
  info: { icone: Info, classe: "border-info/25 bg-info/5", iconeClasse: "text-info" },
  sucesso: { icone: CheckCircle2, classe: "border-success/25 bg-success/5", iconeClasse: "text-success" },
  atencao: { icone: AlertTriangle, classe: "border-warning/40 bg-warning/10", iconeClasse: "text-warning-foreground" },
  erro: { icone: AlertCircle, classe: "border-destructive/25 bg-destructive/5", iconeClasse: "text-destructive" },
}

export function Alerta({
  tipo = "info",
  titulo,
  children,
  acao,
  className,
}: {
  tipo?: TipoAlerta
  titulo?: string
  children?: React.ReactNode
  acao?: React.ReactNode
  className?: string
}) {
  const { icone: Icone, classe, iconeClasse } = ALERTA[tipo]
  return (
    <div
      role={tipo === "erro" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-lg border px-4 py-3 text-sm text-foreground", classe, className)}
    >
      <Icone className={cn("mt-0.5 size-4 shrink-0", iconeClasse)} aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-0.5">
        {titulo && <p className="font-semibold">{titulo}</p>}
        {children && <div className="text-foreground/80">{children}</div>}
      </div>
      {acao && <div className="shrink-0">{acao}</div>}
    </div>
  )
}

// ---------------------------------------------------- Cabeçalho de página
export function CabecalhoPagina({
  titulo,
  descricao,
  acoes,
  icone: Icone,
  className,
}: {
  titulo: string
  descricao?: React.ReactNode
  acoes?: React.ReactNode
  icone?: LucideIcon
  className?: string
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icone && (
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-xs">
            <Icone className="size-5" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{titulo}</h1>
          {descricao && <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>}
        </div>
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </div>
  )
}
