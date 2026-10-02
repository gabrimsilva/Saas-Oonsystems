import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter
} from "@/components/ui/alert-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Minus, Check, Search, X } from "lucide-react"
import { produtoService, tamanhoService } from "@/services"
import EscolherAdicionaisModal from "@/components/EscolherAdicionaisModal"

interface Sabor {
  id: string
  nome: string
  descricao?: string
  categoria: 'doce' | 'salgada'
  ingredientes: string[]
  preco: number
  categoria_sabor?: string
  tipo_sabor?: string
  is_premium?: boolean
}

interface Borda {
  id: string
  nome: string
  preco: number
}

interface Tamanho {
  id: string
  nome: string
  valor: number
  tamanho: string
}

interface Produto {
  id: string
  nome: string
  descricao: string
  preco: number
  precoPromocional?: number
  categoria: string
  urlImagem: string
  saboresDisponiveis?: boolean
  quantidadeSabores?: number
  quantidade_sabores?: number
  saboresSelecionados?: string[]
}

interface Categoria {
  id: string
  nome: string
  tem_sabores?: boolean
  tem_borda?: boolean
  tem_tamanhos?: boolean
  tem_adicionais?: boolean
}

interface AdicionalSelecionado {
  id: string
  nome: string
  valor: number
  quantidade: number
}

interface EscolherSaborModalProps {
  isOpen: boolean
  onClose: () => void
  produto: Produto | null
  categoria: Categoria | null
  onConfirm: (saboresSelecionados: Sabor[], bordaSelecionada: Borda | null, tamanhoSelecionado?: Tamanho | null, quantidade?: number, adicionais?: AdicionalSelecionado[], observacoes?: string) => void
  variant?: 'default' | 'delivery' // 'default' usa --primary (admin), 'delivery' usa vermelho
}



export default function EscolherSaborModal({ isOpen, onClose, produto, categoria, onConfirm, variant = 'delivery' }: EscolherSaborModalProps) {
  const [sabores, setSabores] = useState<Sabor[]>([])
  const [bordas, setBordas] = useState<Borda[]>([])
  const [tamanhos, setTamanhos] = useState<Tamanho[]>([])
  const [saboresSelecionados, setSaboresSelecionados] = useState<Sabor[]>([])
  const [bordaSelecionada, setBordaSelecionada] = useState<Borda | null>(null)
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState<Tamanho | null>(null)
  const [quantidade, setQuantidade] = useState(1)
  const [loading, setLoading] = useState(false)
  const [pesquisaSabor, setPesquisaSabor] = useState("")
  const [modalAdicionaisAberto, setModalAdicionaisAberto] = useState(false)

  // Carregar sabores, bordas e tamanhos do Supabase baseado na categoria
  useEffect(() => {
    if (isOpen && produto && categoria) {
      const temSabores = categoria.tem_sabores || produto.saboresDisponiveis
      const temBorda = categoria.tem_borda
      const produtoPermiteAdicionais = (produto as any)?.permite_adicionais
      const categoriaTemAdicionais = categoria?.tem_adicionais

      if (temSabores) {
        carregarSabores()
      } else {
        setSabores([])
        setSaboresSelecionados([])
      }

      if (temBorda) {
        carregarBordas()
      } else {
        setBordas([])
        setBordaSelecionada(null)
      }

      // SEMPRE tentar carregar tamanhos, independente da flag da categoria
      carregarTamanhos()

      // Se não tem sabores, bordas ou tamanhos, mas tem adicionais, abrir modal de adicionais direto
      console.log('Verificando adicionais:', {
        temSabores,
        temBorda,
        produtoPermiteAdicionais,
        categoriaTemAdicionais,
        categoriaId: categoria?.id
      })
      
      if (!temSabores && !temBorda && produtoPermiteAdicionais && categoriaTemAdicionais) {
        console.log('Abrindo modal de adicionais automaticamente')
        // Pequeno delay para garantir que o modal principal foi montado
        setTimeout(() => {
          setModalAdicionaisAberto(true)
        }, 100)
      }
    }
  }, [isOpen, produto, categoria])

  const carregarSabores = async () => {
    try {
      setLoading(true)

      // Carregar apenas sabores configurados para este produto específico
      if (!produto) {
        console.log('Produto não encontrado para carregar sabores')
        return
      }

      console.log('Carregando sabores para produto:', produto.id, produto.nome)
      const saboresAssociados = await produtoService.buscarSaboresProduto(produto.id)

      console.log('Sabores associados ao produto:', saboresAssociados)

      if (saboresAssociados && saboresAssociados.length > 0) {
        // Separar sabores principais e bordas usando tipo_sabor
        const saboresPrincipais = saboresAssociados.filter(sabor =>
          (sabor as any).tipo_sabor === 'normal'
        )
        const saboresBorda = saboresAssociados.filter(sabor =>
          (sabor as any).tipo_sabor === 'borda'
        )

        console.log('Sabores principais:', saboresPrincipais)
        console.log('Sabores de borda:', saboresBorda)

        // Mapear sabores principais
        const saboresFormatados = saboresPrincipais.map(sabor => ({
          id: sabor.id,
          nome: sabor.nome,
          descricao: (sabor as any).descricao || undefined, // Usar descrição real do banco ou undefined
          categoria: (sabor as any).categoria_sabor === 'doces' || (sabor as any).categoria_sabor === 'doces_especiais' ? 'doce' as const : 'salgada' as const,
          ingredientes: [],
          preco: sabor.valor_premium || 0,
          // Preservar dados originais do sabor para uso na organização
          categoria_sabor: (sabor as any).categoria_sabor,
          tipo_sabor: (sabor as any).tipo_sabor,
          is_premium: sabor.is_premium
        } as Sabor & { categoria_sabor: string; tipo_sabor: string; is_premium: boolean }))

        console.log('Sabores formatados com categoria_sabor:', saboresFormatados)
        setSabores(saboresFormatados)

        // Bordas serão carregadas separadamente se a categoria permitir
      } else {
        // Produto não tem sabores configurados
        console.log('Produto não tem sabores configurados')
        setSabores([])
        setBordas([])
      }

    } catch (error) {
      console.error('Erro ao carregar sabores:', error)

      // Em caso de erro, não adicionar bordas automáticas
      setBordas([])
      setBordaSelecionada(null)
    } finally {
      setLoading(false)
    }
  }

  const carregarTamanhos = async () => {
    console.log('carregarTamanhos - produto:', produto)

    if (!produto) {
      setTamanhos([])
      return
    }

    try {
      const tamanhosData = await tamanhoService.buscarPorProduto(produto.id)
      console.log('Tamanhos carregados:', tamanhosData)

      if (tamanhosData && tamanhosData.length > 0) {
        const tamanhosFormatados = tamanhosData.map(tamanho => ({
          id: tamanho.id,
          nome: tamanho.nome,
          valor: tamanho.valor,
          tamanho: tamanho.tamanho
        }))

        console.log('Tamanhos formatados:', tamanhosFormatados)
        setTamanhos(tamanhosFormatados)
        setTamanhoSelecionado(tamanhosFormatados[0] || null)
      } else {
        console.log('Produto não tem tamanhos configurados')
        setTamanhos([])
        setTamanhoSelecionado(null)
      }
    } catch (error) {
      console.error('Erro ao carregar tamanhos:', error)
      setTamanhos([])
    }
  }

  const carregarBordas = async () => {
    if (!produto) {
      setBordas([])
      return
    }

    try {
      // Carregar sabores associados ao produto e filtrar apenas bordas
      const saboresAssociados = await produtoService.buscarSaboresProduto(produto.id)

      if (saboresAssociados && saboresAssociados.length > 0) {
        const saboresBorda = saboresAssociados.filter(sabor =>
          (sabor as any).tipo_sabor === 'borda'
        )

        if (saboresBorda.length > 0) {
          const bordasFormatadas = saboresBorda.map(sabor => ({
            id: sabor.id,
            nome: sabor.nome,
            preco: sabor.valor_premium || 0
          }))

          setBordas(bordasFormatadas)
          setBordaSelecionada(bordasFormatadas[0] || null)
        } else {
          setBordas([])
          setBordaSelecionada(null)
        }
      } else {
        setBordas([])
        setBordaSelecionada(null)
      }
    } catch (error) {
      console.error('Erro ao carregar bordas:', error)
      setBordas([])
      setBordaSelecionada(null)
    }
  }

  // Resetar seleções quando o modal abre
  useEffect(() => {
    if (isOpen) {
      setSaboresSelecionados([])
      setBordaSelecionada(bordas[0] || null)
      setTamanhoSelecionado(tamanhos[0] || null)
      setQuantidade(1)
      setPesquisaSabor("")
    }
  }, [isOpen, bordas, tamanhos])

  const maxSabores = produto?.quantidade_sabores || produto?.quantidadeSabores || 1

  // Função para filtrar sabores pela pesquisa
  const filtrarSabores = (sabores: Sabor[]) => {
    if (!pesquisaSabor.trim()) return sabores
    
    return sabores.filter(sabor => 
      sabor.nome.toLowerCase().includes(pesquisaSabor.toLowerCase()) ||
      (sabor.descricao && sabor.descricao.toLowerCase().includes(pesquisaSabor.toLowerCase()))
    )
  }

  // Função para agrupar sabores por categoria
  const agruparSaboresPorCategoria = () => {
    const grupos: Record<string, Sabor[]> = {}

    // Primeiro filtrar sabores pela pesquisa
    const saboresFiltrados = filtrarSabores(sabores)

    saboresFiltrados.forEach(sabor => {
      // Usar categoria_sabor do sabor original (do banco de dados)
      const categoriaSabor = (sabor as any).categoria_sabor || 'tradicional'

      if (!grupos[categoriaSabor]) {
        grupos[categoriaSabor] = []
      }
      grupos[categoriaSabor].push(sabor)
    })

    // Ordenar sabores dentro de cada categoria alfabeticamente
    Object.keys(grupos).forEach(categoria => {
      grupos[categoria].sort((a, b) => a.nome.localeCompare(b.nome))
    })

    return grupos
  }

  // Função para obter nome de exibição da categoria
  const obterNomeCategoriaSabor = (categoria: string): string => {
    const nomes: Record<string, string> = {
      'tradicional': 'Sabores Tradicionais',
      'especiais': 'Sabores Especiais',
      'nobres': 'Sabores Nobres',
      'doces': 'Sabores Doces',
      'doces_especiais': 'Sabores Doces Especiais',
      'refrigerante': 'Sabores de Refrigerante'
    }
    return nomes[categoria] || categoria.charAt(0).toUpperCase() + categoria.slice(1)
  }

  // Definir ordem das categorias
  const ordemCategorias = ['tradicional', 'especiais', 'nobres', 'doces', 'doces_especiais', 'refrigerante']

  const toggleSabor = (sabor: Sabor) => {
    if (saboresSelecionados.find(s => s.id === sabor.id)) {
      setSaboresSelecionados(saboresSelecionados.filter(s => s.id !== sabor.id))
    } else if (saboresSelecionados.length < maxSabores) {
      setSaboresSelecionados([...saboresSelecionados, sabor])
    }
  }

  const calcularPrecoTotal = () => {
    // Se tem tamanho selecionado, usar o valor do tamanho como preço base
    let precoBase = 0
    if (tamanhoSelecionado) {
      precoBase = tamanhoSelecionado.valor
    } else {
      precoBase = (produto?.precoPromocional && produto.precoPromocional > 0)
        ? produto.precoPromocional
        : produto?.preco || 0
    }

    const precoBorda = (bordas.length > 0 && bordaSelecionada?.preco) ? bordaSelecionada.preco : 0
    const precoSabores = saboresSelecionados.reduce((total, sabor) => total + (sabor.preco || 0), 0)
    return (precoBase + precoBorda + precoSabores) * quantidade
  }

  const handleConfirmar = () => {
    console.log('🚀 handleConfirmar INICIADO')
    console.log('📋 Categoria tem tamanhos?', categoria?.tem_tamanhos)
    console.log('📋 Tamanhos disponíveis:', tamanhos.length)
    console.log('📋 Tamanho selecionado?', tamanhoSelecionado)
    console.log('📋 Categoria tem sabores?', categoria?.tem_sabores)
    console.log('📋 Produto tem sabores?', produto?.saboresDisponiveis)
    console.log('📋 Sabores disponíveis:', sabores.length)
    console.log('📋 Sabores selecionados:', saboresSelecionados.length)
    
    // Se a categoria tem tamanhos e há tamanhos disponíveis, tamanho é obrigatório
    if (categoria?.tem_tamanhos && tamanhos.length > 0 && !tamanhoSelecionado) {
      console.log('❌ RETURN: Tamanho obrigatório não selecionado')
      return
    }
    // Se a categoria tem sabores e há sabores disponíveis, pelo menos um sabor é obrigatório
    if ((categoria?.tem_sabores || produto?.saboresDisponiveis) && sabores.length > 0 && saboresSelecionados.length === 0) {
      console.log('❌ RETURN: Sabor obrigatório não selecionado')
      return
    }

    console.log('🎯 handleConfirmar passou nas validações')
    console.log('📋 Produto permite adicionais?', (produto as any)?.permite_adicionais)
    console.log('📋 Categoria tem adicionais?', categoria?.tem_adicionais)
    console.log('📋 Categoria ID?', categoria?.id)

    // Verificar se o produto permite adicionais
    const produtoPermiteAdicionais = (produto as any)?.permite_adicionais
    const categoriaTemAdicionais = categoria?.tem_adicionais

    if (produtoPermiteAdicionais && categoriaTemAdicionais && categoria?.id) {
      // Abrir modal de adicionais
      console.log('✅ Abrindo modal de adicionais')
      setModalAdicionaisAberto(true)
    } else {
      // Confirmar diretamente sem observações quando não há adicionais
      console.log('✅ Confirmando sem adicionais e sem observações')
      const bordaParaEnviar = bordas.length > 0 ? bordaSelecionada : null
      onConfirm(saboresSelecionados, bordaParaEnviar, tamanhoSelecionado, quantidade, [], undefined)
      onClose()
    }
  }

  const handleConfirmarComAdicionais = (adicionais: AdicionalSelecionado[]) => {
    console.log('✅ Confirmando com adicionais:', adicionais)
    // Confirmar diretamente sem observações após adicionais
    const bordaParaEnviar = bordas.length > 0 ? bordaSelecionada : null
    onConfirm(saboresSelecionados, bordaParaEnviar, tamanhoSelecionado, quantidade, adicionais, undefined)
    onClose()
  }

  const handleFecharModalAdicionais = () => {
    setModalAdicionaisAberto(false)
    // Se não tem sabores, bordas ou tamanhos, fechar o modal principal também
    const temSabores = categoria?.tem_sabores || produto?.saboresDisponiveis
    const temBorda = categoria?.tem_borda
    const temTamanhos = categoria?.tem_tamanhos
    if (!temSabores && !temBorda && !temTamanhos) {
      onClose()
    }
  }

  if (!produto) return null

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="w-[550px] h-[604px] max-w-[calc(100%-20px)] max-h-[90vh] max-md:!p-0 max-md:flex max-md:flex-col">
        {/* Botão fechar mobile */}
        <button
          onClick={onClose}
          className="hidden max-md:block absolute right-4 top-4 z-20 rounded-full bg-card p-2 hover:bg-accent transition-colors shadow-md cursor-pointer"
          aria-label="Fechar"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>

        <AlertDialogHeader className="max-md:p-4 max-md:pb-2 max-md:sticky max-md:top-0 max-md:bg-card max-md:z-10 max-md:border-b">
          <AlertDialogTitle className="text-xl font-bold max-md:pr-10">
            Personalize seu Pedido
          </AlertDialogTitle>
          <AlertDialogDescription>
            {tamanhos.length > 0
              ? 'Escolha o tamanho'
              : `Escolha ${maxSabores > 1 ? `até ${maxSabores} sabores` : '1 sabor'}${bordas.length > 0 ? ' e o tipo de borda' : ''}`
            }
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ScrollArea className="max-h-[400px] pr-6 max-md:max-h-none max-md:flex-1 max-md:overflow-y-auto max-md:pr-0">
          <div className="space-y-6 pb-4 max-md:px-4 max-md:pb-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-destructive mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando sabores...</p>
            </div>
          ) : (
            <>
              {/* Seleção de Tamanhos - se há tamanhos configurados */}
              {tamanhos.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Tamanhos Disponíveis</h3>
                  <div className="space-y-2">
                    {tamanhos.map((tamanho) => (
                      <div
                        key={tamanho.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-all flex items-center justify-between ${tamanhoSelecionado?.id === tamanho.id
                          ? 'border-destructive bg-destructive/5'
                          : 'border-border hover:bg-accent'
                          }`}
                        onClick={() => setTamanhoSelecionado(tamanho)}
                      >
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{tamanho.nome}</h4>
                          <Badge variant="outline" className="text-xs">
                            {tamanho.tamanho}
                          </Badge>
                          {tamanhoSelecionado?.id === tamanho.id && (
                            <Check className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                        <span className="text-sm font-bold text-destructive">
                          R$ {tamanho.valor.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Seleção de Sabores - se a categoria permite sabores */}
              {(categoria?.tem_sabores || produto?.saboresDisponiveis) && sabores.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">
                    Sabores ({saboresSelecionados.length}/{maxSabores})
                  </h3>
                  
                  {/* Campo de pesquisa */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/70 h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="Pesquisar sabores..."
                      value={pesquisaSabor}
                      onChange={(e) => setPesquisaSabor(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {sabores.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Nenhum sabor disponível.</p>
                      <p className="text-sm">Cadastre sabores na página de configurações.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {(() => {
                        const saboresAgrupados = agruparSaboresPorCategoria()
                        const temResultados = Object.values(saboresAgrupados).some(grupo => grupo.length > 0)

                        if (!temResultados && pesquisaSabor.trim()) {
                          return (
                            <div className="text-center py-8 text-muted-foreground">
                              <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                              <p>Nenhum sabor encontrado para "{pesquisaSabor}"</p>
                              <p className="text-sm">Tente pesquisar com outros termos</p>
                            </div>
                          )
                        }

                        return ordemCategorias
                          .filter(categoria => saboresAgrupados[categoria] && saboresAgrupados[categoria].length > 0)
                          .map(categoria => (
                            <div key={categoria} className="space-y-3">
                              {/* Título da categoria */}
                              <div className="border-b border-border pb-2">
                                <h4 className="text-md font-semibold text-foreground">
                                  {obterNomeCategoriaSabor(categoria)}
                                </h4>
                              </div>

                              {/* Sabores da categoria */}
                              <div className="space-y-2">
                                {saboresAgrupados[categoria].map((sabor) => {
                                  const isSelected = saboresSelecionados.find(s => s.id === sabor.id)
                                  const canSelect = saboresSelecionados.length < maxSabores

                                  return (
                                    <div
                                      key={sabor.id}
                                      className={`p-3 border rounded-lg cursor-pointer transition-all flex items-center justify-between ${isSelected
                                        ? 'border-destructive bg-destructive/5'
                                        : canSelect
                                          ? 'border-border hover:bg-accent'
                                          : 'border-border opacity-50 cursor-not-allowed'
                                        }`}
                                      onClick={() => (isSelected || canSelect) && toggleSabor(sabor)}
                                    >
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <h4 className="font-medium text-sm">{sabor.nome}</h4>
                                          {isSelected && (
                                            <Check className="h-4 w-4 text-destructive" />
                                          )}
                                          {/* Não mostrar badge para refrigerantes */}
                                          {(sabor as any).categoria_sabor !== 'refrigerante' && (
                                            <Badge variant="outline" className="text-xs">
                                              {sabor.categoria}
                                            </Badge>
                                          )}
                                        </div>
                                        {sabor.descricao && (
                                          <p className="text-xs text-muted-foreground">{sabor.descricao}</p>
                                        )}
                                      </div>
                                      <span className="text-sm font-bold text-destructive ml-3">
                                        +R$ {(sabor.preco || 0).toFixed(2).replace('.', ',')}
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ))
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* Seleção de Borda - se há bordas configuradas */}
              {categoria?.tem_borda && bordas.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Tipo de Borda</h3>
                  <div className="space-y-2">
                    {bordas.map((borda) => (
                      <div
                        key={borda.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-all flex items-center justify-between ${bordaSelecionada?.id === borda.id
                          ? 'border-destructive bg-destructive/5'
                          : 'border-border hover:bg-accent'
                          }`}
                        onClick={() => setBordaSelecionada(borda)}
                      >
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{borda.nome}</h4>
                          {bordaSelecionada?.id === borda.id && (
                            <Check className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                        <span className="text-sm text-destructive font-semibold">
                          {borda.preco === 0 ? 'Grátis' : `+R$ ${borda.preco.toFixed(2).replace('.', ',')}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantidade e Total */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Quantidade</h3>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
                      className="h-8 w-8 p-0 cursor-pointer"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="font-semibold text-lg min-w-[40px] text-center">
                      {quantidade}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuantidade(quantidade + 1)}
                      className="h-8 w-8 p-0 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">Total</p>
                  <p className="text-2xl font-bold text-destructive">
                    R$ {calcularPrecoTotal().toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </div>
            </>
          )}
          </div>
        </ScrollArea>

        <AlertDialogFooter className="pt-4 border-t bg-card max-md:sticky max-md:bottom-0 max-md:p-4 max-md:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmar}
              disabled={
                (categoria?.tem_tamanhos && tamanhos.length > 0 && !tamanhoSelecionado) ||
                ((categoria?.tem_sabores || produto?.saboresDisponiveis) && sabores.length > 0 && saboresSelecionados.length === 0)
              }
              className={variant === 'delivery' ? 'bg-primary hover:bg-primary-hover flex-1 cursor-pointer' : 'flex-1'}
            >
              Adicionar ao Carrinho
            </Button>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>

      {/* Modal de Adicionais */}
      <EscolherAdicionaisModal
        isOpen={modalAdicionaisAberto}
        onClose={handleFecharModalAdicionais}
        categoriaId={categoria?.id || ''}
        onConfirm={handleConfirmarComAdicionais}
        variant={variant}
      />
    </AlertDialog>
  )
}