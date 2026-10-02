import ComboCard from "./ComboCard"
import { type ComboSupabase } from "@/services"

interface CombosSectionProps {
  combos: ComboSupabase[]
  getQuantidadeNoCarrinho: (id: string) => number
  onAdicionarCombo: (combo: ComboSupabase) => void
  onRemoverCombo: (comboId: string) => void
}

export default function CombosSection({ 
  combos, 
  getQuantidadeNoCarrinho, 
  onAdicionarCombo, 
  onRemoverCombo 
}: CombosSectionProps) {
  if (combos.length === 0) return null

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 text-foreground">Combos:</h3>
      <div className="space-y-2 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:space-y-0">
        {combos.map((combo) => (
          <ComboCard
            key={combo.id}
            combo={combo}
            quantidadeNoCarrinho={getQuantidadeNoCarrinho(combo.id)}
            onAdicionar={onAdicionarCombo}
            onRemover={onRemoverCombo}
          />
        ))}
      </div>
    </div>
  )
}