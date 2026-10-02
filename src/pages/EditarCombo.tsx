import { useState, useEffect } from "react"
import { Package2 } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import ComboForm from "@/components/ComboForm"
import { comboService, type ComboSupabase } from "@/services"
import { CarregandoPagina } from '@/components/ui/feedback'

interface Combo extends ComboSupabase {
  urlImagem?: string
  precoCombo: number
  precoOriginal: number
  produtosSelecionados: string[]
}

export default function EditarCombo() {
  const navigate = useNavigate()
  const { id: comboId } = useParams<{ id: string }>()
  const [combo, setCombo] = useState<Combo | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (comboId) {
      carregarCombo()
    }
  }, [comboId])

  const carregarCombo = async () => {
    try {
      setLoading(true)
      setError(null)

      const comboData = await comboService.buscarPorId(comboId!)
      
      if (!comboData) {
        setError('Combo não encontrado')
        return
      }

      const produtosCombo = await comboService.buscarProdutosCombo(comboId!)

      const comboComAlias: Combo = {
        ...comboData,
        urlImagem: comboData.url_imagem,
        precoCombo: comboData.preco_combo,
        precoOriginal: comboData.preco_original,
        produtosSelecionados: produtosCombo.map(p => p.id)
      }

      setCombo(comboComAlias)
    } catch (err) {
      console.error('Erro ao carregar combo:', err)
      setError('Erro ao carregar combo')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (comboAtualizado: Omit<ComboSupabase, 'id' | 'criado_em' | 'atualizado_em'> & { produtosSelecionados: string[] }) => {
    try {
      setSaving(true)
      setError(null)

      const comboData = {
        nome: comboAtualizado.nome,
        descricao: comboAtualizado.descricao,
        url_imagem: comboAtualizado.url_imagem,
        preco_combo: comboAtualizado.preco_combo,
        preco_original: comboAtualizado.preco_original,
        desconto: comboAtualizado.desconto,
        ativo: true
      }

      await comboService.atualizar(comboId!, comboData)

      if (comboAtualizado.produtosSelecionados.length > 0) {
        await comboService.associarProdutos(comboId!, comboAtualizado.produtosSelecionados)
      }

      navigate('/sistema/produtos')
    } catch (err) {
      console.error('Erro ao atualizar combo:', err)
      setError('Erro ao atualizar combo.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    navigate('/sistema/produtos')
  }

  if (loading) {
    return <CarregandoPagina variante="formulario" />
  }

  if (error || !combo) {
    return (
      <div className="w-full p-6">
        <div className="p-4 bg-destructive/5 border border-destructive/30 rounded-lg text-destructive">
          {error || 'Combo não encontrado'}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Package2 className="h-6 w-6" />
          Editar Combo
        </h1>
        <p className="text-muted-foreground">
          Edite as informações do combo
        </p>
      </div>

      <ComboForm
        comboParaEditar={combo}
        onSave={handleSave}
        onCancel={handleCancel}
        saving={saving}
      />
    </div>
  )
}
