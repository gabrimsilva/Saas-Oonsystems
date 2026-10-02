import { useState, useEffect } from "react"
import { Pizza, Loader2 } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import SaborForm from "@/components/SaborForm"
import { saborService, type SaborSupabase } from "@/services"
import toast from "react-hot-toast"

type Sabor = SaborSupabase & {
  isPremium: boolean
  valorPremium?: number
}

export default function EditarSabor() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [sabor, setSabor] = useState<Sabor | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)

  useEffect(() => {
    if (id) {
      carregarDados()
    } else {
      toast.error('ID do sabor não encontrado')
      navigate('/sistema/sabores')
    }
  }, [id])

  const carregarDados = async () => {
    try {
      setIsLoadingData(true)
      
      // Carregar todos os sabores e encontrar o específico
      const saboresData = await saborService.buscarTodos()
      const saborData = saboresData.find(s => String(s.id) === String(id))
      
      if (saborData) {
        // Mapear para incluir aliases
        const saborComAlias = {
          ...saborData,
          isPremium: saborData.is_premium,
          valorPremium: saborData.valor_premium
        }
        setSabor(saborComAlias)
      } else {
        toast.error('Sabor não encontrado')
        navigate('/sistema/sabores')
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      toast.error('Erro ao carregar sabor')
      navigate('/sistema/sabores')
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleSubmit = async (saborData: any) => {
    if (!id) return
    
    try {
      setIsLoading(true)
      
      // Converter para o formato esperado pelo service
      const dadosParaAtualizar = {
        nome: saborData.nome,
        descricao: saborData.descricao,
        is_premium: saborData.isPremium,
        valor_premium: saborData.valorPremium,
        tipo: saborData.tipo,
        categoria_id: saborData.categoria_id,
        categoria_sabor: saborData.categoria_sabor,
        tipo_sabor: saborData.tipo_sabor
      }
      
      await saborService.atualizar(id, dadosParaAtualizar)
      toast.success('Sabor atualizado com sucesso!')
      navigate('/sistema/sabores')
    } catch (err) {
      console.error('Erro ao atualizar sabor:', err)
      toast.error('Erro ao atualizar sabor. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    navigate('/sistema/sabores')
  }

  if (isLoadingData) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Carregando sabor...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!sabor) {
    return null
  }

  const tipoSabor = (sabor as any).tipo_sabor || 'normal'

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Pizza className="h-6 w-6" />
          Editar {tipoSabor === 'borda' ? 'Sabor de Borda' : 'Sabor'}
        </h1>
        <p className="text-muted-foreground">Edite as informações do sabor "{sabor.nome}"</p>
      </div>

      {/* Formulário */}
      <SaborForm
        saborInicial={sabor}
        tipoSaborInicial={tipoSabor}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </div>
  )
}
