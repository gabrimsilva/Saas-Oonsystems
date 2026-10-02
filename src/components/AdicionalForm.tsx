import { useState, useEffect, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ActionButton } from "@/components/ui/action-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Info } from "lucide-react"
import { categoriaService, type CategoriaSupabase } from "@/services"

type Categoria = CategoriaSupabase

export interface AdicionalFormData {
  nome: string
  valor: number
  ativo: boolean
  categoria_id: string
}

interface AdicionalFormProps {
  adicionalInicial?: AdicionalFormData | null
  onSubmit: (adicional: AdicionalFormData) => Promise<void>
  onSubmitMultiple?: (adicionais: AdicionalFormData[]) => Promise<{ success: string[], failed: string[] }>
  onCancel: () => void
  isLoading?: boolean
}

export default function AdicionalForm({ 
  adicionalInicial, 
  onSubmit, 
  onSubmitMultiple,
  onCancel,
  isLoading = false
}: AdicionalFormProps) {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [nome, setNome] = useState("")
  const [valor, setValor] = useState("")
  const [ativo, setAtivo] = useState(true)
  const [categoriaId, setCategoriaId] = useState("")
  const [loadingCategorias, setLoadingCategorias] = useState(true)
  const [criacaoMultipla, setCriacaoMultipla] = useState(false)
  const [categoriasMultiplas, setCategoriasMultiplas] = useState(false)
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<string[]>([])

  // Detectar múltiplos adicionais separados por vírgula
  const adicionaisDetectados = useMemo(() => {
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

  // Preencher campos quando há adicional inicial
  useEffect(() => {
    if (adicionalInicial) {
      setNome(adicionalInicial.nome)
      setValor(adicionalInicial.valor.toString())
      setAtivo(adicionalInicial.ativo)
      setCategoriaId(adicionalInicial.categoria_id)
      setCategoriasSelecionadas([adicionalInicial.categoria_id])
    }
  }, [adicionalInicial])

  // Sincronizar categoria única com categorias múltiplas
  useEffect(() => {
    if (!categoriasMultiplas && categoriaId && !categoriasSelecionadas.includes(categoriaId)) {
      setCategoriasSelecionadas([categoriaId])
    }
  }, [categoriaId, categoriasMultiplas])

  // Atualizar categoriaId quando desativar múltiplas categorias
  useEffect(() => {
    if (!categoriasMultiplas && categoriasSelecionadas.length > 0) {
      setCategoriaId(categoriasSelecionadas[0])
    }
  }, [categoriasMultiplas, categoriasSelecionadas])

  const carregarCategorias = async () => {
    try {
      setLoadingCategorias(true)
      const categoriasAtivas = await categoriaService.buscarAtivas()
      
      // Filtrar apenas categorias que têm adicionais
      const categoriasComAdicionais = categoriasAtivas.filter(cat => (cat as any).tem_adicionais)
      setCategorias(categoriasComAdicionais)

      // Definir primeira categoria como padrão se não houver adicional inicial
      if (!adicionalInicial && categoriasComAdicionais.length > 0) {
        setCategoriaId(categoriasComAdicionais[0].id)
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
      setCategorias([])
    } finally {
      setLoadingCategorias(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!nome.trim() || !valor) return
    
    // Validar se tem categoria selecionada
    const categoriasParaUsar = categoriasMultiplas ? categoriasSelecionadas : [categoriaId]
    if (categoriasParaUsar.length === 0) return
    
    // Se criação múltipla de nomes está ativa e há múltiplos adicionais
    if (criacaoMultipla && adicionaisDetectados.length > 1 && onSubmitMultiple) {
      const adicionaisData: AdicionalFormData[] = []
      
      // Para cada nome de adicional
      for (const nomeAdicional of adicionaisDetectados) {
        // Para cada categoria selecionada
        for (const catId of categoriasParaUsar) {
          adicionaisData.push({
            nome: nomeAdicional,
            valor: parseFloat(valor),
            ativo,
            categoria_id: catId
          })
        }
      }
      
      await onSubmitMultiple(adicionaisData)
    } else if (categoriasMultiplas && categoriasSelecionadas.length > 1 && onSubmitMultiple) {
      // Múltiplas categorias mas nome único
      const adicionaisData = categoriasSelecionadas.map(catId => ({
        nome: nome.trim(),
        valor: parseFloat(valor),
        ativo,
        categoria_id: catId
      }))
      
      await onSubmitMultiple(adicionaisData)
    } else {
      // Criação única (comportamento padrão)
      const adicionalData: AdicionalFormData = {
        nome: nome.trim(),
        valor: parseFloat(valor),
        ativo,
        categoria_id: categoriasParaUsar[0]
      }
      
      await onSubmit(adicionalData)
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
          <p className="text-muted-foreground mb-4">
            Nenhuma categoria com adicionais disponível
          </p>
          <p className="text-sm text-muted-foreground">
            Ative a opção "Essa categoria terá adicionais?" ao criar ou editar uma categoria
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informações do Adicional</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toggle para criação múltipla - apenas em modo de criação */}
          {!adicionalInicial && (
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
                Criar múltiplos adicionais (separar por vírgula)
              </Label>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Adicional *</Label>
            <Input
              id="nome"
              type="text"
              placeholder={criacaoMultipla ? "Ex: Bacon, Catupiry, Cheddar" : "Ex: Bacon, Catupiry, Borda Recheada..."}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              disabled={isLoading}
            />
            {criacaoMultipla && adicionaisDetectados.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-primary/5 dark:bg-primary/20 border border-primary/20 dark:border-primary rounded-md">
                <Info className="h-4 w-4 text-primary dark:text-primary mt-0.5 flex-shrink-0" />
                <div className="text-sm text-primary dark:text-primary">
                  <p className="font-medium">
                    {adicionaisDetectados.length} {adicionaisDetectados.length === 1 ? 'adicional será criado' : 'adicionais serão criados'}
                    {categoriasMultiplas && categoriasSelecionadas.length > 0 && 
                      ` em ${categoriasSelecionadas.length} ${categoriasSelecionadas.length === 1 ? 'categoria' : 'categorias'} (total: ${adicionaisDetectados.length * categoriasSelecionadas.length} adicionais)`
                    }:
                  </p>
                  <ul className="mt-1 list-disc list-inside space-y-0.5">
                    {adicionaisDetectados.map((adicional, index) => (
                      <li key={index}>{adicional}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor">Valor (R$) *</Label>
            <Input
              id="valor"
              type="number"
              placeholder="0,00"
              step="0.01"
              min="0"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          {/* Toggle para múltiplas categorias - apenas em modo de criação */}
          {!adicionalInicial && (
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
              <Label htmlFor="categoria">Categoria *</Label>
              <select
                id="categoria"
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
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

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="ativo"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              disabled={isLoading}
              className="h-4 w-4 text-primary border-input rounded focus:ring-ring/30 disabled:opacity-50"
            />
            <Label htmlFor="ativo">Adicional ativo</Label>
          </div>
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
          disabled={!nome.trim() || !valor || (categoriasMultiplas ? categoriasSelecionadas.length === 0 : !categoriaId)}
          loading={isLoading}
        >
          {adicionalInicial 
            ? "Atualizar Adicional" 
            : (() => {
                const totalNomes = criacaoMultipla && adicionaisDetectados.length > 1 ? adicionaisDetectados.length : 1
                const totalCategorias = categoriasMultiplas ? categoriasSelecionadas.length : 1
                const totalAdicionais = totalNomes * totalCategorias
                
                return totalAdicionais > 1 
                  ? `Criar ${totalAdicionais} Adicionais`
                  : "Criar Adicional"
              })()
          }
        </ActionButton>
      </div>
    </form>
  )
}
