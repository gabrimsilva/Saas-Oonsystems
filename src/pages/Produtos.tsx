import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ActionButton } from "@/components/ui/action-button"
import { DangerButton } from "@/components/ui/danger-button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Package, Plus, Search, Loader2, AlertCircle, Trash2 } from "lucide-react"
import ProdutoCard from "@/components/ProdutoCard"
import CategoriaTabs from "@/components/CategoriaTabs"
import { useNavigation } from "@/contexts/NavigationContext"
import { produtoService, categoriaService, type ProdutoSupabase, type CategoriaSupabase } from "@/services"

type Categoria = CategoriaSupabase

interface Produto extends ProdutoSupabase {
  categoria: string // Alias para categoria_nome
  urlImagem: string // Alias para url_imagem
  precoPromocional?: number // Alias para preco_promocional
  saboresDisponiveis?: boolean // Alias para sabores_disponiveis
  quantidadeSabores?: number // Alias para quantidade_sabores
  saboresSelecionados?: string[] // Para compatibilidade
}

export default function Produtos() {
  const navigate = useNavigate()
  const { navigateTo } = useNavigation()
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [termoBusca, setTermoBusca] = useState("")
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todas")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [limpandoImagens, setLimpandoImagens] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Carregar dados do Supabase
  useEffect(() => {
    carregarDados()
  }, [])

  // Função para normalizar nomes de categoria para comparação
  const normalizarCategoria = (categoria: string): string => {
    const mapeamento: { [key: string]: string } = {
      'lanches': 'lanches',
      'bebidas': 'bebidas',
      'doces': 'doces',
      'salgados': 'salgados',
      'refeicoes': 'refeicoes',
      'corpo': 'corpo',
      'lanche': 'lanches',
      'bebida': 'bebidas',
      'combo': 'combo'
    }
    
    const categoriaLower = categoria.toLowerCase()
    return mapeamento[categoriaLower] || categoriaLower
  }

  const carregarDados = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Carregar produtos e categorias em paralelo
      const [produtosData, categoriasData] = await Promise.all([
        produtoService.buscarTodos(),
        categoriaService.buscarTodas()
      ])
      
      // Mapear produtos para incluir aliases
      const produtosComAlias: Produto[] = produtosData.map(produto => {
        // Encontrar a categoria real pelo categoria_id
        const categoriaReal = categoriasData.find(cat => cat.id === produto.categoria_id)
        
        return {
          ...produto,
          categoria: categoriaReal ? categoriaReal.nome.toLowerCase() : normalizarCategoria(produto.categoria_nome || 'outros'),
          urlImagem: produto.imagem_path || '',
          precoPromocional: produto.preco_promocional,
          saboresDisponiveis: produto.sabores_disponiveis,
          quantidadeSabores: produto.quantidade_sabores,
          saboresSelecionados: [] // Será carregado quando necessário
        }
      })
      
      setProdutos(produtosComAlias)
      setCategorias(categoriasData.filter(cat => cat.ativa))
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      setError('Erro ao carregar dados do servidor.')
    } finally {
      setLoading(false)
    }
  }

  const handleExcluirProduto = async (produto: Produto) => {
    try {
      setSaving(true)
      await produtoService.excluir(produto.id)
      await carregarDados()
    } catch (error) {
      console.error('Erro ao excluir:', error)
      setError('Erro ao excluir item. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleEditarProduto = async (produto: Produto) => {
    // Para produtos normais, usar navigate diretamente
    navigate(`/sistema/editar-produto/${produto.id}`)
  }

  const handleNovoProdutoClick = () => {
    navigateTo('novo-produto')
  }

  const handleLimparImagensOrfas = async () => {
    try {
      setLimpandoImagens(true)
      setError(null)
      await produtoService.limparImagensOrfas()
    } catch (err) {
      console.error('Erro ao limpar imagens órfãs:', err)
      setError('Erro ao limpar imagens órfãs')
    } finally {
      setLimpandoImagens(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Carregando produtos...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Desktop */}
      <div className="hidden md:flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6" />
            Produtos
          </h1>
          <p className="text-muted-foreground">
            Gerencie os produtos da loja
          </p>
        </div>
        <div className="flex space-x-2">
          <ActionButton onClick={handleNovoProdutoClick} loading={saving}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Produto
          </ActionButton>
          <DangerButton 
            onClick={handleLimparImagensOrfas} 
            variant="outline" 
            loading={limpandoImagens}
            className="text-warning-foreground border-warning/30 hover:bg-warning/10"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar Imagens Órfãs
          </DangerButton>
        </div>
      </div>

      {/* Header Mobile */}
      <div className="md:hidden space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight flex items-center justify-center gap-2">
            <Package className="h-6 w-6" />
            Produtos
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            Gerencie os produtos da loja
          </p>
        </div>
        
        <div className="space-y-2">
          <ActionButton onClick={handleNovoProdutoClick} loading={saving} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Novo Produto
          </ActionButton>
          <DangerButton 
            onClick={handleLimparImagensOrfas} 
            variant="outline" 
            loading={limpandoImagens}
            className="w-full text-warning-foreground border-warning/30 hover:bg-warning/10"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar Imagens Órfãs
          </DangerButton>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-destructive/5 border border-destructive/30 rounded-lg text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs de Categorias */}
      <CategoriaTabs
        categorias={categorias}
        categoriaAtiva={categoriaFiltro}
        onCategoriaChange={setCategoriaFiltro}
        mostrarPromocoes={true}
        mostrarTodas={true}
      />

      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="buscar-produtos"
            name="buscar-produtos"
            placeholder="Buscar produtos..." 
            className="pl-8"
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
          />
        </div>
      </div>

      {/* Filtrar produtos por busca e categoria */}
      {(() => {
        const produtosFiltrados = produtos.filter(produto => {
          // Filtro de busca
          const matchBusca = produto.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
            produto.descricao.toLowerCase().includes(termoBusca.toLowerCase()) ||
            produto.categoria.toLowerCase().includes(termoBusca.toLowerCase())
          
          // Filtro de categoria
          if (categoriaFiltro === "todas") {
            return matchBusca
          } else if (categoriaFiltro === "promocoes") {
            return matchBusca && produto.precoPromocional && produto.precoPromocional > 0
          } else {
            return matchBusca && produto.categoria === categoriaFiltro
          }
        })

        return produtosFiltrados.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
            {termoBusca ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {termoBusca 
              ? "Tente buscar com outros termos" 
              : "Comece adicionando produtos ao catálogo"
            }
          </p>
          {!termoBusca && (
            <div className="flex flex-col md:flex-row justify-center space-y-2 md:space-y-0 md:space-x-2">
              <ActionButton onClick={handleNovoProdutoClick} loading={saving} className="w-full md:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Novo Produto
              </ActionButton>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Promoções */}
          {produtosFiltrados.filter(produto => produto.precoPromocional && produto.precoPromocional > 0).length > 0 && (
            <Card className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm">
              <CardContent>
                <h2 className="text-lg font-semibold mb-4 text-foreground">Promoções</h2>
                <div className="grid gap-4 lg:grid-cols-2 md:grid-cols-2 grid-cols-1">
                  {produtosFiltrados.filter(produto => produto.precoPromocional && produto.precoPromocional > 0).map((produto) => (
                    <ProdutoCard
                      key={produto.id}
                      produto={produto}
                      onEditar={handleEditarProduto}
                      onExcluir={handleExcluirProduto}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Categorias Dinâmicas - Só mostra se tiver produtos */}
          {categorias
            .filter((categoria) => {
              const produtosDaCategoria = produtosFiltrados.filter(produto => 
                produto.categoria === categoria.nome.toLowerCase() && 
                (!produto.precoPromocional || produto.precoPromocional <= 0)
              );
              return produtosDaCategoria.length > 0;
            })
            .map((categoria) => {
              const produtosDaCategoria = produtosFiltrados.filter(produto => 
                produto.categoria === categoria.nome.toLowerCase() && 
                (!produto.precoPromocional || produto.precoPromocional <= 0)
              );
              


              return (
              <Card key={categoria.id} className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm">
                <CardContent>
                  <h2 className="text-xl font-semibold mb-4">{categoria.nome}</h2>
                  <div className="grid gap-4 lg:grid-cols-2 md:grid-cols-2 grid-cols-1">
                    {produtosDaCategoria.map((produto) => (
                      <ProdutoCard
                        key={produto.id}
                        produto={produto}
                        onEditar={handleEditarProduto}
                        onExcluir={handleExcluirProduto}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        )
      })()}
    </div>
  )
}