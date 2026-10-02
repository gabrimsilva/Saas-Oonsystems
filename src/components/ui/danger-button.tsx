import { Button, buttonVariants } from "@/components/ui/button"
import type { VariantProps } from "class-variance-authority"
import * as React from "react"

export interface DangerButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
  asChild?: boolean
}

/**
 * Botão para ações destrutivas (excluir, limpar, cancelar).
 * Usa a variante "destructive" por padrão, com estado de loading.
 */
export function DangerButton({ variant = "destructive", size = "default", ...props }: DangerButtonProps) {
  return <Button variant={variant} size={size} {...props} />
}
