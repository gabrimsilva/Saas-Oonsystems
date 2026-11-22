import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'

/** Remove acentos e caixa para comparar nomes ("Pão" casa com "pao") */
export function normalizarBusca(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

interface BuscaCatalogoProps {
  termo: string
  onTermoChange: (termo: string) => void
}

/** Busca por nome do produto no catálogo público (a categoria fica nos botões logo abaixo) */
export default function BuscaCatalogo({ termo, onTermoChange }: BuscaCatalogoProps) {
  return (
    <div className="relative mb-4">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
      <Input
        type="search"
        id="buscar-produto"
        name="buscar-produto"
        placeholder="Buscar produto pelo nome..."
        aria-label="Buscar produto pelo nome"
        className="pl-9 pr-9 bg-card h-10"
        value={termo}
        onChange={(e) => onTermoChange(e.target.value)}
      />
      {termo && (
        <button
          type="button"
          onClick={() => onTermoChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
          aria-label="Limpar busca"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
