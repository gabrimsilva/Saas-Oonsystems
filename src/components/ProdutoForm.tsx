import { useState, useEffect } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ActionButton } from "@/components/ui/action-button"
import { Input } from "@/components/ui/input"
import { InputMoeda } from "@/components/ui/input-moeda"
import { Label } from "@/components/ui/label"
import ImageUpload from "@/components/ImageUpload"
import { categoriaService, type CategoriaSupabase, type ProdutoSupabase } from "@/services"

type Categoria = CategoriaSupabase

interface Produto extends ProdutoSupabase {
  categoria: string
  urlImagem: string
  precoPromocional?: number
}

interface ProdutoFormProps {
  produtoParaEditar?: Produto | null
  onSave: (produto: any) => void
  onCancel: () => void
  saving?: boolean
}

export default function ProdutoForm({ produtoParaEditar, onSave, onCancel, saving = false }: ProdutoFormProps) {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [nome, setNome] = useState("")
  const [descricao, setDescricao] = useState("")
  const [custo, setCusto] = useState(0)
  const [preco, setPreco] = useState(0)
  const [precoPromocional, setPrecoPromocional] = useState(0)
  const [categoria, setCategoria] = useState<string>("")
  const [urlImagem, setUrlImagem] = useState("")
  const [requiresStock, setRequiresStock] = useState(true)
  const [barcode, setBarcode] = useState("")

  // Carregar categorias do Supabase
  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    try {
      const categoriasData = await categoriaService.buscarTodas()

      const categoriasAtivas = categoriasData
        .filter(cat => cat.ativa)
        .sort((a, b) => a.ordem - b.ordem)
      setCategorias(categoriasAtivas)

      if (!produtoParaEditar && categoriasAtivas.length > 0) {
        setCategoria(categoriasAtivas[0].nome.toLowerCase())
      }
    } catch (error) {
      setCategorias([])
    }
  }

  useEffect(() => {
    if (produtoParaEditar) {
      setNome(produtoParaEditar.nome)
      setDescricao(produtoParaEditar.descricao)
      setCusto((produtoParaEditar as any).custo || 0)
      setPreco(produtoParaEditar.preco || 0)
      setPrecoPromocional(produtoParaEditar.precoPromocional || 0)
      setCategoria(produtoParaEditar.categoria)
      setUrlImagem(produtoParaEditar.urlImagem)
      setRequiresStock((produtoParaEditar as any).requires_stock ?? true)
      setBarcode((produtoParaEditar as any).barcode || "")
    } else {
      setNome("")
      setDescricao("")
      setCusto(0)
      setPreco(0)
      setPrecoPromocional(0)
      setCategoria('pizza')
      setUrlImagem("")
      setRequiresStock(true)
      setBarcode("")
    }
  }, [produtoParaEditar])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!nome.trim() || !descricao.trim() || !preco || !urlImagem) return

    const categoriaSelecionada = categorias.find(cat => {
      const catNome = cat.nome.toLowerCase()
      const categoriaLower = categoria.toLowerCase()

      if (catNome === categoriaLower) return true

      if ((catNome === 'pizza' && categoriaLower === 'pizzas') ||
        (catNome === 'pizzas' && categoriaLower === 'pizza')) return true

      if (catNome.includes('pizza') && categoriaLower.includes('pizza')) return true

      return false
    })

    const produtoData = {
      nome: nome.trim(),
      descricao: descricao.trim(),
      custo: custo >= 0 ? custo : 0,
      preco,
      preco_promocional: precoPromocional > 0 ? precoPromocional : null,
      precoPromocional: precoPromocional > 0 ? precoPromocional : null,
      categoria_id: categoriaSelecionada?.id || null,
      categoria_nome: categoria,
      categoria,
      imagem_path: urlImagem,
      urlImagem: urlImagem,
      sabores_disponiveis: false,
      saboresDisponiveis: false,
      quantidade_sabores: 1,
      quantidadeSabores: 1,
      ativo: true,
      permite_adicionais: false,
      saboresSelecionados: [],
      tamanhos: [],
      requires_stock: requiresStock,
      barcode: barcode.trim() || null
    }

    onSave(produtoData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome do Produto</Label>
        <Input
          id="nome"
          type="text"
          placeholder="Ex: Batom Matte Rosa..."
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="custo">Custo (R$)</Label>
        <InputMoeda
          id="custo"
          value={custo}
          onChange={setCusto}
          aria-invalid={custo > 0 && preco > 0 && custo > preco}
        />
        <p className="text-xs text-muted-foreground">
          Custo unitário do produto (usado para calcular o lucro nas métricas)
        </p>
        {custo > 0 && preco > 0 && custo > preco && (
          <p className="text-sm text-red-600 font-medium flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            O custo é maior que o preço de venda. Este produto dará prejuízo.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="preco">Preço (R$)</Label>
          <InputMoeda
            id="preco"
            value={preco}
            onChange={setPreco}
            required
            aria-invalid={custo > 0 && preco > 0 && custo > preco}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="precoPromocional">Preço Promocional (R$)</Label>
          <InputMoeda
            id="precoPromocional"
            placeholder="R$ 0,00 (opcional)"
            value={precoPromocional}
            onChange={setPrecoPromocional}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="barcode">Código de Barras (opcional)</Label>
        <Input
          id="barcode"
          type="text"
          placeholder="Ex: 7891234567890"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          maxLength={50}
        />
        <p className="text-xs text-muted-foreground">
          Use o leitor de código de barras ou digite manualmente
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição</Label>
        <textarea
          id="descricao"
          placeholder="Descreva o produto..."
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          required
          className="w-full min-h-[80px] px-3 py-2 border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="categoria">Categoria</Label>
        <select
          id="categoria"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="w-full px-3 py-2 border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md"
          disabled={categorias.length === 0}
        >
          {categorias.length > 0 ? (
            categorias.map((cat) => (
              <option key={cat.id} value={cat.nome.toLowerCase()}>
                {cat.nome}
              </option>
            ))
          ) : (
            <option value="">Nenhuma categoria cadastrada</option>
          )}
        </select>
        {categorias.length === 0 && (
          <p className="text-sm text-amber-600">
            ⚠️ Cadastre categorias antes de criar produtos
          </p>
        )}
        {precoPromocional > 0 && (
          <p className="text-sm text-green-600 font-medium">
            ✨ Este produto também aparecerá na seção de promoções
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <span className="text-sm font-medium">Imagem do Produto *</span>
        <ImageUpload
          currentImageUrl={urlImagem}
          onImageUploaded={setUrlImagem}
          bucketName="produtos-imagens"
          folder="produtos"
          recommendedSize="400x300px"
          placeholder="Clique para fazer upload da imagem do produto"
          maxSizeMB={5}
        />
      </div>

      {/* Toggle de Controle de Estoque */}
      <div className="space-y-3 border-t pt-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="requiresStock" className="text-base font-medium">
              Produto precisa de estoque
            </Label>
            <p className="text-sm text-muted-foreground">
              Se ativo, o sistema criará automaticamente o item no estoque
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={requiresStock}
            onClick={() => setRequiresStock(!requiresStock)}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors border-2
              ${requiresStock 
                ? 'bg-indigo-500 border-indigo-500' 
                : 'bg-gray-300 border-gray-400'
              }
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform
                ${requiresStock ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <ActionButton 
          type="submit" 
          disabled={!nome.trim() || !descricao.trim() || !preco || !urlImagem}
          loading={saving}
        >
          {produtoParaEditar ? "Atualizar" : "Salvar"}
        </ActionButton>
      </div>
    </form>
  )
}
