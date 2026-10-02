import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Badge do design system.
 * Estados (success, warning, danger, info) devem vir com texto — e, quando
 * fizer sentido, ícone — para não depender só da cor.
 */
const badgeVariants = cva(
  "inline-flex items-center justify-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 [&>svg]:pointer-events-none focus-visible:ring-[3px] focus-visible:ring-ring/25 transition-colors overflow-hidden",
  {
    variants: {
      variant: {
        default: "border-primary/20 bg-primary/10 text-primary [a&]:hover:bg-primary/15",
        secondary: "border-border bg-muted text-foreground/80 [a&]:hover:bg-accent",
        destructive: "border-destructive/20 bg-destructive/10 text-destructive [a&]:hover:bg-destructive/15",
        outline: "border-border bg-card text-foreground [a&]:hover:bg-accent",
        success: "border-success/25 bg-success/10 text-success",
        warning: "border-warning/30 bg-warning/15 text-warning-foreground",
        info: "border-info/25 bg-info/10 text-info",
        solid: "border-transparent bg-primary text-primary-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
