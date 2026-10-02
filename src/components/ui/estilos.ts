/**
 * Classes compartilhadas do design system.
 *
 * Use `campoBase` em qualquer campo (input, select, textarea) que não use os
 * componentes prontos, para manter os mesmos estados em todo o sistema:
 * hover, foco, desabilitado, erro (aria-invalid) e sucesso (data-valid).
 */
export const campoBase = [
  "w-full min-w-0 rounded-md border border-input bg-card text-sm text-foreground shadow-xs",
  "placeholder:text-muted-foreground/80 selection:bg-primary/20",
  "transition-[color,border-color,box-shadow] duration-150 ease-out outline-none",
  "hover:border-border-strong",
  "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20",
  "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-80 disabled:hover:border-input",
  "aria-invalid:border-destructive aria-invalid:ring-destructive/15 aria-invalid:focus-visible:ring-destructive/20",
  "data-[valid=true]:border-success data-[valid=true]:focus-visible:ring-success/20",
].join(" ")

/** Texto de ajuda abaixo de um campo */
export const textoAjuda = "text-xs text-muted-foreground"

/** Mensagem de erro abaixo de um campo */
export const textoErro = "text-xs font-medium text-destructive"

/** Card clicável: resposta discreta no hover (sombra e borda), sem movimento */
export const cardInterativo =
  "cursor-pointer transition-[box-shadow,border-color,background-color] duration-200 hover:shadow-md hover:border-border-strong"
