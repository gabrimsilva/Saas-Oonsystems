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
      <div role="radiogroup" aria-label="Tipo de compra" className="inline-flex bg-white border border-purple-200 rounded-full p-1 shadow-sm self-start">
        {opcoes.map(o => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={modo === o.id}
            onClick={() => onMudar(o.id)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors cursor-pointer ${
              modo === o.id ? "bg-purple-600 text-white shadow" : "text-gray-700 hover:text-purple-700"
            }`}
          >
            {o.titulo}
          </button>
        ))}
      </div>
      <p className="text-sm text-gray-600">
        {modo === "atacado"
          ? pedidoMinimoAtacado > 0
            ? `Preços de atacado · pedido mínimo de ${formatarReais(pedidoMinimoAtacado)}`
            : "Preços de atacado"
          : "Compre a partir de 1 unidade"}
      </p>
    </div>
  )
}
