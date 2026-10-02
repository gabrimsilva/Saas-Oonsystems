import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Package } from "lucide-react"
import { type ProdutoPDV } from "./types"

/**
 * Props para o componente GridProdutos
 */
interface GridProdutosProps {
  /** Lista de produtos a serem exibidos */
  produtos: ProdutoPDV[]
  /** Callback chamado quando um produto é adicionado ao carrinho */
  onAdicionarAoCarrinho: (produto: ProdutoPDV) => void
}

/**
 * Componente de grid de produtos para o PDV
 * 
 * Exibe produtos em um layout de grid responsivo com imagem,
 * nome, descrição, preço e botão de adicionar ao carrinho.
 * Suporta preços promocionais e fallback de imagem.
 * 
 * @example
 * ```tsx
 * <GridProdutos
 *   produtos={produtosFiltrados}
 *   onAdicionarAoCarrinho={adicionarAoCarrinho}
 * />
 * ```
 */
export default function GridProdutos({ produtos, onAdicionarAoCarrinho }: GridProdutosProps) {
  if (produtos.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p className="text-muted-foreground">Nenhum produto encontrado</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
      {produtos.map((produto) => (
        <Card key={produto.id} className="overflow-hidden hover:shadow-md transition-shadow py-0">
          <div className="aspect-square bg-muted/50 relative h-24 md:h-32 flex items-center justify-center overflow-hidden">
            <img
              src={produto.urlImagem}
              alt={produto.nome}
              className="w-full h-full object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/placeholder-food.svg';
              }}
            />
            {produto.precoPromocional && (
              <Badge className="absolute top-2 left-2 bg-destructive">
                Promoção
              </Badge>
            )}
          </div>
          <CardContent className="px-2 md:px-3 py-1 md:py-2">
            <h3 className="font-semibold text-xs mb-1 line-clamp-2">{produto.nome}</h3>
            <p className="text-xs text-muted-foreground mb-1 md:mb-2 line-clamp-1 hidden sm:block">{produto.descricao}</p>
            
            <div className="flex items-center justify-between">
              <div>
                {produto.precoPromocional ? (
                  <div className="flex flex-col">
                    <span className="font-bold text-[color:var(--price-color)] text-sm">
                      R$ {produto.precoPromocional.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-xs text-muted-foreground/70 line-through">
                      R$ {produto.preco.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                ) : (
                  <span className="font-bold text-[color:var(--price-color)] text-sm">
                    R$ {produto.preco.toFixed(2).replace('.', ',')}
                  </span>
                )}
              </div>
              
              <Button
                size="sm"
                onClick={() => onAdicionarAoCarrinho(produto)}
                className="h-6 w-6 md:h-8 md:w-8 p-0"
              >
                <Plus className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}