import { useState } from "react"
import { Pizza } from "lucide-react"
import SaborForm from "@/components/SaborForm"
import { saborService } from "@/services"
import toast from "react-hot-toast"
import { useNavigation } from "@/contexts/NavigationContext"

export default function NovoSabor() {
  const { navigateTo, currentPage } = useNavigation()
  const [isLoading, setIsLoading] = useState(false)
  
  // Determinar tipo de sabor baseado na página atual
  const tipoSabor = currentPage === 'novo-sabor-borda' ? 'borda' : 'normal'

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
        tipo_sabor: saborData.tipo_sabor,
        ativo: true
      }
      
      await saborService.criar(dadosParaSalvar)
      toast.success(tipoSabor === 'borda' ? 'Sabor de borda criado com sucesso!' : 'Sabor criado com sucesso!')
      navigateTo('sabores')
    } catch (err) {
      console.error('Erro ao criar sabor:', err)
      toast.error('Erro ao criar sabor. Tente novamente.')
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
            tipo_sabor: saborData.tipo_sabor,
            ativo: true
          }
          
          await saborService.criar(dadosParaSalvar)
          success.push(saborData.nome)
        } catch (err: any) {
          console.error(`Erro ao criar sabor ${saborData.nome}:`, err)
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
        toast.success(`${success.length} ${success.length === 1 ? 'sabor criado' : 'sabores criados'} com sucesso!`)
      } else if (success.length > 0 && failed.length > 0) {
        toast.success(`${success.length} ${success.length === 1 ? 'sabor criado' : 'sabores criados'} com sucesso!`, { duration: 4000 })
        toast.error(`${failed.length} ${failed.length === 1 ? 'sabor falhou' : 'sabores falharam'}: ${failed.join(', ')}`, { duration: 6000 })
      } else {
        toast.error(`Nenhum sabor foi criado. Erros: ${failed.join(', ')}`)
      }
      
      // Navegar de volta se pelo menos um foi criado
      if (success.length > 0) {
        setTimeout(() => navigateTo('sabores'), 1500)
      }
      
      return { success, failed }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    navigateTo('sabores')
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Pizza className="h-6 w-6" />
          {tipoSabor === 'borda' ? 'Novo Sabor de Borda' : 'Novo Sabor'}
        </h1>
        <p className="text-muted-foreground">
          {tipoSabor === 'borda' 
            ? 'Crie um novo sabor de borda para seus produtos' 
            : 'Crie um novo sabor para seus produtos'
          }
        </p>
      </div>

      {/* Formulário */}
      <SaborForm
        tipoSaborInicial={tipoSabor}
        onSubmit={handleSubmit}
        onSubmitMultiple={handleSubmitMultiple}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </div>
  )
}
