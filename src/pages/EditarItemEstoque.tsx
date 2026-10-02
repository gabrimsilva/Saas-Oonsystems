import { useState, useEffect } from "react"
import { Package, Loader2 } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import EstoqueForm from "@/components/EstoqueForm"
import { estoqueService, type EstoqueSupabase } from "@/services"
import toast from "react-hot-toast"

type ItemEstoque = EstoqueSupabase

export default function EditarItemEstoque() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [item, setItem] = useState<ItemEstoque | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)

  useEffect(() => {
    if (id) {
      carregarDados()
    } else {
      toast.error('ID do item não encontrado')
      navigate('/sistema/estoque')
    }
  }, [id])

  const carregarDados = async () => {
    try {
      setIsLoadingData(true)
      
      // Carregar todos os itens e encontrar o específico
      const itensData = await estoqueService.buscarTodos()
      const itemData = itensData.find(i => String(i.id) === String(id))
      
      if (itemData) {
        setItem(itemData)
      } else {
        toast.error('Item não encontrado')
        navigate('/sistema/estoque')
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      toast.error('Erro ao carregar item')
      navigate('/sistema/estoque')
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleSubmit = async (itemData: any) => {
    if (!id) return
    
    try {
      setIsLoading(true)
      await estoqueService.atualizar(id, itemData)
      toast.success('Item atualizado com sucesso!')
      navigate('/sistema/estoque')
    } catch (err) {
      console.error('Erro ao atualizar item:', err)
      toast.error('Erro ao atualizar item. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    navigate('/sistema/estoque')
  }

  if (isLoadingData) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Carregando item...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!item) {
    return null
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Package className="h-6 w-6" />
          Editar Item de Estoque
        </h1>
        <p className="text-muted-foreground">Edite as informações do item "{item.nome}"</p>
      </div>

      {/* Formulário */}
      <EstoqueForm
        itemInicial={item}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </div>
  )
}
