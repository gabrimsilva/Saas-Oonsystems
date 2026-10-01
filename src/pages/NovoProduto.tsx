import { useState } from "react"
import { Package } from "lucide-react"
import { useNavigation } from "@/contexts/NavigationContext"
import ProdutoForm from "@/components/ProdutoForm"
import { produtoService, tamanhoService } from "@/services"

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

      const produtoCriado = await produtoService.criar(produtoParaSalvar)

      if (novoProduto.saboresSelecionados && novoProduto.saboresSelecionados.length > 0) {
        await produtoService.associarSabores(produtoCriado.id, novoProduto.saboresSelecionados)
      }

      if (novoProduto.tamanhos && novoProduto.tamanhos.length > 0) {
        const tamanhosParaCriar = novoProduto.tamanhos.map((t: any, index: number) => ({
          nome: t.nome,
          valor: parseFloat(t.valor),
          tamanho: t.tamanho,
          ordem: index,
          ativo: true
        }))
        await tamanhoService.criarMultiplos(produtoCriado.id, tamanhosParaCriar)
      }

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Package className="h-6 w-6" />
          Novo Produto
        </h1>
        <p className="text-muted-foreground">
          Preencha as informações do novo produto
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
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
