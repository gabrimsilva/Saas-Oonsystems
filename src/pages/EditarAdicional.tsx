import { useState, useEffect } from "react"
import { Edit } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import AdicionalForm, { type AdicionalFormData } from "@/components/AdicionalForm"
import { adicionalService } from "@/services"
import toast from "react-hot-toast"
import { CarregandoPagina } from '@/components/ui/feedback'

export default function EditarAdicional() {
  const navigate = useNavigate()
  const { id: adicionalId } = useParams<{ id: string }>()
  const [isLoading, setIsLoading] = useState(false)
  const [loadingAdicional, setLoadingAdicional] = useState(true)
  const [adicional, setAdicional] = useState<AdicionalFormData | null>(null)

  useEffect(() => {
    carregarAdicional()
  }, [adicionalId])

  const carregarAdicional = async () => {
    if (!adicionalId) {
      toast.error('ID do adicional não encontrado')
      navigate('/sistema/adicionais')
      return
    }

    try {
      setLoadingAdicional(true)
      const adicionalData = await adicionalService.buscarPorId(adicionalId)
      
      if (!adicionalData) {
        toast.error('Adicional não encontrado')
        navigate('/sistema/adicionais')
        return
      }

      setAdicional({
        nome: adicionalData.nome,
        valor: adicionalData.valor,
        ativo: adicionalData.ativo,
        categoria_id: adicionalData.categoria_id
      })
    } catch (err) {
      console.error('Erro ao carregar adicional:', err)
      toast.error('Erro ao carregar adicional')
      navigate('/sistema/adicionais')
    } finally {
      setLoadingAdicional(false)
    }
  }

  const handleSubmit = async (adicionalData: AdicionalFormData) => {
    if (!adicionalId) return

    try {
      setIsLoading(true)
      
      await adicionalService.atualizar(adicionalId, adicionalData)
      toast.success('Adicional atualizado com sucesso!')
      navigate('/sistema/adicionais')
    } catch (err) {
      console.error('Erro ao atualizar adicional:', err)
      toast.error('Erro ao atualizar adicional. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    navigate('/sistema/adicionais')
  }

  if (loadingAdicional) {
    return <CarregandoPagina variante="formulario" />
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Edit className="h-6 w-6" />
          Editar Adicional
        </h1>
        <p className="text-muted-foreground">
          Edite as informações do adicional
        </p>
      </div>

      {/* Formulário */}
      {adicional && (
        <AdicionalForm
          adicionalInicial={adicional}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}
