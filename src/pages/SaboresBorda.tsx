import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ActionButton } from "@/components/ui/action-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Pizza, Plus, Search, Edit, Trash2, Loader2, AlertCircle } from "lucide-react"
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog"
import CategoriaTabs from "@/components/CategoriaTabs"
import { saborService, categoriaService, type SaborSupabase, type CategoriaSupabase } from "@/services"
import { useNavigation } from "@/contexts/NavigationContext"

type Sabor = SaborSupabase & {
  isPremium: boolean
  valorPremium?: number
}

type Categoria = CategoriaSupabase

export default function SaboresBorda() {
  const { navigateTo } = useNavigation()
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [sabores, setSabores] = useState<Sabor[]>([])
  const [termoBusca, setTermoBusca] = useState("")
  const [categoriaAtiva, setCategoriaAtiva] = useState("todas")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Carregar dados do Supabase
  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    try {
      setLoading(true)
      setError(null)

      // Carregar sabores e categorias em paralelo
      const [saboresData, categoriasData] = await Promise.all([
        saborService.buscarTodos(),
        categoriaService.buscarTodas()
      ])

      // Filtrar apenas sabores de borda
      const saboresBorda = saboresData.filter(sabor => (sabor as any).tipo_sabor === 'borda')

      // Mapear sabores para incluir aliases
      const saboresComAlias = saboresBorda.map(sabor => ({
        ...sabor,
        isPremium: sabor.is_premium,
        valorPremium: sabor.valor_premium
      }))

      setSabores(saboresComAlias)
      setCategorias(categoriasData.filter(cat => cat.ativa))
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      setError('Erro ao carregar dados do servidor.')
    } finally {
      setLoading(false)
    }
  }

  const handleEditarSabor = (sabor: Sabor) => {
    navigateTo(`editar-sabor-borda/${sabor.id}` as any)
  }

  const handleExcluirSabor = async (sabor: Sabor) => {
    try {
      setSaving(true)
      setError(null)
      await saborService.excluir(sabor.id)
      await carregarDados()
    } catch (err) {
      console.error('Erro ao excluir sabor de borda:', err)
      setError('Erro ao excluir sabor de borda.')
    } finally {
      setSaving(false)
    }
  }

  const handleNovoSaborClick = () => {
    navigateTo('novo-sabor-borda' as any)
  }

  // Categorias que têm borda habilitada
  const categoriasComBorda = categorias.filter(cat => (cat as any).tem_borda)

  // Filtrar sabores por termo de busca e categoria
  const saboresFiltrados = sabores.filter(sabor => {
    // Filtro de busca
    const matchBusca = sabor.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
      sabor.tipo.toLowerCase().includes(termoBusca.toLowerCase())
    
    if (!matchBusca) return false

    // Filtro de categoria
    if (categoriaAtiva === "todas") return true
    
    // Encontrar categoria pelo nome
    const categoria = categoriasComBorda.find(cat => cat.nome.toLowerCase() === categoriaAtiva.toLowerCase())
    if (!categoria) return false
    
    return sabor.categoria_id === categoria.id
  })

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Carregando sabores de borda...</span>
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
            <Pizza className="h-6 w-6" />
            Sabores de Borda
          </h1>
          <p className="text-muted-foreground">
            Gerencie os sabores de borda disponíveis para cada categoria
          </p>
        </div>
        <ActionButton onClick={handleNovoSaborClick} loading={saving}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Sabor de Borda
        </ActionButton>
      </div>

      {/* Header Mobile */}
      <div className="md:hidden space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight flex items-center justify-center gap-2">
            <Pizza className="h-6 w-6" />
            Sabores de Borda
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            Gerencie os sabores de borda disponíveis para cada categoria
          </p>
        </div>
        <ActionButton onClick={handleNovoSaborClick} loading={saving} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Novo Sabor de Borda
        </ActionButton>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-destructive/5 border border-destructive/30 rounded-lg text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs de Categorias */}
      <CategoriaTabs
        categorias={categoriasComBorda}
        categoriaAtiva={categoriaAtiva}
        onCategoriaChange={setCategoriaAtiva}
        mostrarPromocoes={false}
        mostrarTodas={true}
      />

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="buscar-sabores-borda"
            name="buscar-sabores-borda"
            placeholder="Buscar sabores de borda..."
            className="pl-8"
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
          />
        </div>
      </div>

      {/* Lista de categorias com sabores de borda */}
      {categoriasComBorda
        .filter(categoria => {
          // Se categoria ativa é "todas", mostrar todas
          if (categoriaAtiva === "todas") return true
          // Senão, filtrar pela categoria ativa
          return categoria.nome.toLowerCase() === categoriaAtiva.toLowerCase()
        })
        .map((categoria) => {
          const saboresCategoria = saboresFiltrados.filter(sabor => sabor.categoria_id === categoria.id)
          
          // Não mostrar categoria se não tiver sabores após filtro
          if (saboresCategoria.length === 0 && termoBusca) return null
          
          return (
            <Card key={categoria.id}>
              <CardHeader>
                <CardTitle>Sabores de Borda de {categoria.nome}</CardTitle>
                <CardDescription>
                  Sabores de borda disponíveis para {categoria.nome.toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {saboresCategoria.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>
                      {termoBusca 
                        ? "Nenhum sabor de borda encontrado com esse termo"
                        : "Nenhum sabor de borda cadastrado para esta categoria"
                      }
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {saboresCategoria.map((sabor) => (
                      <div key={sabor.id} className="p-4 border rounded-lg">
                        {/* Primeira linha: Nome do sabor e botões Desktop */}
                        <div className="hidden md:flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-warning rounded-full flex-shrink-0"></div>
                            <h3 className="font-medium text-foreground">{sabor.nome}</h3>
                          </div>
                          <div className="flex space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditarSabor(sabor)}
                              disabled={saving}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <ConfirmDeleteDialog
                              trigger={
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={saving}
                                  className="h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              }
                              title="Confirmar Exclusão"
                              description={`Tem certeza que deseja excluir o sabor de borda "${sabor.nome}"? Esta ação não pode ser desfeita.`}
                              onConfirm={() => handleExcluirSabor(sabor)}
                              disabled={saving}
                            />
                          </div>
                        </div>

                        {/* Nome do sabor Mobile */}
                        <div className="md:hidden flex items-center space-x-2 mb-3">
                          <div className="w-3 h-3 bg-warning rounded-full flex-shrink-0"></div>
                          <h3 className="font-medium text-foreground">{sabor.nome}</h3>
                        </div>

                        {/* Descrição do sabor */}
                        {(sabor as any).descricao && (
                          <div className="mb-3">
                            <p className="text-sm text-muted-foreground italic">
                              {(sabor as any).descricao}
                            </p>
                          </div>
                        )}

                        {/* Badges da categoria e valor */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2 flex-wrap gap-1">
                            {sabor.isPremium && (
                              <span className="bg-warning/15 text-warning-foreground text-xs font-medium px-2 py-1 rounded">
                                Premium
                              </span>
                            )}
                            {(sabor as any).categoria_sabor && (
                              <span className="bg-muted text-foreground/80 text-xs font-medium px-2 py-1 rounded capitalize">
                                {(sabor as any).categoria_sabor.replace('_', ' ')}
                              </span>
                            )}
                            <span className="bg-warning/15 text-warning-foreground text-xs font-medium px-2 py-1 rounded">
                              Borda
                            </span>
                          </div>
                          {sabor.isPremium && sabor.valorPremium && (
                            <span className="text-sm text-muted-foreground font-medium">
                              +R$ {sabor.valorPremium.toFixed(2).replace('.', ',')}
                            </span>
                          )}
                        </div>

                        {/* Botões Mobile */}
                        <div className="md:hidden space-y-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditarSabor(sabor)}
                            disabled={saving}
                            className="w-full"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar Sabor
                          </Button>
                          <ConfirmDeleteDialog
                            trigger={
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={saving}
                                className="w-full text-destructive hover:text-destructive hover:bg-destructive/5"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remover Sabor
                              </Button>
                            }
                            title="Confirmar Exclusão"
                            description={`Tem certeza que deseja excluir o sabor de borda "${sabor.nome}"? Esta ação não pode ser desfeita.`}
                            onConfirm={() => handleExcluirSabor(sabor)}
                            disabled={saving}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}

      {/* Mensagem quando não há categorias com borda */}
      {categoriasComBorda.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Pizza className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Nenhuma categoria com borda
            </h3>
            <p className="text-muted-foreground">
              Ative a opção "Essa categoria terá borda?" ao criar ou editar uma categoria
            </p>
          </CardContent>
        </Card>
      )}

      {/* Mensagem quando não há resultados na busca */}
      {categoriasComBorda.length > 0 && 
       saboresFiltrados.length === 0 && 
       termoBusca && (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Nenhum sabor de borda encontrado
            </h3>
            <p className="text-muted-foreground">
              Tente buscar com outros termos
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
