import { useState, useEffect } from "react"
import { Package, Loader2 } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import CategoriaForm from "@/components/CategoriaForm"
import { categoriaService, type CategoriaSupabase } from "@/services"
import toast from "react-hot-toast"

type Categoria = CategoriaSupabase

export default function EditarCategoria() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [categoria, setCategoria] = useState<Categoria | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)

  useEffect(() => {
    if (id) {
      carregarDados()
    } else {
      toast.error('ID da categoria não encontrado')
      navigate('/sistema/categorias')
    }
  }, [id])

  const carregarDados = async () => {
    try {
      setIsLoadingData(true)
      
      // Carregar todas as categorias
      const categoriasData = await categoriaService.buscarTodas()
      setCategorias(categoriasData)
      
      // Carregar categoria específica
      if (id) {
        // Comparar diretamente como string, pois o ID pode ser UUID
        const categoriaData = categoriasData.find(cat => String(cat.id) === String(id))
        
        if (categoriaData) {
          setCategoria(categoriaData)
        } else {
          toast.error('Categoria não encontrada')
          navigate('/sistema/categorias')
        }
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      toast.error('Erro ao carregar categoria')
      navigate('/sistema/categorias')
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleSubmit = async (categoriaData: Omit<Categoria, 'id' | 'criado_em' | 'atualizado_em'>) => {
    if (!id) return
    
    try {
      setIsLoading(true)
      await categoriaService.atualizar(id, categoriaData)
      toast.success('Categoria atualizada com sucesso!')
      navigate('/sistema/categorias')
    } catch (err) {
      console.error('Erro ao atualizar categoria:', err)
      toast.error('Erro ao atualizar categoria. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    navigate('/sistema/categorias')
  }

  if (isLoadingData) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Carregando categoria...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!categoria) {
    return null
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Package className="h-6 w-6" />
          Editar Categoria
        </h1>
        <p className="text-muted-foreground">Edite as informações da categoria "{categoria.nome}"</p>
      </div>

      {/* Formulário */}
      <CategoriaForm
        categoriaInicial={categoria}
        categoriasExistentes={categorias}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </div>
  )
}
