import { useState, useEffect, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ActionButton } from "@/components/ui/action-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Info } from "lucide-react"
import { categoriaService, type CategoriaSupabase, type SaborSupabase } from "@/services"

type Categoria = CategoriaSupabase

type SaborBorda = SaborSupabase & {
  isPremium: boolean
  valorPremium?: number
}

interface SaborBordaFormProps {
  saborInicial?: SaborBorda | null
  onSubmit: (sabor: { 
    nome: string
    descricao?: string
    isPremium: boolean
    valorPremium?: number
    tipo: string
    categoria_id?: string
    categoria_sabor?: 'tradicional' | 'especiais' | 'nobres' | 'doces' | 'doces_especiais' | 'refrigerante'
    tipo_sabor: 'borda'
  }) => Promise<void>
  onSubmitMultiple?: (sabores: Array<{ 
    nome: string
    descricao?: string
    isPremium: boolean
    valorPremium?: number
    tipo: string
    categoria_id?: string
    categoria_sabor?: 'tradicional' | 'especiais' | 'nobres' | 'doces' | 'doces_especiais' | 'refrigerante'
    tipo_sabor: 'borda'
  }>) => Promise<{ success: string[], failed: string[] }>
  onCancel: () => void
  isLoading?: boolean
}

export default function SaborBordaForm({ 
  saborInicial, 
  onSubmit, 
  onSubmitMultiple,
  onCancel,
  isLoading = false
}: SaborBordaFormProps) {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [nome, setNome] = useState("")
  const [descricao, setDescricao] = useState("")
  const [isPremium, setIsPremium] = useState(false)
  const [valorPremium, setValorPremium] = useState("")
  const [tipo, setTipo] = useState<string>('')
  const [categoriaSabor, setCategoriaSabor] = useState<'tradicional' | 'especiais' | 'nobres' | 'doces' | 'doces_especiais' | 'refrigerante'>('tradicional')
  const [loadingCategorias, setLoadingCategorias] = useState(true)
  const [criacaoMultipla, setCriacaoMultipla] = useState(false)
  const [categoriasMultiplas, setCategoriasMultiplas] = useState(false)
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<string[]>([])

  // Detectar múltiplos sabores separados por vírgula
  const saboresDetectados = useMemo(() => {
    if (!criacaoMultipla || !nome.trim()) return []
    return nome
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)
  }, [nome, criacaoMultipla])

  // Carregar categorias
  useEffect(() => {
    carregarCategorias()
  }, [])

  // Preencher campos quando há sabor inicial
  useEffect(() => {
    if (saborInicial) {
      setNome(saborInicial.nome)
      setDescricao((saborInicial as any).descricao || "")
      setIsPremium(saborInicial.isPremium)
      setValorPremium(saborInicial.valorPremium?.toString() || "")
      setTipo((saborInicial as any).categoria_id || '')
      setCategoriaSabor((saborInicial as any).categoria_sabor || 'tradicional')
      setCategoriasSelecionadas([(saborInicial as any).categoria_id || ''])
    }
  }, [saborInicial])

  // Sincronizar categoria única com categorias múltiplas
  useEffect(() => {
    if (!categoriasMultiplas && tipo && !categoriasSelecionadas.includes(tipo)) {
      setCategoriasSelecionadas([tipo])
    }
  }, [tipo, categoriasMultiplas])

  // Atualizar tipo quando desativar múltiplas categorias
  useEffect(() => {
    if (!categoriasMultiplas && categoriasSelecionadas.length > 0) {
      setTipo(categoriasSelecionadas[0])
    }
  }, [categoriasMultiplas, categoriasSelecionadas])

  const carregarCategorias = async () => {
    try {
      setLoadingCategorias(true)
      const categoriasAtivas = await categoriaService.buscarAtivas()
      
      // Filtrar apenas categorias que têm borda habilitada
      const categoriasComBorda = categoriasAtivas.filter(cat => (cat as any).tem_borda)
      setCategorias(categoriasComBorda)

      // Definir primeira categoria disponível como padrão se não houver sabor inicial
      if (!saborInicial && categoriasComBorda.length > 0) {
        setTipo(categoriasComBorda[0].id)
      }
    } catch (error) {
      setCategorias([])
    } finally {
      setLoadingCategorias(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!nome.trim()) return
    
    // Validar se tem categoria selecionada
    const categoriasParaUsar = categoriasMultiplas ? categoriasSelecionadas : [tipo]
    if (categoriasParaUsar.length === 0) return
    
    // Função auxiliar para mapear categoria
    const mapearTipoCategoria = (categoriaId: string) => {
      const categoria = categorias.find(cat => cat.id === categoriaId)
      let tipoCategoria = categoria?.nome.toLowerCase() || ''
      if (tipoCategoria.includes('pizza')) {
        tipoCategoria = 'pizza'
      } else if (tipoCategoria.includes('calzone')) {
        tipoCategoria = 'calzone'
      } else {
        tipoCategoria = categoria?.nome.toLowerCase().replace(/[^a-z0-9]/g, '') || ''
      }
      return { tipoCategoria, categoria }
    }
    
    // Se criação múltipla de nomes está ativa e há múltiplos sabores
    if (criacaoMultipla && saboresDetectados.length > 1 && onSubmitMultiple) {
      const saboresData: Array<any> = []
      
      // Para cada nome de sabor
      for (const nomeSabor of saboresDetectados) {
        // Para cada categoria selecionada
        for (const catId of categoriasParaUsar) {
          const { tipoCategoria, categoria } = mapearTipoCategoria(catId)
          saboresData.push({
            nome: nomeSabor,
            descricao: descricao.trim() || undefined,
            isPremium,
            valorPremium: isPremium ? parseFloat(valorPremium) || 0 : undefined,
            tipo: tipoCategoria,
            categoria_id: categoria?.id,
            categoria_sabor: categoriaSabor,
            tipo_sabor: 'borda' as const
          })
        }
      }
      
      await onSubmitMultiple(saboresData)
    } else if (categoriasMultiplas && categoriasSelecionadas.length > 1 && onSubmitMultiple) {
      // Múltiplas categorias mas nome único
      const saboresData = categoriasSelecionadas.map(catId => {
        const { tipoCategoria, categoria } = mapearTipoCategoria(catId)
        return {
          nome: nome.trim(),
          descricao: descricao.trim() || undefined,
          isPremium,
          valorPremium: isPremium ? parseFloat(valorPremium) || 0 : undefined,
          tipo: tipoCategoria,
          categoria_id: categoria?.id,
          categoria_sabor: categoriaSabor,
          tipo_sabor: 'borda' as const
        }
      })
      
      await onSubmitMultiple(saboresData)
    } else {
      // Criação única (comportamento padrão)
      const { tipoCategoria, categoria } = mapearTipoCategoria(categoriasParaUsar[0])
      const saborData = {
        nome: nome.trim(),
        descricao: descricao.trim() || undefined,
        isPremium,
        valorPremium: isPremium ? parseFloat(valorPremium) || 0 : undefined,
        tipo: tipoCategoria,
        categoria_id: categoria?.id,
        categoria_sabor: categoriaSabor,
        tipo_sabor: 'borda' as const
      }
      
      await onSubmit(saborData)
    }
  }

  const handleToggleCategoria = (catId: string) => {
    setCategoriasSelecionadas(prev => {
      if (prev.includes(catId)) {
        return prev.filter(id => id !== catId)
      } else {
        return [...prev, catId]
      }
    })
  }

  const handleSelecionarTodas = () => {
    if (categoriasSelecionadas.length === categorias.length) {
      setCategoriasSelecionadas([])
    } else {
      setCategoriasSelecionadas(categorias.map(cat => cat.id))
    }
  }

  if (loadingCategorias) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (categorias.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Info className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            Nenhuma categoria com borda disponível
          </h3>
          <p className="text-muted-foreground">
            Ative a opção "Essa categoria terá borda?" ao criar ou editar uma categoria
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informações do Sabor de Borda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toggle para criação múltipla - apenas em modo de criação */}
          {!saborInicial && (
            <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
              <input
                type="checkbox"
                id="criacaoMultipla"
                checked={criacaoMultipla}
                onChange={(e) => setCriacaoMultipla(e.target.checked)}
                disabled={isLoading}
                className="h-4 w-4 text-primary border-input rounded focus:ring-ring/30 disabled:opacity-50"
              />
              <Label htmlFor="criacaoMultipla" className="cursor-pointer">
                Criar múltiplos sabores de borda (separar por vírgula)
              </Label>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Sabor de Borda *</Label>
            <Input
              id="nome"
              type="text"
              placeholder={criacaoMultipla ? "Ex: Catupiry, Cheddar, Cream Cheese" : "Ex: Catupiry, Cheddar..."}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              disabled={isLoading}
            />
            {criacaoMultipla && saboresDetectados.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-primary/5 dark:bg-primary/20 border border-primary/20 dark:border-primary rounded-md">
                <Info className="h-4 w-4 text-primary dark:text-primary mt-0.5 flex-shrink-0" />
                <div className="text-sm text-primary dark:text-primary">
                  <p className="font-medium">
                    {saboresDetectados.length} {saboresDetectados.length === 1 ? 'sabor de borda será criado' : 'sabores de borda serão criados'}
                    {categoriasMultiplas && categoriasSelecionadas.length > 0 && 
                      ` em ${categoriasSelecionadas.length} ${categoriasSelecionadas.length === 1 ? 'categoria' : 'categorias'} (total: ${saboresDetectados.length * categoriasSelecionadas.length} sabores)`
                    }:
                  </p>
                  <ul className="mt-1 list-disc list-inside space-y-0.5">
                    {saboresDetectados.map((sabor, index) => (
                      <li key={index}>{sabor}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição do Sabor de Borda</Label>
            <textarea
              id="descricao"
              placeholder="Ex: cremoso, suave, sabor marcante..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              disabled={isLoading}
              className="w-full min-h-[100px] px-3 py-2 border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Descreva as características deste sabor de borda (opcional)
            </p>
          </div>

          {/* Toggle para múltiplas categorias - apenas em modo de criação */}
          {!saborInicial && (
            <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
              <input
                type="checkbox"
                id="categoriasMultiplas"
                checked={categoriasMultiplas}
                onChange={(e) => setCategoriasMultiplas(e.target.checked)}
                disabled={isLoading}
                className="h-4 w-4 text-primary border-input rounded focus:ring-ring/30 disabled:opacity-50"
              />
              <Label htmlFor="categoriasMultiplas" className="cursor-pointer">
                Adicionar em múltiplas categorias
              </Label>
            </div>
          )}

          {/* Seleção de categoria única */}
          {!categoriasMultiplas && (
            <div className="space-y-2">
              <Label htmlFor="tipo">Categoria do Produto *</Label>
              <select
                id="tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md"
              >
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Seleção de múltiplas categorias */}
          {categoriasMultiplas && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Categorias * (selecione uma ou mais)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelecionarTodas}
                  disabled={isLoading}
                >
                  {categoriasSelecionadas.length === categorias.length ? 'Desmarcar todas' : 'Selecionar todas'}
                </Button>
              </div>
              <div className="border border-input rounded-md p-3 space-y-2 max-h-[200px] overflow-y-auto">
                {categorias.map((categoria) => (
                  <div key={categoria.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`cat-${categoria.id}`}
                      checked={categoriasSelecionadas.includes(categoria.id)}
                      onChange={() => handleToggleCategoria(categoria.id)}
                      disabled={isLoading}
                      className="h-4 w-4 text-primary border-input rounded focus:ring-ring/30 disabled:opacity-50"
                    />
                    <Label htmlFor={`cat-${categoria.id}`} className="cursor-pointer flex-1">
                      {categoria.nome}
                    </Label>
                  </div>
                ))}
              </div>
              {categoriasSelecionadas.length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-success/5 dark:bg-success border border-success/30 dark:border-success rounded-md">
                  <Info className="h-4 w-4 text-success dark:text-success mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-success dark:text-success/60">
                    <p className="font-medium">
                      {categoriasSelecionadas.length} {categoriasSelecionadas.length === 1 ? 'categoria selecionada' : 'categorias selecionadas'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="categoriaSabor">Categoria do Sabor *</Label>
            <select
              id="categoriaSabor"
              value={categoriaSabor}
              onChange={(e) => setCategoriaSabor(e.target.value as any)}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md"
            >
              <option value="tradicional">Sabor Tradicional</option>
              <option value="especiais">Especiais</option>
              <option value="nobres">Nobres</option>
              <option value="doces">Doces</option>
              <option value="doces_especiais">Doces Especiais</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="premium"
              checked={isPremium}
              onChange={(e) => setIsPremium(e.target.checked)}
              disabled={isLoading}
              className="h-4 w-4 text-primary border-input rounded focus:ring-ring/30 disabled:opacity-50"
            />
            <Label htmlFor="premium">Sabor de Borda Premium?</Label>
          </div>
          
          {isPremium && (
            <div className="space-y-2">
              <Label htmlFor="valor">Valor Premium (R$) *</Label>
              <Input
                id="valor"
                type="number"
                placeholder="0,00"
                step="0.01"
                min="0"
                value={valorPremium}
                onChange={(e) => setValorPremium(e.target.value)}
                required={isPremium}
                disabled={isLoading}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <ActionButton
          type="submit"
          disabled={!nome.trim() || (categoriasMultiplas ? categoriasSelecionadas.length === 0 : !tipo.trim()) || (isPremium && !valorPremium)}
          loading={isLoading}
        >
          {saborInicial 
            ? "Atualizar Sabor de Borda" 
            : (() => {
                const totalNomes = criacaoMultipla && saboresDetectados.length > 1 ? saboresDetectados.length : 1
                const totalCategorias = categoriasMultiplas ? categoriasSelecionadas.length : 1
                const totalSabores = totalNomes * totalCategorias
                
                return totalSabores > 1 
                  ? `Criar ${totalSabores} Sabores de Borda`
                  : "Criar Sabor de Borda"
              })()
          }
        </ActionButton>
      </div>
    </form>
  )
}
