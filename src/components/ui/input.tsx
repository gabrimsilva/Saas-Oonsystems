import * as React from "react"

import { cn } from "@/lib/utils"
import { campoBase } from "./estilos"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        campoBase,
        "flex h-9 px-3 py-1",
        "file:mr-3 file:inline-flex file:h-7 file:border-0 file:rounded file:bg-muted file:px-2 file:text-xs file:font-medium file:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Input }
