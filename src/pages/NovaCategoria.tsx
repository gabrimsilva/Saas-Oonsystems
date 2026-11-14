import { useState, useEffect } from "react"
import { Package } from "lucide-react"

import CategoriaForm from "@/components/CategoriaForm"
import { categoriaService, type CategoriaSupabase } from "@/services"
import toast from "react-hot-toast"
import { useNavigation } from "@/contexts/NavigationContext"
import { CabecalhoPagina } from '@/components/ui/feedback'

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
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <CabecalhoPagina titulo="Nova categoria" descricao="Crie uma nova categoria para organizar seus produtos" icone={Package} />

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
