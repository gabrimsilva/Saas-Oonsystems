import { Button, buttonVariants } from "@/components/ui/button"
import type { VariantProps } from "class-variance-authority"
import * as React from "react"

export interface ActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Se true, mostra um spinner de loading */
  loading?: boolean
  /** Renderiza como um componente filho */
  asChild?: boolean
}

/**
 * Botão padrão para ações positivas do sistema (variante primária por padrão),
 * com estado de loading.
 */
export function ActionButton({ variant = "default", size = "default", ...props }: ActionButtonProps) {
  return <Button variant={variant} size={size} {...props} />
}
