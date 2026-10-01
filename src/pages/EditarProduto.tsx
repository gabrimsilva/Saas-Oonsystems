import { useState, useEffect } from "react"
import { Package, Loader2 } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import ProdutoForm from "@/components/ProdutoForm"
import { produtoService, tamanhoService, categoriaService, type ProdutoSupabase } from "@/services"

interface Produto extends ProdutoSupabase {
  categoria: string
  urlImagem: string
  precoPromocional?: number
  saboresDisponiveis?: boolean
  quantidadeSabores?: number
  saboresSelecionados?: string[]
}

export default function EditarProduto() {
  const navigate = useNavigate()
  const { id: produtoId } = useParams<{ id: string }>()
  const [produto, setProduto] = useState<Produto | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (produtoId) {
      carregarProduto()
    }
  }, [produtoId])

  const carregarProduto = async () => {
    try {
      setLoading(true)
      setError(null)

      const [produtoData, categorias] = await Promise.all([
        produtoService.buscarPorId(produtoId!),
        categoriaService.buscarTodas()
      ])

      if (!produtoData) {
        setError('Produto não encontrado')
        return
      }

      const categoriaReal = categorias.find(cat => cat.id === produtoData.categoria_id)

      const produtoComAlias: Produto = {
        ...produtoData,
        categoria: categoriaReal ? categoriaReal.nome.toLowerCase() : produtoData.categoria_nome?.toLowerCase() || 'outros',
        urlImagem: produtoData.imagem_path || '',
        precoPromocional: produtoData.preco_promocional,
        saboresDisponiveis: false,
        quantidadeSabores: 1,
        saboresSelecionados: []
      }

      setProduto(produtoComAlias)
    } catch (err) {
      console.error('Erro ao carregar produto:', err)
      setError('Erro ao carregar produto')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (produtoAtualizado: any) => {
    try {
      setSaving(true)
      setError(null)

      console.log('📝 Iniciando atualização do produto:', { produtoId, produtoAtualizado })

      // IMPORTANTE: Apenas campos que existem na tabela produtos!
      // Não enviar campos duplicados ou aliases
      const produtoParaSalvar = {
        nome: produtoAtualizado.nome,
        descricao: produtoAtualizado.descricao,
        custo: produtoAtualizado.custo || 0,
        preco: produtoAtualizado.preco,
        preco_promocional: produtoAtualizado.precoPromocional || null,
        preco_online: produtoAtualizado.preco_online ?? null,
        preco_atacado: produtoAtualizado.preco_atacado ?? null,
        categoria_id: produtoAtualizado.categoria_id,
        categoria_nome: produtoAtualizado.categoria,
        imagem_path: produtoAtualizado.urlImagem,
        sabores_disponiveis: produtoAtualizado.saboresDisponiveis || false,
        quantidade_sabores: produtoAtualizado.quantidadeSabores || 1,
        permite_adicionais: produtoAtualizado.permite_adicionais || false,
        requires_stock: produtoAtualizado.requires_stock !== undefined ? produtoAtualizado.requires_stock : true,
        ativo: true
      }

      console.log('✅ Dados validados para atualização:', produtoParaSalvar)

      // Atualizar produto
      await produtoService.atualizar(produtoId!, produtoParaSalvar)
      console.log('✅ Produto atualizado com sucesso')

      // Atualizar tamanhos (se definido)
      if (produtoAtualizado.tamanhos !== undefined) {
        const tamanhosParaCriar = (produtoAtualizado.tamanhos || []).map((t: any, index: number) => ({
          nome: t.nome,
          valor: parseFloat(t.valor),
          tamanho: t.tamanho,
          ordem: index,
          ativo: true
        }))
        await tamanhoService.criarMultiplos(produtoId!, tamanhosParaCriar)
        console.log('✅ Tamanhos atualizados com sucesso')
      }

      console.log('🎉 Produto atualizado completamente!')
      navigate('/sistema/produtos')
    } catch (err) {
      console.error('❌ Erro ao atualizar produto:', err)
      setError('Erro ao atualizar produto.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    navigate('/sistema/produtos')
  }

  if (loading) {
    return (
      <div className="w-full p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Carregando produto...</span>
        </div>
      </div>
    )
  }

  if (error || !produto) {
    return (
      <div className="w-full p-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error || 'Produto não encontrado'}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Package className="h-6 w-6" />
          Editar Produto
        </h1>
        <p className="text-muted-foreground">
          Edite as informações do produto
        </p>
      </div>

      <ProdutoForm
        produtoParaEditar={produto}
        onSave={handleSave}
        onCancel={handleCancel}
        saving={saving}
      />
    </div>
  )
}
