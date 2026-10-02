import ProdutoCard, { type Produto } from './ProdutoCard'

/**
 * Props do componente GridProdutos
 */
interface GridProdutosProps {
  /** Lista de produtos a serem exibidos */
  produtos: Produto[]
  /** Função para obter quantidade de um produto no carrinho */
  getQuantidadeNoCarrinho: (produtoId: string) => number
  /** Callback para adicionar produto ao carrinho */
  onAdicionarProduto: (produto: Produto) => void
  /** Callback para remover produto do carrinho */
  onRemoverProduto: (produtoId: string) => void
  /** Callback para abrir modal de detalhes */
  onAbrirDetalhes?: (produto: Produto) => void
}

/**
 * Grid responsivo de produtos
 * Usa o componente ProdutoCard para renderizar cada produto
 * 
 * Layout:
 * - Mobile: 1 coluna (lista vertical)
 * - Tablet: 2 colunas
 * - Desktop: 3 colunas
 * 
 * @example
 * <GridProdutos
 *   produtos={produtosFiltrados}
 *   getQuantidadeNoCarrinho={getQuantidadeNoCarrinho}
 *   onAdicionarProduto={adicionarAoCarrinho}
 *   onRemoverProduto={removerDoCarrinho}
 * />
 */
export default function GridProdutos({
  produtos,
  getQuantidadeNoCarrinho,
  onAdicionarProduto,
  onRemoverProduto,
  onAbrirDetalhes
}: GridProdutosProps) {
  if (produtos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum produto encontrado nesta categoria
      </div>
    )
  }

  return (
    <div className="space-y-2 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:space-y-0">
      {produtos.map((produto) => (
        <ProdutoCard
          key={produto.id}
          produto={produto}
          quantidadeNoCarrinho={getQuantidadeNoCarrinho(produto.id)}
          onAdicionar={onAdicionarProduto}
          onRemover={onRemoverProduto}
          onAbrirDetalhes={onAbrirDetalhes}
        />
      ))}
    </div>
  )
}
