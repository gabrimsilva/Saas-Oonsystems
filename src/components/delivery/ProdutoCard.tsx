import { memo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Minus } from 'lucide-react'
import { googleAnalytics } from '@/services/googleAnalyticsService'

/**
 * Interface para representar um produto
 */
export interface Produto {
  id: string
  nome: string
  descricao: string
  preco: number
  precoPromocional?: number
  categoria: string
  urlImagem: string
  saboresDisponiveis: boolean
  quantidadeSabores: number
  estoqueDisponivel?: boolean // 🆕 Flag de disponibilidade
  quantidadeEstoque?: number  // 🆕 Quantidade em estoque
}

/**
 * Props do componente ProdutoCard
 */
interface ProdutoCardProps {
  /** Produto a ser exibido */
  produto: Produto
  /** Quantidade do produto no carrinho */
  quantidadeNoCarrinho: number
  /** Callback para adicionar produto ao carrinho */
  onAdicionar: (produto: Produto) => void
  /** Callback para remover produto do carrinho */
  onRemover: (produtoId: string) => void
  /** Callback para abrir modal de detalhes */
  onAbrirDetalhes?: (produto: Produto) => void
}

/**
 * Card de produto individual com controles de quantidade
 * Mostra preço promocional quando disponível
 *
 * Memoizado para evitar re-renderizações desnecessárias quando
 * as props não mudarem.
 *
 * @example
 * <ProdutoCard
 *   produto={produto}
 *   quantidadeNoCarrinho={2}
 *   onAdicionar={adicionarAoCarrinho}
 *   onRemover={removerDoCarrinho}
 * />
 */
function ProdutoCard({
  produto,
  quantidadeNoCarrinho,
  onAdicionar,
  onRemover,
  onAbrirDetalhes
}: ProdutoCardProps) {
  const precoExibicao = produto.precoPromocional && produto.precoPromocional > 0
    ? produto.precoPromocional
    : produto.preco

  const temPromocao = produto.precoPromocional && produto.precoPromocional > 0

  const handleCardClick = (e: React.MouseEvent) => {
    // Não abrir modal se clicar nos botões
    const target = e.target as HTMLElement
    if (target.closest('button')) return
    
    // Rastrear visualização do produto
    googleAnalytics.trackViewItem({
      id: produto.id,
      name: produto.nome,
      category: produto.categoria,
      price: precoExibicao,
    })
    
    if (onAbrirDetalhes) {
      onAbrirDetalhes(produto)
    }
  }

  return (
    <Card 
      className={`overflow-hidden hover:shadow-lg transition-all duration-300 border border-indigo-100 p-0 rounded-2xl ${!produto.estoqueDisponivel ? 'opacity-60' : ''}`}
      style={{ cursor: onAbrirDetalhes ? 'url(/pointer.png), pointer' : 'default' }}
      onClick={handleCardClick}
    >
      {/* Layout horizontal */}
      <div className="flex items-center relative">
        {/* Badge de Indisponível */}
        {!produto.estoqueDisponivel && (
          <div className="absolute top-2 left-2 z-10 bg-gradient-to-r from-red-500 to-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
            INDISPONÍVEL
          </div>
        )}
        
        {/* Imagem */}
        <div className="w-20 h-20 md:w-28 md:h-28 flex-shrink-0 m-3 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden">
          <img
            src={produto.urlImagem}
            alt={produto.nome}
            className={`w-full h-full object-contain ${!produto.estoqueDisponivel ? 'grayscale' : ''}`}
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

            {/* Subtítulo/categoria */}
            <p className="text-xs md:text-sm text-gray-400 mb-1 leading-tight">
              {produto.saboresDisponiveis
                ? `Até ${produto.quantidadeSabores || 1} sabores`
                : produto.categoria}
            </p>

            <p className="text-gray-500 text-xs md:text-sm mb-2 line-clamp-1 md:line-clamp-2 leading-tight">
              {produto.descricao}
            </p>
          </div>

          {/* Preço e controles */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {temPromocao ? (
                <>
                  <span className="text-base md:text-lg font-bold text-[color:var(--price-color-cliente)]">
                    R$ {precoExibicao.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-xs md:text-sm text-gray-400 line-through">
                    R$ {produto.preco.toFixed(2).replace('.', ',')}
                  </span>
                </>
              ) : (
                <span className="text-base md:text-lg font-bold text-[color:var(--price-color-cliente)]">
                  R$ {precoExibicao.toFixed(2).replace('.', ',')}
                </span>
              )}
            </div>

            {/* Controles de quantidade */}
            {!produto.estoqueDisponivel ? (
              <div className="text-xs text-indigo-600 font-semibold mr-3">
                Sem estoque
              </div>
            ) : quantidadeNoCarrinho === 0 ? (
              <Button
                size="sm"
                onClick={() => onAdicionar(produto)}
                className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 h-8 w-8 md:h-9 md:w-9 p-0 rounded-full mr-3 cursor-pointer shadow-md"
                aria-label="Adicionar ao carrinho"
              >
                <Plus className="h-4 w-4 md:h-4.5 md:w-4.5" />
              </Button>
            ) : (
              <div className="flex items-center gap-2 mr-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRemover(produto.id)}
                  className="h-8 w-8 md:h-9 md:w-9 p-0 rounded-full border-indigo-200 bg-indigo-50 hover:bg-indigo-100 cursor-pointer"
                  aria-label="Remover uma unidade"
                >
                  <Minus className="h-4 w-4 md:h-4.5 md:w-4.5 text-indigo-600" />
                </Button>
                <span className="font-bold min-w-[20px] md:min-w-[24px] text-center text-sm md:text-base text-indigo-700">
                  {quantidadeNoCarrinho}
                </span>
                <Button
                  size="sm"
                  onClick={() => onAdicionar(produto)}
                  className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 h-8 w-8 md:h-9 md:w-9 p-0 rounded-full cursor-pointer shadow-md"
                  aria-label="Adicionar uma unidade"
                >
                  <Plus className="h-4 w-4 md:h-4.5 md:w-4.5" />
                </Button>
              </div>
            )}
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
function areEqual(prevProps: ProdutoCardProps, nextProps: ProdutoCardProps) {
  return (
    prevProps.produto.id === nextProps.produto.id &&
    prevProps.produto.preco === nextProps.produto.preco &&
    prevProps.produto.precoPromocional === nextProps.produto.precoPromocional &&
    prevProps.quantidadeNoCarrinho === nextProps.quantidadeNoCarrinho &&
    prevProps.onAdicionar === nextProps.onAdicionar &&
    prevProps.onRemover === nextProps.onRemover &&
    prevProps.onAbrirDetalhes === nextProps.onAbrirDetalhes
  )
}

// Exportar componente memoizado para melhor performance
export default memo(ProdutoCard, areEqual)
