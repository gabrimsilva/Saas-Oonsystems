import type { TipoVenda } from "@/services/lojaOnlineService"
import { formatarReais } from "./precos"

interface SeletorModoVendaProps {
  modo: TipoVenda
  onMudar: (modo: TipoVenda) => void
  pedidoMinimoAtacado: number
}

/** Chave Varejo / Atacado do catálogo */
export default function SeletorModoVenda({ modo, onMudar, pedidoMinimoAtacado }: SeletorModoVendaProps) {
  const opcoes: Array<{ id: TipoVenda; titulo: string }> = [
    { id: "varejo", titulo: "Varejo" },
    { id: "atacado", titulo: "Atacado" },
  ]

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4">
      <div role="radiogroup" aria-label="Tipo de compra" className="inline-flex bg-card border border-primary/20 rounded-full p-1 shadow-sm self-start">
        {opcoes.map(o => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={modo === o.id}
            onClick={() => onMudar(o.id)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors cursor-pointer ${
              modo === o.id ? "bg-primary text-white shadow" : "text-foreground/80 hover:text-primary-hover"
            }`}
          >
            {o.titulo}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {modo === "atacado"
          ? pedidoMinimoAtacado > 0
            ? `Preços de atacado · pedido mínimo de ${formatarReais(pedidoMinimoAtacado)}`
            : "Preços de atacado"
          : "Compre a partir de 1 unidade"}
      </p>
    </div>
  )
}
