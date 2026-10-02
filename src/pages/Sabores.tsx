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
  isPremium: boolean // Alias para is_premium
  valorPremium?: number // Alias para valor_premium
}

type Categoria = CategoriaSupabase

export default function Sabores() {
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

      // Filtrar apenas sabores normais (não de borda)
      const saboresNormais = saboresData.filter(sabor => (sabor as any).tipo_sabor !== 'borda')

      // Mapear sabores para incluir aliases
      const saboresComAlias = saboresNormais.map(sabor => ({
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

  // Função para obter grupos de sabores organizados por categoria (apenas sabores normais)
  const obterGruposSabores = () => {
    const grupos: Array<{ nome: string; cor: string; categoriaId: string; tipoSabor: string }> = []

    // Para cada categoria, adicionar apenas os sabores normais
    categorias.forEach(categoria => {
      grupos.push({
        nome: categoria.nome,
        cor: 'bg-primary',
        categoriaId: categoria.id,
        tipoSabor: 'normal'
      })
    })

    return grupos
  }

  const handleEditarSabor = (sabor: Sabor) => {
    navigateTo(`editar-sabor/${sabor.id}` as any)
  }

  const handleExcluirSabor = async (sabor: Sabor) => {
    try {
      setSaving(true)
      setError(null)
      await saborService.excluir(sabor.id)
      await carregarDados()
    } catch (err) {
      console.error('Erro ao excluir sabor:', err)
      setError('Erro ao excluir sabor.')
    } finally {
      setSaving(false)
    }
  }

  const handleNovoSaborClick = (tipoSabor: 'normal' | 'borda' = 'normal') => {
    if (tipoSabor === 'borda') {
      navigateTo('novo-sabor-borda' as any)
    } else {
      navigateTo('novo-sabor' as any)
    }
  }

  // Categorias que têm sabores habilitados
  const categoriasComSabores = categorias.filter(cat => (cat as any).tem_sabores)

  // Filtrar sabores por termo de busca e categoria
  const saboresFiltrados = sabores.filter(sabor => {
    // Filtro de busca
    const matchBusca = sabor.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
      sabor.tipo.toLowerCase().includes(termoBusca.toLowerCase())
    
    if (!matchBusca) return false

    // Filtro de categoria
    if (categoriaAtiva === "todas") return true
    
    // Encontrar categoria pelo nome
    const categoria = categoriasComSabores.find(cat => cat.nome.toLowerCase() === categoriaAtiva.toLowerCase())
    if (!categoria) return false
    
    return sabor.categoria_id === categoria.id
  })

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Carregando sabores...</span>
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
            Sabores
          </h1>
          <p className="text-muted-foreground">
            Gerencie os sabores de todas as categorias
          </p>
        </div>
        <ActionButton onClick={() => handleNovoSaborClick('normal')} loading={saving}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Sabor
        </ActionButton>
      </div>

      {/* Header Mobile */}
      <div className="md:hidden space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight flex items-center justify-center gap-2">
            <Pizza className="h-6 w-6" />
            Sabores
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            Gerencie os sabores de todas as categorias
          </p>
        </div>

        <ActionButton onClick={() => handleNovoSaborClick('normal')} loading={saving} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Novo Sabor
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
        categorias={categoriasComSabores}
        categoriaAtiva={categoriaAtiva}
        onCategoriaChange={setCategoriaAtiva}
        mostrarPromocoes={false}
        mostrarTodas={true}
      />

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="buscar-sabores"
            name="buscar-sabores"
            placeholder="Buscar sabores..."
            className="pl-8"
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
          />
        </div>
      </div>

      {/* Grupos de Sabores por Categoria - Só mostra se tiver sabores */}
      {obterGruposSabores()
        .filter((grupo) => {
          const saboresDoGrupo = saboresFiltrados.filter(sabor =>
            sabor.categoria_id === grupo.categoriaId &&
            ((sabor as any).tipo_sabor === 'normal' || !(sabor as any).tipo_sabor)
          )
          return saboresDoGrupo.length > 0
        })
        .map((grupo) => {
          const saboresDoGrupo = saboresFiltrados.filter(sabor =>
            sabor.categoria_id === grupo.categoriaId &&
            ((sabor as any).tipo_sabor === 'normal' || !(sabor as any).tipo_sabor)
          )

          return (
            <Card key={`${grupo.categoriaId}-${grupo.tipoSabor}`}>
              <CardHeader>
                <CardTitle>{grupo.nome}</CardTitle>
                <CardDescription>
                  Sabores disponíveis para {grupo.nome.toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {saboresDoGrupo.map((sabor) => (
                    <div key={sabor.id} className="p-4 border rounded-lg">
                      {/* Primeira linha: Nome do sabor e botões Desktop */}
                      <div className="hidden md:flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 ${grupo.cor} rounded-full flex-shrink-0`}></div>
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
                            description={`Tem certeza que deseja excluir o sabor "${sabor.nome}"? Esta ação não pode ser desfeita.`}
                            onConfirm={() => handleExcluirSabor(sabor)}
                            disabled={saving}
                          />
                        </div>
                      </div>

                      {/* Nome do sabor Mobile */}
                      <div className="md:hidden flex items-center space-x-2 mb-3">
                        <div className={`w-3 h-3 ${grupo.cor} rounded-full flex-shrink-0`}></div>
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
                          description={`Tem certeza que deseja excluir o sabor "${sabor.nome}"? Esta ação não pode ser desfeita.`}
                          onConfirm={() => handleExcluirSabor(sabor)}
                          disabled={saving}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}

      {/* Mensagem quando não há sabores ou nenhum resultado na busca */}
      {obterGruposSabores().filter((grupo) => {
        const saboresDoGrupo = saboresFiltrados.filter(sabor =>
          sabor.categoria_id === grupo.categoriaId &&
          ((sabor as any).tipo_sabor === 'normal' || !(sabor as any).tipo_sabor)
        )
        return saboresDoGrupo.length > 0
      }).length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Pizza className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                {termoBusca ? "Nenhum sabor encontrado" : "Nenhum sabor cadastrado"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {termoBusca
                  ? "Tente buscar com outros termos"
                  : "Comece criando seu primeiro sabor"
                }
              </p>
              {!termoBusca && (
                <ActionButton onClick={() => handleNovoSaborClick('normal')} loading={saving}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Sabor
                </ActionButton>
              )}
            </CardContent>
          </Card>
        )}
    </div>
  )
}