import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus } from "lucide-react"
import { type ComboSupabase } from "@/services"

/**
 * Props para o componente GridCombos
 */
interface GridCombosProps {
  /** Lista de combos disponíveis */
  combos: ComboSupabase[]
  /** Callback chamado quando um combo é adicionado ao carrinho */
  onAdicionarCombo: (combo: ComboSupabase) => void
}

/**
 * Componente de grid de combos para o PDV
 * 
 * Exibe combos promocionais em um layout de grid responsivo,
 * mostrando o desconto, preço original e preço do combo.
 * Retorna null se não houver combos disponíveis.
 * 
 * @example
 * ```tsx
 * <GridCombos
 *   combos={combosAtivos}
 *   onAdicionarCombo={adicionarComboAoCarrinho}
 * />
 * ```
 */
function GridCombos({ combos, onAdicionarCombo }: GridCombosProps) {
  if (combos.length === 0) return null

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-4 text-foreground">Combos Disponíveis</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
        {combos.map((combo) => (
          <Card key={combo.id} className="overflow-hidden hover:shadow-md transition-shadow py-0">
            <div className="aspect-square bg-muted relative h-24 md:h-32">
              <img
                src={combo.url_imagem || '/placeholder-food.svg'}
                alt={combo.nome}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder-food.svg';
                }}
              />
              <Badge variant="solid" className="absolute top-2 left-2">
                -{combo.desconto.toFixed(0)}%
              </Badge>
            </div>
            <CardContent className="px-2 md:px-3 py-1 md:py-2">
              <h3 className="font-semibold text-xs mb-1 line-clamp-2">{combo.nome}</h3>
              <p className="text-xs text-muted-foreground mb-1 md:mb-2 line-clamp-1 hidden sm:block">{combo.descricao}</p>
              
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-bold text-[color:var(--price-color)] text-sm">
                    R$ {combo.preco_combo.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-xs text-muted-foreground/70 line-through">
                    R$ {combo.preco_original.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                
                <Button
                  size="sm"
                  onClick={() => onAdicionarCombo(combo)}
                  className="h-6 w-6 md:h-8 md:w-8 p-0"
                >
                  <Plus className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default GridCombos
