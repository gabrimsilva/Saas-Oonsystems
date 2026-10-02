import { useState } from "react"
import { Package2 } from "lucide-react"
import { useNavigation } from "@/contexts/NavigationContext"
import ComboForm from "@/components/ComboForm"
import { comboService, type ComboSupabase } from "@/services"

export default function NovoCombo() {
  const { navigateTo } = useNavigation()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async (novoCombo: Omit<ComboSupabase, 'id' | 'criado_em' | 'atualizado_em'> & { produtosSelecionados: string[] }) => {
    try {
      setSaving(true)
      setError(null)

      const comboData = {
        nome: novoCombo.nome,
        descricao: novoCombo.descricao,
        url_imagem: novoCombo.url_imagem,
        preco_combo: novoCombo.preco_combo,
        preco_original: novoCombo.preco_original,
        desconto: novoCombo.desconto,
        ativo: true
      }

      const comboCriado = await comboService.criar(comboData)

      if (novoCombo.produtosSelecionados.length > 0) {
        await comboService.associarProdutos(comboCriado.id, novoCombo.produtosSelecionados)
      }

      navigateTo('produtos')
    } catch (err) {
      console.error('Erro ao salvar combo:', err)
      setError('Erro ao salvar combo.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    navigateTo('produtos')
  }

  return (
    <div className="w-full p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Package2 className="h-6 w-6" />
          Novo Combo
        </h1>
        <p className="text-muted-foreground">
          Crie um novo combo selecionando produtos e definindo o preço
        </p>
      </div>

      {error && (
        <div className="p-4 bg-destructive/5 border border-destructive/30 rounded-lg text-destructive">
          {error}
        </div>
      )}

      <ComboForm
        onSave={handleSave}
        onCancel={handleCancel}
        saving={saving}
      />
    </div>
  )
}
