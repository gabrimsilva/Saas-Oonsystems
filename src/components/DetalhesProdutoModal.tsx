import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog"
import { X } from "lucide-react"
import type { Produto } from "@/components/delivery/ProdutoCard"

interface DetalhesProdutoModalProps {
  isOpen: boolean
  onClose: () => void
  produto: Produto | null
  onAdicionar: (produto: Produto) => void
}

export default function DetalhesProdutoModal({
  isOpen,
  onClose,
  produto,
  onAdicionar
}: DetalhesProdutoModalProps) {
  if (!produto) return null

  const precoExibicao = produto.precoPromocional && produto.precoPromocional > 0
    ? produto.precoPromocional
    : produto.preco

  const temPromocao = produto.precoPromocional && produto.precoPromocional > 0

  const handleAdicionar = () => {
    onAdicionar(produto)
    onClose()
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="w-[525px] max-w-[calc(100%-2rem)] max-h-[85vh] p-0 overflow-hidden flex flex-col">
        {/* Botão fechar */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-1.5 hover:bg-white transition-colors shadow-md cursor-pointer"
          aria-label="Fechar"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Imagem do produto */}
        <div className="w-full h-44 bg-muted/50 max-md:h-[30vh] max-md:flex-shrink-0 flex items-center justify-center">
          <img
            src={produto.urlImagem}
            alt={produto.nome}
            className="w-full h-full object-contain p-2"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = '/placeholder-food.svg'
            }}
          />
        </div>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto p-4 max-md:flex max-md:flex-col">
          <AlertDialogHeader className="space-y-2 text-left">
            <AlertDialogTitle className="text-lg font-bold text-foreground">
              {produto.nome}
            </AlertDialogTitle>
            
            {produto.saboresDisponiveis && (
              <p className="text-xs text-muted-foreground">
                Até {produto.quantidadeSabores || 1} sabores
              </p>
            )}

            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              {produto.descricao}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Preço */}
          <div className="mt-4 mb-4 text-left">
            {temPromocao ? (
              <div className="flex items-center justify-start gap-2">
                <span className="text-2xl font-bold text-[color:var(--price-color-cliente)]">
                  R$ {precoExibicao.toFixed(2).replace('.', ',')}
                </span>
                <span className="text-sm text-muted-foreground/70 line-through">
                  R$ {produto.preco.toFixed(2).replace('.', ',')}
                </span>
                <span className="bg-destructive/10 text-destructive text-xs font-semibold px-2 py-0.5 rounded">
                  {Math.round(((produto.preco - precoExibicao) / produto.preco) * 100)}% OFF
                </span>
              </div>
            ) : (
              <span className="text-2xl font-bold text-[color:var(--price-color-cliente)]">
                R$ {precoExibicao.toFixed(2).replace('.', ',')}
              </span>
            )}
          </div>

          {/* Botão adicionar */}
          <AlertDialogFooter className="sm:justify-center mt-4">
            <Button
              onClick={handleAdicionar}
              className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-5 text-base cursor-pointer"
            >
              Adicionar ao carrinho
            </Button>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
