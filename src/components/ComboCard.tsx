import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Minus } from "lucide-react"
import { type ComboSupabase } from "@/services"

interface ComboCardProps {
  combo: ComboSupabase
  quantidadeNoCarrinho: number
  onAdicionar: (combo: ComboSupabase) => void
  onRemover: (comboId: string) => void
}

export default function ComboCard({ combo, quantidadeNoCarrinho, onAdicionar, onRemover }: ComboCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow border border-border p-0">
      <div className="flex items-center">
        {/* Imagem */}
        <div className="w-20 h-20 md:w-24 md:h-24 flex-shrink-0 m-3">
          <img
            src={combo.url_imagem || '/placeholder-food.svg'}
            alt={combo.nome}
            className="w-full h-full object-cover rounded-lg"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/placeholder-food.svg';
            }}
          />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 p-3 pl-0 flex flex-col justify-center">
          <div className="flex-1">
            <h3 className="font-bold text-base md:text-lg mb-0.5 text-foreground leading-tight">
              {combo.nome}
            </h3>
            <p className="text-xs md:text-sm text-muted-foreground/70 mb-1 leading-tight">
              Combo - Economize {combo.desconto.toFixed(1)}%
            </p>
            <p className="text-muted-foreground text-xs md:text-sm mb-2 line-clamp-1 md:line-clamp-2 leading-tight">
              {combo.descricao}
            </p>
          </div>

          {/* Preço e controles */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base md:text-lg font-bold text-[color:var(--price-color-cliente)]">
                R$ {combo.preco_combo.toFixed(2).replace('.', ',')}
              </span>
              <span className="text-xs md:text-sm text-muted-foreground/70 line-through">
                R$ {combo.preco_original.toFixed(2).replace('.', ',')}
              </span>
            </div>

            {quantidadeNoCarrinho === 0 ? (
              <Button
                size="sm"
                onClick={() => onAdicionar(combo)}
                className="bg-primary hover:bg-primary-hover h-7 w-7 md:h-8 md:w-8 p-0 rounded-full mr-3 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Button>
            ) : (
              <div className="flex items-center gap-1.5 mr-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRemover(combo.id)}
                  className="h-7 w-7 md:h-8 md:w-8 p-0 rounded-full border-input bg-muted cursor-pointer"
                >
                  <Minus className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </Button>
                <span className="font-bold min-w-[16px] md:min-w-[20px] text-center text-sm md:text-base">
                  {quantidadeNoCarrinho}
                </span>
                <Button
                  size="sm"
                  onClick={() => onAdicionar(combo)}
                  className="bg-primary hover:bg-primary-hover h-7 w-7 md:h-8 md:w-8 p-0 rounded-full cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
