import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ActionButton } from "@/components/ui/action-button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Package, Plus, Search, Edit, Trash2, Eye, EyeOff, AlertCircle } from "lucide-react"
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog"
import { categoriaService, type CategoriaSupabase } from "@/services"
import { useNavigation } from "@/contexts/NavigationContext"
import { CarregandoPagina } from '@/components/ui/feedback'
import { avisoComDesfazer } from '@/components/ui/desfazer'

type Categoria = CategoriaSupabase

export default function Categorias() {
  const { navigateTo } = useNavigation()
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [termoBusca, setTermoBusca] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Carregar categorias do Supabase
  useEffect(() => {
    carregarCategorias()
  }, [])

  const carregarCategorias = async () => {
    try {
      setLoading(true)
      setError(null)
      const categoriasData = await categoriaService.buscarTodas()
      setCategorias(categoriasData)
    } catch (err) {
      console.error('Erro ao carregar categorias:', err)
      setError('Erro ao carregar categorias do servidor.')
    } finally {
      setLoading(false)
    }
  }

  const handleNovaCategoria = () => {
    navigateTo('nova-categoria')
  }

  const handleEditarCategoria = (categoria: Categoria) => {
    navigateTo(`editar-categoria/${categoria.id}` as any)
  }

  const handleExcluirCategoria = async (categoria: Categoria) => {
    try {
      setSaving(true)
      setError(null)
      
      // Verificar itens vinculados antes de excluir
      const itens = await categoriaService.contarItensVinculados(categoria.id)
      if (itens.total > 0) {
        setError(`Não é possível excluir esta categoria pois existem ${itens.total} itens vinculados.`)
        return
      }
      
      await categoriaService.excluir(categoria.id)
      await carregarCategorias()
    } catch (err) {
      console.error('Erro ao excluir categoria:', err)
      setError('Erro ao excluir categoria.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleAtiva = async (categoria: Categoria, desfazendo = false) => {
    try {
      setSaving(true)
      setError(null)
      await categoriaService.toggleAtiva(categoria.id)
      const mensagem = categoria.ativa ? 'Categoria desativada' : 'Categoria ativada'
      if (!desfazendo) avisoComDesfazer(mensagem, () => handleToggleAtiva({ ...categoria, ativa: !categoria.ativa }, true))
      await carregarCategorias()
    } catch (err) {
      console.error('Erro ao alterar status da categoria:', err)
      setError('Erro ao alterar status da categoria.')
    } finally {
      setSaving(false)
    }
  }



  // Filtrar categorias por termo de busca
  const categoriasFiltradas = categorias.filter(categoria =>
    categoria.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
    categoria.descricao.toLowerCase().includes(termoBusca.toLowerCase())
  ).sort((a, b) => a.ordem - b.ordem)

  const getStatusColor = (ativa: boolean) => {
    return ativa ? 'bg-success/10 text-success' : 'bg-muted text-foreground'
  }

  if (loading) {
    return <CarregandoPagina variante="tabela" />
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Desktop */}
      <div className="hidden md:flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6" />
            Categorias
          </h1>
          <p className="text-muted-foreground">Gerencie as categorias dos seus produtos</p>
        </div>
        <ActionButton
          onClick={handleNovaCategoria}
          loading={saving}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Categoria
        </ActionButton>
      </div>

      {/* Header Mobile */}
      <div className="md:hidden space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight flex items-center justify-center gap-2">
            <Package className="h-6 w-6" />
            Categorias
          </h1>
          <p className="text-muted-foreground text-sm mt-2">Gerencie as categorias dos seus produtos</p>
        </div>
        <ActionButton
          onClick={handleNovaCategoria}
          className="w-full"
          loading={saving}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Categoria
        </ActionButton>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-destructive/5 border border-destructive/30 rounded-lg text-destructive mb-6">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Barra de busca */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/70 h-4 w-4" />
        <Input
          id="buscar-categorias"
          name="buscar-categorias"
          placeholder="Buscar categorias..."
          value={termoBusca}
          onChange={(e) => setTermoBusca(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Lista de categorias */}
      {categoriasFiltradas.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/70 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {termoBusca ? "Nenhuma categoria encontrada" : "Nenhuma categoria cadastrada"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {termoBusca
                ? "Tente buscar com outros termos"
                : "Comece criando sua primeira categoria de produtos"
              }
            </p>
            {!termoBusca && (
              <ActionButton
                onClick={handleNovaCategoria}
                className="w-full md:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Categoria
              </ActionButton>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categoriasFiltradas.map((categoria) => (
            <Card key={categoria.id} className="hover:shadow-md transition-shadow">
              <CardContent className="px-4 py-4">
                {/* Nome da categoria */}
                <div className="mb-3">
                  <h3 className="font-semibold text-lg text-foreground mb-2">{categoria.nome}</h3>
                  
                  {/* Badges - Desktop: inline, Mobile: wrap */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(categoria.ativa)}`}>
                      {categoria.ativa ? 'Ativa' : 'Inativa'}
                    </span>
                    {(categoria as any).tem_sabores && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        Sabores
                      </span>
                    )}
                    {(categoria as any).tem_borda && (
                      <span className="text-xs bg-warning/15 text-warning-foreground px-2 py-1 rounded">
                        Borda
                      </span>
                    )}
                    {(categoria as any).tem_tamanhos && (
                      <span className="text-xs bg-success/10 text-success px-2 py-1 rounded">
                        Tamanhos
                      </span>
                    )}
                    {(categoria as any).tem_adicionais && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        Adicionais
                      </span>
                    )}
                  </div>
                </div>

                {/* Descrição */}
                <p className="text-muted-foreground text-sm mb-2">{categoria.descricao}</p>

                {/* Ordem */}
                <p className="text-xs text-muted-foreground mb-4">Ordem: {categoria.ordem}</p>

                {/* Botões Desktop */}
                <div className="hidden md:flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleAtiva(categoria)}
                    className="h-8 flex-1"
                    disabled={saving}
                  >
                    {categoria.ativa ? (
                      <>
                        <EyeOff className="h-3 w-3 mr-1" />
                        Desativar
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3 mr-1" />
                        Ativar
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditarCategoria(categoria)}
                    className="h-8 w-8 p-0"
                    disabled={saving}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>

                  <ConfirmDeleteDialog
                    trigger={
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={saving}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    }
                    title="Confirmar Exclusão"
                    description={`Tem certeza que deseja excluir a categoria "${categoria.nome}"? Esta ação não pode ser desfeita.`}
                    onConfirm={() => handleExcluirCategoria(categoria)}
                    disabled={saving}
                  />
                </div>

                {/* Botões Mobile */}
                <div className="md:hidden space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleAtiva(categoria)}
                    className="w-full"
                    disabled={saving}
                  >
                    {categoria.ativa ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-2" />
                        Desativar Categoria
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Ativar Categoria
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditarCategoria(categoria)}
                    className="w-full"
                    disabled={saving}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar Categoria
                  </Button>

                  <ConfirmDeleteDialog
                    trigger={
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-destructive hover:text-destructive hover:bg-destructive/5"
                        disabled={saving}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remover Categoria
                      </Button>
                    }
                    title="Confirmar Exclusão"
                    description={`Tem certeza que deseja excluir a categoria "${categoria.nome}"? Esta ação não pode ser desfeita.`}
                    onConfirm={() => handleExcluirCategoria(categoria)}
                    disabled={saving}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

    </div>
  )
}