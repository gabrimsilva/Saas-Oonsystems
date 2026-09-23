import { memo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Eye } from 'lucide-react'

/**
 * Interface para representar um produto no catálogo
 */
export interface ProdutoCatalogo {
  id: string
  nome: string
  descricao: string
  preco: number
  precoPromocional?: number
  categoria: string
  urlImagem: string
  estoqueDisponivel?: boolean
  quantidadeEstoque?: number
  /** Indica se o produto tem controle de estoque ativado (toggle "Produto precisa de estoque") */
  requiresStock?: boolean
}

/**
 * Props do componente CatalogoProdutoCard
 */
interface CatalogoProdutoCardProps {
  /** Produto a ser exibido */
  produto: ProdutoCatalogo
  /** Callback para abrir modal de detalhes */
  onAbrirDetalhes: (produto: ProdutoCatalogo) => void
}

/**
 * Card de produto individual para catálogo
 * Mostra preço promocional quando disponível
 * Permite visualizar detalhes e entrar em contato via WhatsApp
 *
 * @example
 * <CatalogoProdutoCard
 *   produto={produto}
 *   onAbrirDetalhes={abrirDetalhes}
 * />
 */
function CatalogoProdutoCard({
  produto,
  onAbrirDetalhes
}: CatalogoProdutoCardProps) {
  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-all duration-300 border border-purple-100 p-0 rounded-2xl"
      style={{ cursor: 'url(/pointer.png), pointer' }}
      onClick={() => onAbrirDetalhes(produto)}
    >
      {/* Layout horizontal */}
      <div className="flex items-center relative">
        {/* Badge de Sem Estoque — só para produtos com controle de estoque ativado */}
        {produto.requiresStock && produto.quantidadeEstoque === 0 && (
          <div className="absolute top-2 left-2 z-10 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
            SEM ESTOQUE
          </div>
        )}

        {/* Badge de Indisponível — só para produtos com controle de estoque ativado */}
        {produto.requiresStock && !produto.estoqueDisponivel && produto.quantidadeEstoque !== 0 && (
          <div className="absolute top-2 left-2 z-10 bg-gradient-to-r from-red-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
            INDISPONÍVEL
          </div>
        )}
        
        {/* Imagem */}
        <div className="w-24 h-24 md:w-32 md:h-32 flex-shrink-0 m-3 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden">
          <img
            src={produto.urlImagem}
            alt={produto.nome}
            className="w-full h-full object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = '/placeholder-food.svg'
            }}
          />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 p-3 pl-0 flex flex-col justify-center">
          <div className="flex-1">
            <h3 className="font-bold text-base md:text-lg mb-0.5 text-gray-900 leading-tight">
              {produto.nome}
            </h3>

            {/* Categoria */}
            <p className="text-xs md:text-sm text-gray-400 mb-1 leading-tight capitalize">
              {produto.categoria}
            </p>

            <p className="text-gray-500 text-xs md:text-sm mb-2 line-clamp-1 md:line-clamp-2 leading-tight">
              {produto.descricao}
            </p>
          </div>

          {/* Preço e botão */}
          <div className="flex items-center justify-end">
            {/* Botão Ver Detalhes */}
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onAbrirDetalhes(produto)
              }}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-9 px-4 rounded-full mr-3 cursor-pointer shadow-md text-white flex items-center gap-2"
              aria-label="Ver detalhes"
            >
              <Eye className="h-4 w-4" />
              <span className="hidden md:inline text-sm">Ver detalhes</span>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

/**
 * Comparador customizado para React.memo
 * Só re-renderiza se as props relevantes mudarem
 */
function areEqual(prevProps: CatalogoProdutoCardProps, nextProps: CatalogoProdutoCardProps) {
  return (
    prevProps.produto.id === nextProps.produto.id &&
    prevProps.produto.preco === nextProps.produto.preco &&
    prevProps.produto.precoPromocional === nextProps.produto.precoPromocional &&
    prevProps.onAbrirDetalhes === nextProps.onAbrirDetalhes
  )
}

// Exportar componente memoizado para melhor performance
export default memo(CatalogoProdutoCard, areEqual)
