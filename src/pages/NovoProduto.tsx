import { useState } from "react"
import { Package } from "lucide-react"
import { useNavigation } from "@/contexts/NavigationContext"
import ProdutoForm from "@/components/ProdutoForm"
import { produtoService } from "@/services"
import { CabecalhoPagina } from '@/components/ui/feedback'

export default function NovoProduto() {
  const { navigateTo } = useNavigation()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async (novoProduto: any) => {
    try {
      setSaving(true)
      setError(null)

      const produtoParaSalvar = {
        nome: novoProduto.nome,
        descricao: novoProduto.descricao,
        custo: novoProduto.custo || 0,
        preco: novoProduto.preco,
        preco_promocional: novoProduto.precoPromocional,
        preco_online: novoProduto.preco_online ?? null,
        preco_atacado: novoProduto.preco_atacado ?? null,
        categoria_id: novoProduto.categoria_id,
        categoria_nome: novoProduto.categoria,
        imagem_path: novoProduto.urlImagem,
        sabores_disponiveis: novoProduto.saboresDisponiveis || false,
        quantidade_sabores: novoProduto.quantidadeSabores || 1,
        permite_adicionais: novoProduto.permite_adicionais || false,
        requires_stock: novoProduto.requires_stock ?? true,
        ativo: true
      }

      await produtoService.criar(produtoParaSalvar)

      navigateTo('produtos')
    } catch (err) {
      console.error('Erro ao salvar produto:', err)
      setError('Erro ao salvar produto.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    navigateTo('produtos')
  }

  return (
    <div className="w-full p-6 space-y-6">
      <CabecalhoPagina titulo="Novo produto" descricao="Preencha as informações do novo produto" icone={Package} />

      {error && (
        <div className="p-4 bg-destructive/5 border border-destructive/30 rounded-lg text-destructive">
          {error}
        </div>
      )}

      <ProdutoForm
        onSave={handleSave}
        onCancel={handleCancel}
        saving={saving}
      />
    </div>
  )
}
