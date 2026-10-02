import { useState, useEffect } from "react"
import { Package } from "lucide-react"

import CategoriaForm from "@/components/CategoriaForm"
import { categoriaService, type CategoriaSupabase } from "@/services"
import toast from "react-hot-toast"
import { useNavigation } from "@/contexts/NavigationContext"

type Categoria = CategoriaSupabase

export default function NovaCategoria() {
  const { navigateTo } = useNavigation()
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    carregarCategorias()
  }, [])

  const carregarCategorias = async () => {
    try {
      const categoriasData = await categoriaService.buscarTodas()
      setCategorias(categoriasData)
    } catch (err) {
      console.error('Erro ao carregar categorias:', err)
    }
  }

  const handleSubmit = async (categoriaData: Omit<Categoria, 'id' | 'criado_em' | 'atualizado_em'>) => {
    try {
      setIsLoading(true)
      await categoriaService.criar(categoriaData)
      toast.success('Categoria criada com sucesso!')
      navigateTo('categorias')
    } catch (err) {
      console.error('Erro ao criar categoria:', err)
      toast.error('Erro ao criar categoria. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    navigateTo('categorias')
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Package className="h-6 w-6" />
          Nova Categoria
        </h1>
        <p className="text-muted-foreground">Crie uma nova categoria para organizar seus produtos</p>
      </div>

      {/* Formulário */}
      <CategoriaForm
        categoriasExistentes={categorias}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </div>
  )
}
