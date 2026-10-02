import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter
} from "@/components/ui/alert-dialog"
import { X, Plus, Minus, Check } from "lucide-react"
import { comboService, produtoService, tamanhoService, type ComboSupabase, type ProdutoSupabase } from "@/services"

interface Sabor {
  id: string
  nome: string
  descricao: string
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

interface ProdutoCombo extends ProdutoSupabase {
  saboresSelecionados?: Sabor[]
  bordaSelecionada?: Borda
  tamanhoSelecionado?: Tamanho
}

interface EscolherComboPersonalizadoModalProps {
  isOpen: boolean
  onClose: () => void
  combo: ComboSupabase | null
  onConfirm: (produtosPersonalizados: ProdutoCombo[], quantidade: number, observacoes?: string) => void
  variant?: 'default' | 'delivery' // 'default' usa --primary (admin), 'delivery' usa vermelho
}

export default function EscolherComboPersonalizadoModal({
  isOpen,
  onClose,
  combo,
  onConfirm,
  variant = 'delivery'
}: EscolherComboPersonalizadoModalProps) {
  const [produtosCombo, setProdutosCombo] = useState<ProdutoSupabase[]>([])
  const [produtosPersonalizados, setProdutosPersonalizados] = useState<ProdutoCombo[]>([])
  const [produtoAtual, setProdutoAtual] = useState<number>(0)
  const [quantidade, setQuantidade] = useState(1)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  // Estados para o produto atual
  const [saboresDisponiveis, setSaboresDisponiveis] = useState<Sabor[]>([])
  const [bordasDisponiveis, setBordasDisponiveis] = useState<Borda[]>([])
  const [tamanhosDisponiveis, setTamanhosDisponiveis] = useState<Tamanho[]>([])
  const [saboresSelecionados, setSaboresSelecionados] = useState<Sabor[]>([])
  const [bordaSelecionada, setBordaSelecionada] = useState<Borda | null>(null)
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState<Tamanho | null>(null)

  // Estado para rastrear quais produtos têm tamanhos/sabores obrigatórios
  const [produtosComTamanhos, setProdutosComTamanhos] = useState<boolean[]>([])
  const [produtosComSabores, setProdutosComSabores] = useState<boolean[]>([])

  useEffect(() => {
    if (isOpen && combo) {
      setInitialLoading(true)
      carregarProdutosCombo()
    } else {
      resetarEstados()
    }
  }, [isOpen, combo])

  useEffect(() => {
    if (produtosCombo.length > 0 && produtoAtual < produtosCombo.length) {
      carregarDadosProdutoAtual()
    }
  }, [produtoAtual, produtosCombo])

  // Carregar personalizações salvas quando mudar de produto
  useEffect(() => {
    if (produtosPersonalizados.length > 0 && produtoAtual < produtosPersonalizados.length) {
      const produtoSalvo = produtosPersonalizados[produtoAtual]
      if (produtoSalvo.saboresSelecionados || produtoSalvo.bordaSelecionada || produtoSalvo.tamanhoSelecionado) {
        setSaboresSelecionados(produtoSalvo.saboresSelecionados || [])
        setBordaSelecionada(produtoSalvo.bordaSelecionada || null)
        setTamanhoSelecionado(produtoSalvo.tamanhoSelecionado || null)
      }
    }
  }, [produtoAtual, produtosPersonalizados])

  const resetarEstados = () => {
    setProdutosCombo([])
    setProdutosPersonalizados([])
    setProdutoAtual(0)
    setQuantidade(1)
    setSaboresDisponiveis([])
    setBordasDisponiveis([])
    setTamanhosDisponiveis([])
    setSaboresSelecionados([])
    setBordaSelecionada(null)
    setTamanhoSelecionado(null)
    setProdutosComTamanhos([])
    setProdutosComSabores([])
    setInitialLoading(true)
  }

  const carregarProdutosCombo = async () => {
    if (!combo) return

    try {
      setLoading(true)
      const produtos = await comboService.buscarProdutosCombo(combo.id)
      setProdutosCombo(produtos)
      setProdutosPersonalizados(produtos.map(p => ({ ...p })))

      // Mapear quais produtos têm sabores obrigatórios
      const temSabores = produtos.map(p => p.sabores_disponiveis && p.quantidade_sabores > 0)
      setProdutosComSabores(temSabores)

      // Mapear quais produtos têm tamanhos (será verificado individualmente)
      const verificacoesTamanhos = await Promise.all(
        produtos.map(async (produto) => {
          try {
            const tamanhos = await tamanhoService.buscarPorProduto(produto.id)
            return tamanhos && tamanhos.length > 0
          } catch (error) {
            console.error('Erro ao verificar tamanhos:', error)
            return false
          }
        })
      )
      setProdutosComTamanhos(verificacoesTamanhos)

      setProdutoAtual(0)
    } catch (error) {
      console.error('Erro ao carregar produtos do combo:', error)
    } finally {
      setLoading(false)
      setInitialLoading(false)
    }
  }

  const carregarDadosProdutoAtual = async () => {
    const produto = produtosCombo[produtoAtual]
    if (!produto) return

    try {
      setLoading(true)

      // Reset seleções
      setSaboresSelecionados([])
      setBordaSelecionada(null)
      setTamanhoSelecionado(null)

      // Carregar sabores se o produto tem sabores disponíveis
      if (produto.sabores_disponiveis) {
        const saboresAssociados = await produtoService.buscarSaboresProduto(produto.id)

        if (saboresAssociados && saboresAssociados.length > 0) {
          // Separar sabores principais e bordas
          const saboresPrincipais = saboresAssociados.filter(sabor =>
            sabor.tipo_sabor === 'normal'
          )
          const saboresBorda = saboresAssociados.filter(sabor =>
            sabor.tipo_sabor === 'borda'
          )

          // Mapear sabores principais
          const saboresFormatados = saboresPrincipais.map(sabor => ({
            id: sabor.id,
            nome: sabor.nome,
            descricao: `Sabor ${sabor.nome}`,
            categoria: sabor.categoria_sabor === 'doces' || sabor.categoria_sabor === 'doces_especiais' ? 'doce' as const : 'salgada' as const,
            ingredientes: [],
            preco: sabor.valor_premium || 0,
            categoria_sabor: sabor.categoria_sabor,
            tipo_sabor: sabor.tipo_sabor,
            is_premium: sabor.is_premium
          } as Sabor & { categoria_sabor: string; tipo_sabor: string; is_premium: boolean }))

          setSaboresDisponiveis(saboresFormatados)

          // Mapear bordas
          const bordasFormatadas = saboresBorda.map(sabor => ({
            id: sabor.id,
            nome: sabor.nome,
            preco: sabor.valor_premium || 0
          }))

          setBordasDisponiveis(bordasFormatadas)
          if (bordasFormatadas.length > 0) {
            setBordaSelecionada(bordasFormatadas[0])
          }
        }
      } else {
        setSaboresDisponiveis([])
        setBordasDisponiveis([])
      }

      // Carregar tamanhos se o produto tiver tamanhos configurados
      try {
        const tamanhosData = await tamanhoService.buscarPorProduto(produto.id)

        if (tamanhosData && tamanhosData.length > 0) {
          const tamanhosFormatados = tamanhosData.map(tamanho => ({
            id: tamanho.id,
            nome: tamanho.nome,
            valor: tamanho.valor,
            tamanho: tamanho.tamanho
          }))

          setTamanhosDisponiveis(tamanhosFormatados)
          setTamanhoSelecionado(tamanhosFormatados[0] || null)
        } else {
          setTamanhosDisponiveis([])
          setTamanhoSelecionado(null)
        }
      } catch (error) {
        console.error('Erro ao carregar tamanhos do produto combo:', error)
        setTamanhosDisponiveis([])
        setTamanhoSelecionado(null)
      }

    } catch (error) {
      console.error('Erro ao carregar dados do produto:', error)
    } finally {
      setLoading(false)
    }
  }

  const agruparSaboresPorCategoria = () => {
    const grupos: Record<string, Sabor[]> = {}

    saboresDisponiveis.forEach(sabor => {
      const categoriaSabor = sabor.categoria_sabor || 'tradicional'
      if (!grupos[categoriaSabor]) {
        grupos[categoriaSabor] = []
      }
      grupos[categoriaSabor].push(sabor)
    })

    Object.keys(grupos).forEach(categoria => {
      grupos[categoria].sort((a, b) => a.nome.localeCompare(b.nome))
    })

    return grupos
  }

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

  const ordemCategorias = ['tradicional', 'especiais', 'nobres', 'doces', 'doces_especiais', 'refrigerante']

  const toggleSabor = (sabor: Sabor) => {
    const produto = produtosCombo[produtoAtual]
    const maxSabores = produto?.quantidade_sabores || 1

    if (saboresSelecionados.find(s => s.id === sabor.id)) {
      setSaboresSelecionados(saboresSelecionados.filter(s => s.id !== sabor.id))
    } else if (saboresSelecionados.length < maxSabores) {
      setSaboresSelecionados([...saboresSelecionados, sabor])
    }
  }

  const proximoProduto = () => {
    // Salvar personalizações do produto atual
    const novosProdutos = [...produtosPersonalizados]
    novosProdutos[produtoAtual] = {
      ...produtosCombo[produtoAtual],
      saboresSelecionados: saboresSelecionados.length > 0 ? saboresSelecionados : undefined,
      bordaSelecionada: bordaSelecionada || undefined,
      tamanhoSelecionado: tamanhoSelecionado || undefined
    }
    setProdutosPersonalizados(novosProdutos)

    // Ir para próximo produto
    if (produtoAtual < produtosCombo.length - 1) {
      setProdutoAtual(produtoAtual + 1)
    }
  }

  const produtoAnterior = () => {
    // Salvar personalizações do produto atual antes de navegar
    const novosProdutos = [...produtosPersonalizados]
    novosProdutos[produtoAtual] = {
      ...produtosCombo[produtoAtual],
      saboresSelecionados: saboresSelecionados.length > 0 ? saboresSelecionados : undefined,
      bordaSelecionada: bordaSelecionada || undefined,
      tamanhoSelecionado: tamanhoSelecionado || undefined
    }
    setProdutosPersonalizados(novosProdutos)

    if (produtoAtual > 0) {
      setProdutoAtual(produtoAtual - 1)
    }
  }

  const calcularPrecoTotal = () => {
    if (!combo) return 0

    let precoBase = combo.preco_combo

    // Adicionar preços das personalizações dos produtos já salvos
    produtosPersonalizados.forEach((produto, index) => {
      // Se é o produto atual, usar as seleções atuais
      if (index === produtoAtual) {
        if (saboresSelecionados.length > 0) {
          precoBase += saboresSelecionados.reduce((total, sabor) => total + (sabor.preco || 0), 0)
        }
        if (bordaSelecionada) {
          precoBase += bordaSelecionada.preco || 0
        }
        if (tamanhoSelecionado) {
          precoBase += tamanhoSelecionado.valor || 0
        }
      } else {
        // Para outros produtos, usar as personalizações salvas
        if (produto.saboresSelecionados) {
          precoBase += produto.saboresSelecionados.reduce((total, sabor) => total + (sabor.preco || 0), 0)
        }
        if (produto.bordaSelecionada) {
          precoBase += produto.bordaSelecionada.preco || 0
        }
        if (produto.tamanhoSelecionado) {
          precoBase += produto.tamanhoSelecionado.valor || 0
        }
      }
    })

    return precoBase * quantidade
  }

  const handleConfirmar = () => {
    console.log('🎯 handleConfirmar do combo personalizado chamado')
    // Salvar personalizações do produto atual antes de confirmar
    const novosProdutos = [...produtosPersonalizados]
    novosProdutos[produtoAtual] = {
      ...produtosCombo[produtoAtual],
      saboresSelecionados: saboresSelecionados.length > 0 ? saboresSelecionados : undefined,
      bordaSelecionada: bordaSelecionada || undefined,
      tamanhoSelecionado: tamanhoSelecionado || undefined
    }

    // Confirmar combo personalizado diretamente sem observações
    console.log('✅ Confirmando combo personalizado sem observações')
    onConfirm(novosProdutos, quantidade, undefined)
    onClose()
  }

  const produtoAtualObj = produtosCombo[produtoAtual]
  const maxSabores = produtoAtualObj?.quantidade_sabores || 1
  const isUltimoProduto = produtoAtual === produtosCombo.length - 1
  const temPersonalizacoes = saboresDisponiveis.length > 0 || bordasDisponiveis.length > 0 || tamanhosDisponiveis.length > 0

  // Verificar se todos os produtos foram configurados
  const verificarTodosProdutosConfigurados = () => {
    // Salvar configurações do produto atual temporariamente
    const produtosTemp = [...produtosPersonalizados]
    produtosTemp[produtoAtual] = {
      ...produtosCombo[produtoAtual],
      saboresSelecionados: saboresSelecionados.length > 0 ? saboresSelecionados : undefined,
      bordaSelecionada: bordaSelecionada || undefined,
      tamanhoSelecionado: tamanhoSelecionado || undefined
    }

    // Verificar cada produto
    return produtosCombo.every((_, index) => {
      const produtoPersonalizado = produtosTemp[index]

      // Se o produto tem sabores obrigatórios
      if (produtosComSabores[index]) {
        if (!produtoPersonalizado.saboresSelecionados || produtoPersonalizado.saboresSelecionados.length === 0) {
          return false
        }
      }

      // Se o produto tem tamanhos obrigatórios
      if (produtosComTamanhos[index]) {
        if (!produtoPersonalizado.tamanhoSelecionado) {
          return false
        }
      }

      return true
    })
  }

  const todosProdutosConfigurados = verificarTodosProdutosConfigurados()

  // Verificar se o produto atual está configurado corretamente
  const produtoAtualConfigurado = () => {
    if (produtoAtual >= produtosCombo.length) return true

    // Se tem sabores obrigatórios
    if (produtosComSabores[produtoAtual]) {
      if (saboresSelecionados.length === 0) {
        return false
      }
    }

    // Se tem tamanhos obrigatórios
    if (produtosComTamanhos[produtoAtual]) {
      if (!tamanhoSelecionado) {
        return false
      }
    }

    return true
  }

  if (!combo) return null

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          [data-slot="alert-dialog-content"] {
            display: grid !important;
            grid-template-rows: auto 1fr auto !important;
            overflow: hidden !important;
            height: 100vh !important;
            max-height: 100vh !important;
          }
        }
      `}</style>
      <AlertDialog open={isOpen} onOpenChange={onClose}>
        <AlertDialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto w-[calc(100%-20px)] sm:w-auto box-border max-md:!p-0 max-md:!overflow-hidden">
          {/* Botão fechar mobile */}
          <button
            onClick={onClose}
            className="hidden max-md:block absolute right-4 top-4 z-20 rounded-full bg-card p-2 hover:bg-accent transition-colors shadow-md cursor-pointer"
            aria-label="Fechar"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>

        <AlertDialogHeader className="w-full overflow-hidden max-md:p-4 max-md:pb-2 max-md:bg-card max-md:border-b max-md:flex-shrink-0">
          <div className="flex items-start justify-between w-full gap-2">
            <div className="flex-1 min-w-0 max-md:pr-10">
              <AlertDialogTitle className="text-xl font-bold leading-tight">
                Personalizar Combo:
              </AlertDialogTitle>
              <div className="text-xl font-semibold text-foreground/80 mt-1 break-words">
                {combo.nome}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 shrink-0 max-md:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <AlertDialogDescription>
            {!initialLoading && produtosCombo.length > 0 && (
              <>
                {produtosCombo.length > 1 && (
                  <span>Produto {produtoAtual + 1} de {produtosCombo.length}: </span>
                )}
                {produtoAtualObj?.nome}
                {temPersonalizacoes && (
                  <span> - Personalize conforme sua preferência</span>
                )}
              </>
            )}
          </AlertDialogDescription>
          {!initialLoading && produtosCombo.length > 0 && !todosProdutosConfigurados && (
            <div className="mt-2 text-warning-foreground text-sm">
              ⚠️ Configure todos os produtos antes de adicionar ao carrinho
            </div>
          )}
        </AlertDialogHeader>

        <div className="space-y-6 overflow-x-hidden min-h-[400px] w-full max-w-full max-md:overflow-y-auto max-md:p-4 max-md:flex-shrink-1">
          {initialLoading || (loading && produtosCombo.length === 0) ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-destructive mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando opções...</p>
            </div>
          ) : produtosCombo.length > 0 ? (
            <>
              {/* Produto Atual */}
              {produtoAtualObj && (
                <Card className="p-4 overflow-hidden w-full max-w-full">
                  <div className="flex items-center gap-4">
                    <img
                      src={produtoAtualObj.imagem_path || '/placeholder-food.svg'}
                      alt={produtoAtualObj.nome}
                      className="w-20 h-20 md:w-28 md:h-28 object-contain rounded-lg flex-shrink-0 bg-muted/50 p-2"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/placeholder-food.svg';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-lg md:text-xl mb-1">{produtoAtualObj.nome}</h4>
                      {produtoAtualObj.descricao && (
                        <p className="text-sm md:text-base text-muted-foreground">{produtoAtualObj.descricao}</p>
                      )}
                    </div>
                  </div>

                  {!temPersonalizacoes && (
                    <div className="text-center py-4 text-muted-foreground bg-muted/50 rounded-lg">
                      <p className="text-sm">Este produto não possui opções de personalização.</p>
                      <p className="text-xs mt-1">Será adicionado com as configurações padrão.</p>
                    </div>
                  )}
                </Card>
              )}

              {/* Seleção de Tamanhos */}
              {tamanhosDisponiveis.length > 0 && (
                <div className="w-full overflow-hidden">
                  <h3 className="text-lg font-semibold mb-3">Tamanhos Disponíveis</h3>
                  <div className="space-y-2">
                    {tamanhosDisponiveis.map((tamanho) => (
                      <div
                        key={tamanho.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-all flex items-center justify-between gap-2 ${tamanhoSelecionado?.id === tamanho.id
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
                        <span className="text-sm font-bold text-destructive shrink-0">
                          R$ {tamanho.valor.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Seleção de Sabores */}
              {saboresDisponiveis.length > 0 && (
                <div className="w-full overflow-hidden">
                  <h3 className="text-lg font-semibold mb-3">
                    Sabores ({saboresSelecionados.length}/{maxSabores})
                  </h3>
                  <div className="space-y-6">
                    {(() => {
                      const saboresAgrupados = agruparSaboresPorCategoria()

                      return ordemCategorias
                        .filter(categoria => saboresAgrupados[categoria] && saboresAgrupados[categoria].length > 0)
                        .map(categoria => (
                          <div key={categoria} className="space-y-3">
                            <div className="border-b border-border pb-2">
                              <h4 className="text-md font-semibold text-foreground">
                                {obterNomeCategoriaSabor(categoria)}
                              </h4>
                            </div>

                            <div className="space-y-2">
                              {saboresAgrupados[categoria].map((sabor) => {
                                const isSelected = saboresSelecionados.find(s => s.id === sabor.id)
                                const canSelect = saboresSelecionados.length < maxSabores

                                return (
                                  <div
                                    key={sabor.id}
                                    className={`p-3 border rounded-lg cursor-pointer transition-all flex items-center justify-between gap-2 ${isSelected
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
                                        {sabor.categoria_sabor !== 'refrigerante' && (
                                          <Badge variant="outline" className="text-xs">
                                            {sabor.categoria}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground">{sabor.descricao}</p>
                                    </div>
                                    <span className="text-sm font-bold text-destructive shrink-0">
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
                </div>
              )}

              {/* Seleção de Borda */}
              {bordasDisponiveis.length > 0 && (
                <div className="w-full overflow-hidden">
                  <h3 className="text-lg font-semibold mb-3">Tipo de Borda</h3>
                  <div className="space-y-2">
                    {bordasDisponiveis.map((borda) => (
                      <div
                        key={borda.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-all flex items-center justify-between gap-2 ${bordaSelecionada?.id === borda.id
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
                        <span className="text-sm text-destructive font-semibold shrink-0">
                          {borda.preco === 0 ? 'Grátis' : `+R$ ${borda.preco.toFixed(2).replace('.', ',')}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Navegação entre produtos */}
              {produtosCombo.length > 1 && (
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <Button
                    variant="outline"
                    onClick={produtoAnterior}
                    disabled={produtoAtual === 0}
                    className="cursor-pointer"
                  >
                    Anterior
                  </Button>

                  <div className="flex gap-2">
                    {produtosCombo.map((_, index) => {
                      // Verificar se o produto está configurado
                      const produtoPersonalizado = produtosPersonalizados[index]
                      const estaConfigurado = (() => {
                        // Se é o produto atual, usar seleções atuais
                        if (index === produtoAtual) {
                          return produtoAtualConfigurado()
                        }

                        // Para outros produtos, verificar se foram salvos
                        if (produtosComSabores[index] && (!produtoPersonalizado.saboresSelecionados || produtoPersonalizado.saboresSelecionados.length === 0)) {
                          return false
                        }
                        if (produtosComTamanhos[index] && !produtoPersonalizado.tamanhoSelecionado) {
                          return false
                        }
                        return true
                      })()

                      return (
                        <div
                          key={index}
                          className={`w-3 h-3 rounded-full ${index === produtoAtual
                              ? 'bg-destructive'
                              : estaConfigurado
                                ? 'bg-success'
                                : 'bg-gray-300'
                            }`}
                          title={`Produto ${index + 1}: ${estaConfigurado ? 'Configurado' : 'Pendente'}`}
                        />
                      )
                    })}
                  </div>

                  <Button
                    variant="outline"
                    onClick={proximoProduto}
                    disabled={isUltimoProduto || !produtoAtualConfigurado()}
                    className="cursor-pointer"
                  >
                    {isUltimoProduto ? 'Último' : 'Próximo'}
                  </Button>
                </div>
              )}

              {/* Quantidade e Total */}
              <div className="flex items-center justify-between w-full overflow-hidden">
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
                  <p className="text-2xl font-bold text-destructive whitespace-nowrap">
                    R$ {calcularPrecoTotal().toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum produto encontrado para este combo.</p>
            </div>
          )}
        </div>

        <AlertDialogFooter className="pt-6 max-md:p-4 max-md:border-t max-md:bg-card max-md:flex-shrink-0">
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
              disabled={loading || !todosProdutosConfigurados}
              className={variant === 'delivery' ? 'bg-primary hover:bg-primary-hover flex-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer' : 'flex-1 disabled:opacity-50 disabled:cursor-not-allowed'}
            >
              {todosProdutosConfigurados
                ? 'Adicionar ao Carrinho'
                : `Configure (${produtoAtual + 1}/${produtosCombo.length})`
              }
            </Button>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>

      {/* Modal de Observações */}
    </AlertDialog>
    </>
  )
}