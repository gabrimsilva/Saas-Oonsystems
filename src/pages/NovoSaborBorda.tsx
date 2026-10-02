import { useState } from "react"
import { Pizza } from "lucide-react"
import SaborBordaForm from "@/components/SaborBordaForm"
import { saborService } from "@/services"
import toast from "react-hot-toast"
import { useNavigation } from "@/contexts/NavigationContext"

export default function NovoSaborBorda() {
  const { navigateTo } = useNavigation()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (saborData: any) => {
    try {
      setIsLoading(true)
      
      // Converter para o formato esperado pelo service
      const dadosParaSalvar = {
        nome: saborData.nome,
        descricao: saborData.descricao,
        is_premium: saborData.isPremium,
        valor_premium: saborData.valorPremium,
        tipo: saborData.tipo,
        categoria_id: saborData.categoria_id,
        categoria_sabor: saborData.categoria_sabor,
        tipo_sabor: 'borda' as const,
        ativo: true
      }
      
      await saborService.criar(dadosParaSalvar)
      toast.success('Sabor de borda criado com sucesso!')
      navigateTo('sabores-borda')
    } catch (err) {
      console.error('Erro ao criar sabor de borda:', err)
      toast.error('Erro ao criar sabor de borda. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitMultiple = async (saboresData: any[]) => {
    const success: string[] = []
    const failed: string[] = []
    
    try {
      setIsLoading(true)
      
      for (const saborData of saboresData) {
        try {
          // Converter para o formato esperado pelo service
          const dadosParaSalvar = {
            nome: saborData.nome,
            descricao: saborData.descricao,
            is_premium: saborData.isPremium,
            valor_premium: saborData.valorPremium,
            tipo: saborData.tipo,
            categoria_id: saborData.categoria_id,
            categoria_sabor: saborData.categoria_sabor,
            tipo_sabor: 'borda' as const,
            ativo: true
          }
          
          await saborService.criar(dadosParaSalvar)
          success.push(saborData.nome)
        } catch (err: any) {
          console.error(`Erro ao criar sabor de borda ${saborData.nome}:`, err)
          // Verificar se é erro de duplicata
          if (err.message?.includes('duplicate') || err.message?.includes('já existe')) {
            failed.push(`${saborData.nome} (já existe)`)
          } else {
            failed.push(saborData.nome)
          }
        }
      }
      
      // Mostrar resultado
      if (success.length > 0 && failed.length === 0) {
        toast.success(`${success.length} ${success.length === 1 ? 'sabor de borda criado' : 'sabores de borda criados'} com sucesso!`)
      } else if (success.length > 0 && failed.length > 0) {
        toast.success(`${success.length} ${success.length === 1 ? 'sabor de borda criado' : 'sabores de borda criados'} com sucesso!`, { duration: 4000 })
        toast.error(`${failed.length} ${failed.length === 1 ? 'sabor falhou' : 'sabores falharam'}: ${failed.join(', ')}`, { duration: 6000 })
      } else {
        toast.error(`Nenhum sabor de borda foi criado. Erros: ${failed.join(', ')}`)
      }
      
      // Navegar de volta se pelo menos um foi criado
      if (success.length > 0) {
        setTimeout(() => navigateTo('sabores-borda'), 1500)
      }
      
      return { success, failed }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    navigateTo('sabores-borda')
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Pizza className="h-6 w-6" />
          Novo Sabor de Borda
        </h1>
        <p className="text-muted-foreground">
          Crie um novo sabor de borda para seus produtos
        </p>
      </div>

      {/* Formulário */}
      <SaborBordaForm
        onSubmit={handleSubmit}
        onSubmitMultiple={handleSubmitMultiple}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </div>
  )
}
