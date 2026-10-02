import { useState } from "react"
import { Plus } from "lucide-react"
import AdicionalForm, { type AdicionalFormData } from "@/components/AdicionalForm"
import { adicionalService } from "@/services"
import toast from "react-hot-toast"
import { useNavigation } from "@/contexts/NavigationContext"

export default function NovoAdicional() {
  const { navigateTo } = useNavigation()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (adicionalData: AdicionalFormData) => {
    try {
      setIsLoading(true)
      
      await adicionalService.criar(adicionalData)
      toast.success('Adicional criado com sucesso!')
      navigateTo('adicionais')
    } catch (err) {
      console.error('Erro ao criar adicional:', err)
      toast.error('Erro ao criar adicional. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitMultiple = async (adicionaisData: AdicionalFormData[]) => {
    const success: string[] = []
    const failed: string[] = []
    
    try {
      setIsLoading(true)
      
      for (const adicionalData of adicionaisData) {
        try {
          await adicionalService.criar(adicionalData)
          success.push(adicionalData.nome)
        } catch (err: any) {
          console.error(`Erro ao criar adicional ${adicionalData.nome}:`, err)
          // Verificar se é erro de duplicata
          if (err.message?.includes('duplicate') || err.message?.includes('já existe')) {
            failed.push(`${adicionalData.nome} (já existe)`)
          } else {
            failed.push(adicionalData.nome)
          }
        }
      }
      
      // Mostrar resultado
      if (success.length > 0 && failed.length === 0) {
        toast.success(`${success.length} ${success.length === 1 ? 'adicional criado' : 'adicionais criados'} com sucesso!`)
      } else if (success.length > 0 && failed.length > 0) {
        toast.success(`${success.length} ${success.length === 1 ? 'adicional criado' : 'adicionais criados'} com sucesso!`, { duration: 4000 })
        toast.error(`${failed.length} ${failed.length === 1 ? 'adicional falhou' : 'adicionais falharam'}: ${failed.join(', ')}`, { duration: 6000 })
      } else {
        toast.error(`Nenhum adicional foi criado. Erros: ${failed.join(', ')}`)
      }
      
      // Navegar de volta se pelo menos um foi criado
      if (success.length > 0) {
        setTimeout(() => navigateTo('adicionais'), 1500)
      }
      
      return { success, failed }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    navigateTo('adicionais')
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Plus className="h-6 w-6" />
          Novo Adicional
        </h1>
        <p className="text-muted-foreground">
          Crie um novo adicional para seus produtos
        </p>
      </div>

      {/* Formulário */}
      <AdicionalForm
        onSubmit={handleSubmit}
        onSubmitMultiple={handleSubmitMultiple}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </div>
  )
}
