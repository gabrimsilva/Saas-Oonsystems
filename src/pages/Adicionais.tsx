import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ActionButton } from "@/components/ui/action-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Search, Edit, Trash2, AlertCircle } from "lucide-react"
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog"
import CategoriaTabs from "@/components/CategoriaTabs"
import { categoriaService, adicionalService, type CategoriaSupabase, type AdicionalSupabase } from "@/services"
import { useNavigation } from "@/contexts/NavigationContext"
import { CarregandoPagina } from '@/components/ui/feedback'

type Categoria = CategoriaSupabase

export default function Adicionais() {
  const { navigateTo } = useNavigation()
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [adicionais, setAdicionais] = useState<AdicionalSupabase[]>([])
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

      // Carregar categorias e adicionais em paralelo
      const [categoriasData, adicionaisData] = await Promise.all([
        categoriaService.buscarTodas(),
        adicionalService.buscarTodos()
      ])

      setCategorias(categoriasData.filter(cat => cat.ativa))
      setAdicionais(adicionaisData)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      setError('Erro ao carregar dados do servidor.')
    } finally {
      setLoading(false)
    }
  }

  const handleEditarAdicional = (adicional: AdicionalSupabase) => {
    navigateTo(`editar-adicional/${adicional.id}` as any)
  }

  const handleExcluirAdicional = async (adicional: AdicionalSupabase) => {
    try {
      setSaving(true)
      setError(null)
      await adicionalService.excluir(adicional.id)
      await carregarDados()
    } catch (err) {
      console.error('Erro ao excluir adicional:', err)
      setError('Erro ao excluir adicional.')
    } finally {
      setSaving(false)
    }
  }

  const handleNovoAdicionalClick = () => {
    navigateTo('novo-adicional' as any)
  }

  // Filtrar adicionais por termo de busca e categoria
  const adicionaisFiltrados = adicionais.filter(adicional => {
    // Filtro de busca
    const matchBusca = adicional.nome.toLowerCase().includes(termoBusca.toLowerCase())
    
    if (!matchBusca) return false

    // Filtro de categoria
    if (categoriaAtiva === "todas") return true
    
    // Encontrar categoria pelo nome
    const categoria = categorias.find(cat => cat.nome.toLowerCase() === categoriaAtiva.toLowerCase())
    if (!categoria) return false
    
    return adicional.categoria_id === categoria.id
  })

  // Categorias que têm adicionais habilitados
  const categoriasComAdicionais = categorias.filter(cat => (cat as any).tem_adicionais)

  if (loading) {
    return <CarregandoPagina variante="cartoes" />
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Desktop */}
      <div className="hidden md:flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Plus className="h-6 w-6" />
            Adicionais
          </h1>
          <p className="text-muted-foreground">
            Gerencie os adicionais disponíveis para cada categoria
          </p>
        </div>
        <ActionButton onClick={handleNovoAdicionalClick} loading={saving}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Adicional
        </ActionButton>
      </div>

      {/* Header Mobile */}
      <div className="md:hidden space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight flex items-center justify-center gap-2">
            <Plus className="h-6 w-6" />
            Adicionais
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            Gerencie os adicionais disponíveis para cada categoria
          </p>
        </div>
        <ActionButton onClick={handleNovoAdicionalClick} loading={saving} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Novo Adicional
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
        categorias={categoriasComAdicionais}
        categoriaAtiva={categoriaAtiva}
        onCategoriaChange={setCategoriaAtiva}
        mostrarPromocoes={false}
        mostrarTodas={true}
      />

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="buscar-adicionais"
            name="buscar-adicionais"
            placeholder="Buscar adicionais..."
            className="pl-8"
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
          />
        </div>
      </div>

      {/* Lista de categorias com adicionais */}
      {categoriasComAdicionais
        .filter(categoria => {
          // Se categoria ativa é "todas", mostrar todas
          if (categoriaAtiva === "todas") return true
          // Senão, filtrar pela categoria ativa
          return categoria.nome.toLowerCase() === categoriaAtiva.toLowerCase()
        })
        .map((categoria) => {
          const adicionaisCategoria = adicionaisFiltrados.filter(ad => ad.categoria_id === categoria.id)
          
          // Não mostrar categoria se não tiver adicionais após filtro
          if (adicionaisCategoria.length === 0 && termoBusca) return null
          
          return (
            <Card key={categoria.id}>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle>{categoria.nome}</CardTitle>
                    <CardDescription>
                      Adicionais disponíveis para {categoria.nome.toLowerCase()}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {adicionaisCategoria.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>
                      {termoBusca 
                        ? "Nenhum adicional encontrado com esse termo"
                        : "Nenhum adicional cadastrado para esta categoria"
                      }
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {adicionaisCategoria.map((adicional) => (
                      <div key={adicional.id} className="p-4 border rounded-lg">
                        {/* Desktop */}
                        <div className="hidden md:flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-medium text-foreground">{adicional.nome}</h3>
                            <p className="text-sm text-muted-foreground font-medium mt-1">
                              +R$ {adicional.valor.toFixed(2).replace('.', ',')}
                            </p>
                          </div>
                          <div className="flex space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditarAdicional(adicional)}
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
                              description={`Tem certeza que deseja excluir o adicional "${adicional.nome}"? Esta ação não pode ser desfeita.`}
                              onConfirm={() => handleExcluirAdicional(adicional)}
                              disabled={saving}
                            />
                          </div>
                        </div>

                        {/* Mobile */}
                        <div className="md:hidden mb-3">
                          <h3 className="font-medium text-foreground">{adicional.nome}</h3>
                          <p className="text-sm text-muted-foreground font-medium mt-1">
                            +R$ {adicional.valor.toFixed(2).replace('.', ',')}
                          </p>
                        </div>

                        <div className="flex items-center space-x-2 mb-3 md:mb-0">
                          <span className={`text-xs font-medium px-2 py-1 rounded ${
                            adicional.ativo ? 'bg-success/10 text-success' : 'bg-muted text-foreground'
                          }`}>
                            {adicional.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>

                        {/* Botões Mobile */}
                        <div className="md:hidden space-y-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditarAdicional(adicional)}
                            disabled={saving}
                            className="w-full"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar Adicional
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
                                Remover Adicional
                              </Button>
                            }
                            title="Confirmar Exclusão"
                            description={`Tem certeza que deseja excluir o adicional "${adicional.nome}"? Esta ação não pode ser desfeita.`}
                            onConfirm={() => handleExcluirAdicional(adicional)}
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

      {/* Mensagem quando não há categorias com adicionais */}
      {categoriasComAdicionais.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Plus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Nenhuma categoria com adicionais
            </h3>
            <p className="text-muted-foreground">
              Ative a opção "Essa categoria terá adicionais?" ao criar ou editar uma categoria
            </p>
          </CardContent>
        </Card>
      )}

      {/* Mensagem quando não há resultados na busca */}
      {categoriasComAdicionais.length > 0 && 
       adicionaisFiltrados.length === 0 && 
       termoBusca && (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Nenhum adicional encontrado
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
