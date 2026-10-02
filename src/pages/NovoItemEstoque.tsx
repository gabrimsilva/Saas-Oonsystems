import { useState } from "react"
import { Package } from "lucide-react"
import EstoqueForm from "@/components/EstoqueForm"
import { estoqueService } from "@/services"
import toast from "react-hot-toast"
import { useNavigation } from "@/contexts/NavigationContext"

export default function NovoItemEstoque() {
  const { navigateTo } = useNavigation()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (itemData: any) => {
    try {
      setIsLoading(true)
      await estoqueService.criar(itemData)
      toast.success('Item adicionado ao estoque com sucesso!')
      navigateTo('estoque')
    } catch (err) {
      console.error('Erro ao criar item:', err)
      toast.error('Erro ao adicionar item. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    navigateTo('estoque')
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Package className="h-6 w-6" />
          Novo Item de Estoque
        </h1>
        <p className="text-muted-foreground">Adicione um novo item ao seu estoque</p>
      </div>

      {/* Formulário */}
      <EstoqueForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </div>
  )
}
