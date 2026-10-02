import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ActionButton } from "@/components/ui/action-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import ImageUpload from "@/components/ImageUpload"
import { produtoService, type ProdutoSupabase, type ComboSupabase } from "@/services"

interface Produto extends ProdutoSupabase {
  categoria: string
}

interface Combo extends ComboSupabase {
  urlImagem?: string
  precoCombo: number
  precoOriginal: number
  produtosSelecionados: string[]
}

interface ComboFormProps {
  comboParaEditar?: Combo | null
  onSave: (combo: Omit<ComboSupabase, 'id' | 'criado_em' | 'atualizado_em'> & { produtosSelecionados: string[] }) => void
  onCancel: () => void
  saving?: boolean
}

export default function ComboForm({ comboParaEditar, onSave, onCancel, saving = false }: ComboFormProps) {
  const [nome, setNome] = useState("")
  const [descricao, setDescricao] = useState("")
  const [urlImagem, setUrlImagem] = useState("")
  const [precoCombo, setPrecoCombo] = useState("")
  const [produtosSelecionados, setProdutosSelecionados] = useState<string[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])

  useEffect(() => {
    carregarProdutos()
  }, [])

  const carregarProdutos = async () => {
    try {
      const produtosData = await produtoService.buscarTodos()
      const produtosComAlias = produtosData
        .map(produto => ({
          ...produto,
          categoria: produto.categoria_nome || 'outros'
        }))
        .filter(produto => produto.categoria !== 'combo')

      setProdutos(produtosComAlias)
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
      setProdutos([])
    }
  }

  useEffect(() => {
    if (comboParaEditar) {
      setNome(comboParaEditar.nome)
      setDescricao(comboParaEditar.descricao)
      setUrlImagem(comboParaEditar.urlImagem || "")
      setPrecoCombo(comboParaEditar.precoCombo.toString())
      setProdutosSelecionados(comboParaEditar.produtosSelecionados)
    } else {
      setNome("")
      setDescricao("")
      setUrlImagem("")
      setPrecoCombo("")
      setProdutosSelecionados([])
    }
  }, [comboParaEditar])

  const calcularPrecoOriginal = () => {
    return produtosSelecionados.reduce((total, produtoId) => {
      const produto = produtos.find(p => p.id === produtoId)
      return total + (produto?.preco || 0)
    }, 0)
  }

  const calcularDesconto = () => {
    const original = calcularPrecoOriginal()
    const combo = parseFloat(precoCombo) || 0
    if (original === 0) return 0
    return ((original - combo) / original) * 100
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!nome.trim() || !descricao.trim() || !precoCombo || produtosSelecionados.length < 2) return

    const precoOriginal = calcularPrecoOriginal()
    const desconto = calcularDesconto()

    const comboData = {
      nome: nome.trim(),
      descricao: descricao.trim(),
      url_imagem: urlImagem.trim() || undefined,
      preco_combo: parseFloat(precoCombo),
      preco_original: precoOriginal,
      desconto,
      ativo: true,
      produtosSelecionados
    }

    onSave(comboData)
  }

  const handleProdutoChange = (produtoId: string, checked: boolean) => {
    if (checked) {
      setProdutosSelecionados(prev => [...prev, produtoId])
    } else {
      setProdutosSelecionados(prev => prev.filter(id => id !== produtoId))
    }
  }

  const getCategoriaColor = (categoria: string) => {
    const colors = {
      pizza: 'bg-destructive/10 text-destructive',
      lanche: 'bg-success/10 text-success',
      bebida: 'bg-primary/10 text-primary',
      combo: 'bg-primary/10 text-primary'
    }
    return colors[categoria as keyof typeof colors] || 'bg-muted text-foreground'
  }

  const precoOriginal = calcularPrecoOriginal()
  const desconto = calcularDesconto()

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome do Combo</Label>
          <Input
            id="nome"
            type="text"
            placeholder="Ex: Combo Família..."
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="precoCombo">Preço do Combo (R$)</Label>
          <Input
            id="precoCombo"
            type="number"
            placeholder="0,00"
            step="0.01"
            min="0"
            value={precoCombo}
            onChange={(e) => setPrecoCombo(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição do Combo</Label>
        <textarea
          id="descricao"
          placeholder="Descreva o combo..."
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          required
          className="w-full min-h-[80px] px-3 py-2 border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md resize-none"
        />
      </div>

      <div className="grid gap-2">
        <span className="text-sm font-medium">Imagem do Combo</span>
        <ImageUpload
          currentImageUrl={urlImagem}
          onImageUploaded={setUrlImagem}
          bucketName="produtos-imagens"
          folder="combos"
          recommendedSize="400x300px"
          placeholder="Clique para fazer upload da imagem do combo"
          maxSizeMB={5}
        />
      </div>

      <div className="space-y-4 border-t pt-4">
        <div>
          <span className="text-sm font-medium block">Selecione os Produtos do Combo (mínimo 2)</span>
          <p className="text-sm text-muted-foreground">
            Escolha quais produtos farão parte deste combo
          </p>
        </div>

        <div className="max-h-60 overflow-y-auto border rounded-md p-3 space-y-3">
          {produtos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum produto disponível. Cadastre produtos primeiro.
            </p>
          ) : (
            produtos.map((produto) => (
              <div key={produto.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id={`produto-${produto.id}`}
                    checked={produtosSelecionados.includes(produto.id)}
                    onChange={(e) => handleProdutoChange(produto.id, e.target.checked)}
                    className="h-4 w-4 text-primary border-input rounded focus:ring-ring/30"
                  />
                  <div>
                    <Label htmlFor={`produto-${produto.id}`} className="flex items-center space-x-2">
                      <span className="font-medium">{produto.nome}</span>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${getCategoriaColor(produto.categoria)}`}>
                        {produto.categoria.charAt(0).toUpperCase() + produto.categoria.slice(1)}
                      </span>
                    </Label>
                    <p className="text-sm text-muted-foreground">{produto.descricao}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-[color:var(--price-color)]">
                    R$ {produto.preco.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {produtosSelecionados.length > 0 && (
        <div className="space-y-3 border-t pt-4 bg-muted/50 p-4 rounded-lg">
          <h4 className="font-semibold text-sm">Resumo do Combo:</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Preço Original:</span>
              <p className="font-semibold">R$ {precoOriginal.toFixed(2).replace('.', ',')}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Preço do Combo:</span>
              <p className="font-semibold text-success">
                R$ {(parseFloat(precoCombo) || 0).toFixed(2).replace('.', ',')}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Desconto:</span>
              <p className="font-semibold text-warning-foreground">
                {desconto.toFixed(1)}%
              </p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {produtosSelecionados.length} produto{produtosSelecionados.length > 1 ? 's' : ''} selecionado{produtosSelecionados.length > 1 ? 's' : ''}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <ActionButton 
          type="submit" 
          disabled={!nome.trim() || !descricao.trim() || !precoCombo || produtosSelecionados.length < 2}
          loading={saving}
        >
          {comboParaEditar ? "Atualizar" : "Criar Combo"}
        </ActionButton>
      </div>
    </form>
  )
}
