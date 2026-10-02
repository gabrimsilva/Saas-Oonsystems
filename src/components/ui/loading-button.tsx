import * as React from "react"
import { Button, buttonVariants } from "@/components/ui/button"
import { type VariantProps } from "class-variance-authority"

export interface LoadingButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
  /** Texto exibido enquanto carrega (padrão: o próprio conteúdo) */
  loadingText?: string
  asChild?: boolean
}

/** Botão com estado de loading e texto opcional durante o carregamento. */
const LoadingButton = ({ children, loading = false, loadingText, ...props }: LoadingButtonProps) => (
  <Button loading={loading} {...props}>
    {loading ? loadingText || children : children}
  </Button>
)
LoadingButton.displayName = "LoadingButton"

export { LoadingButton }
