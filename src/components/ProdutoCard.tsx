import { Button } from "@/components/ui/button"
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog"
import { Package, Edit, Trash2 } from "lucide-react"
import { type ProdutoSupabase } from "@/services"

interface Produto extends ProdutoSupabase {
  categoria: string // Alias para categoria_nome
  urlImagem: string // Alias para url_imagem
  precoPromocional?: number // Alias para preco_promocional
  saboresDisponiveis?: boolean // Alias para sabores_disponiveis
  quantidadeSabores?: number // Alias para quantidade_sabores
  saboresSelecionados?: string[] // Para compatibilidade
}

interface ProdutoCardProps {
  produto: Produto
  onEditar: (produto: Produto) => void
  onExcluir: (produto: Produto) => void
}

const getCategoriaColor = (categoria: string) => {
  const colors = {
    pizza: 'bg-red-100 text-red-800',
    lanche: 'bg-green-100 text-green-800',
    bebida: 'bg-indigo-100 text-indigo-800',
    combo: 'bg-purple-100 text-purple-800'
  }
  return colors[categoria as keyof typeof colors] || 'bg-gray-100 text-gray-800'
}

export default function ProdutoCard({ produto, onEditar, onExcluir }: ProdutoCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Layout Desktop */}
      <div className="hidden md:flex p-4 gap-4 items-center">
        {/* Imagem do produto */}
        <div className="relative w-20 h-20 flex-shrink-0 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden">
          {produto.urlImagem ? (
            <img 
              src={produto.urlImagem} 
              alt={produto.nome}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-8 w-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Conteúdo do card */}
        <div className="flex-1 min-w-0">
          {/* Cabeçalho com nome, badge e botões */}
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate" title={produto.nome}>
                {produto.nome}
              </h3>
              <div className="flex gap-1 flex-shrink-0">
                <span className={`text-xs font-medium px-2 py-1 rounded ${getCategoriaColor(produto.categoria)}`}>
                  {produto.categoria.charAt(0).toUpperCase() + produto.categoria.slice(1)}
                </span>
                {produto.precoPromocional && produto.precoPromocional > 0 && (
                  <span className="text-xs font-medium px-2 py-1 rounded bg-yellow-100 text-yellow-800">
                    Promoção
                  </span>
                )}
              </div>
            </div>
            
            {/* Botões de ação Desktop */}
            <div className="flex space-x-1 flex-shrink-0 ml-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onEditar(produto)}
                className="h-8 w-8 p-0"
              >
                <Edit className="h-3 w-3" />
              </Button>
              <ConfirmDeleteDialog
                trigger={
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                }
                title="Confirmar Exclusão"
                description={`Tem certeza que deseja excluir o produto "${produto.nome}"? Esta ação não pode ser desfeita.`}
                onConfirm={() => onExcluir(produto)}
              />
            </div>
          </div>

          {/* Informações adicionais */}
          {produto.saboresDisponiveis && produto.quantidadeSabores && (
            <p className="text-sm text-muted-foreground mb-1">
              Até {produto.quantidadeSabores} sabor{produto.quantidadeSabores > 1 ? 'es' : ''}
            </p>
          )}
          
          {/* Descrição */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-1" title={produto.descricao}>
            {produto.descricao}
          </p>

          {/* Preço */}
          <div className="flex items-center gap-2">
            {produto.precoPromocional ? (
              <>
                <span className="text-lg font-bold text-[color:var(--price-color)]">
                  R$ {produto.precoPromocional.toFixed(2).replace('.', ',')}
                </span>
                <span className="text-sm text-gray-500 line-through">
                  R$ {produto.preco.toFixed(2).replace('.', ',')}
                </span>
              </>
            ) : (
              <span className="text-lg font-bold text-[color:var(--price-color)]">
                R$ {produto.preco.toFixed(2).replace('.', ',')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Layout Mobile */}
      <div className="md:hidden">
        {/* Imagem do produto */}
        <div className="relative h-32 bg-gray-50 flex items-center justify-center overflow-hidden">
          {produto.urlImagem ? (
            <img 
              src={produto.urlImagem} 
              alt={produto.nome}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-8 w-8 text-gray-400" />
            </div>
          )}
          
          {/* Badge da categoria */}
          <div className="absolute top-2 left-2 flex gap-1">
            <span className={`text-xs font-medium px-2 py-1 rounded ${getCategoriaColor(produto.categoria)}`}>
              {produto.categoria.charAt(0).toUpperCase() + produto.categoria.slice(1)}
            </span>
            {produto.precoPromocional && produto.precoPromocional > 0 && (
              <span className="text-xs font-medium px-2 py-1 rounded bg-yellow-100 text-yellow-800">
                Promoção
              </span>
            )}
          </div>
        </div>

        {/* Conteúdo do card Mobile */}
        <div className="p-4">
          {/* Título */}
          <div className="space-y-2">
            <h3 className="font-semibold text-base line-clamp-1" title={produto.nome}>
              {produto.nome}
            </h3>
            
            {/* Informações adicionais */}
            {produto.saboresDisponiveis && produto.quantidadeSabores && (
              <p className="text-sm text-muted-foreground">
                Até {produto.quantidadeSabores} sabor{produto.quantidadeSabores > 1 ? 'es' : ''}
              </p>
            )}
            
            {/* Descrição */}
            <p className="text-sm text-muted-foreground line-clamp-2" title={produto.descricao}>
              {produto.descricao}
            </p>
          </div>

          {/* Preço */}
          <div className="mt-3">
            {produto.precoPromocional ? (
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-[color:var(--price-color)]">
                  R$ {produto.precoPromocional.toFixed(2).replace('.', ',')}
                </span>
                <span className="text-sm text-gray-500 line-through">
                  R$ {produto.preco.toFixed(2).replace('.', ',')}
                </span>
              </div>
            ) : (
              <span className="text-lg font-bold text-[color:var(--price-color)]">
                R$ {produto.preco.toFixed(2).replace('.', ',')}
              </span>
            )}
          </div>

          {/* Botões Mobile */}
          <div className="mt-4 space-y-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onEditar(produto)}
              className="w-full"
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar Produto
            </Button>
            <ConfirmDeleteDialog
              trigger={
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remover Produto
                </Button>
              }
              title="Confirmar Exclusão"
              description={`Tem certeza que deseja excluir o produto "${produto.nome}"? Esta ação não pode ser desfeita.`}
              onConfirm={() => onExcluir(produto)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}