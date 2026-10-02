import GridProdutos from './GridProdutos'
import type { Produto } from './ProdutoCard'

/**
 * Props do componente SecaoCategoria
 */
interface SecaoCategoriaProps {
  /** Nome da categoria */
  nomeCategoria: string
  /** Lista de produtos da categoria */
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
 * Seção de categoria com título e grid de produtos
 * Usado para agrupar produtos por categoria na visualização "Todos"
 * 
 * @example
 * <SecaoCategoria
 *   nomeCategoria="Pizzas"
 *   produtos={pizzas}
 *   getQuantidadeNoCarrinho={getQuantidadeNoCarrinho}
 *   onAdicionarProduto={adicionarAoCarrinho}
 *   onRemoverProduto={removerDoCarrinho}
 * />
 */
export default function SecaoCategoria({
  nomeCategoria,
  produtos,
  getQuantidadeNoCarrinho,
  onAdicionarProduto,
  onRemoverProduto,
  onAbrirDetalhes
}: SecaoCategoriaProps) {
  if (produtos.length === 0) {
    return null
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 text-foreground">
        {nomeCategoria}:
      </h3>
      <GridProdutos
        produtos={produtos}
        getQuantidadeNoCarrinho={getQuantidadeNoCarrinho}
        onAdicionarProduto={onAdicionarProduto}
        onRemoverProduto={onRemoverProduto}
        onAbrirDetalhes={onAbrirDetalhes}
      />
    </div>
  )
}
