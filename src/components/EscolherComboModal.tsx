import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { X, Plus, Minus } from "lucide-react"
import { comboService, saborService, type ComboSupabase, type ProdutoSupabase, type SaborSupabase } from "@/services"

interface Sabor {
  id: string
  nome: string
  descricao: string
  categoria: 'doce' | 'salgada'
  ingredientes: string[]
  preco: number
}

interface Borda {
  id: string
  nome: string
  preco: number
}

interface EscolherComboModalProps {
  isOpen: boolean
  combo: ComboSupabase | null
  onClose: () => void
  onConfirmar: (saboresSelecionados: Sabor[], bordaSelecionada: Borda | null, tamanhoSelecionado?: any, quantidade?: number) => void
}

export default function EscolherComboModal({ isOpen, combo, onClose, onConfirmar }: EscolherComboModalProps) {
  const [produtosCombo, setProdutosCombo] = useState<ProdutoSupabase[]>([])
  const [saboresDisponiveis, setSaboresDisponiveis] = useState<SaborSupabase[]>([])
  // const [tamanhosDisponiveis, setTamanhosDisponiveis] = useState<TamanhoSupabase[]>([])
  const [loading, setLoading] = useState(false)
  const [quantidade, setQuantidade] = useState(1)

  // Estados para seleções
  const [saboresSelecionados, setSaboresSelecionados] = useState<Sabor[]>([])
  const [bordaSelecionada, setBordaSelecionada] = useState<Borda | null>(null)
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState<any>(null)

  useEffect(() => {
    if (isOpen && combo) {
      carregarDadosCombo()
    } else {
      resetarSelecoes()
    }
  }, [isOpen, combo])

  const carregarDadosCombo = async () => {
    if (!combo) return

    try {
      setLoading(true)
      
      // Carregar produtos do combo
      const produtos = await comboService.buscarProdutosCombo(combo.id)
      setProdutosCombo(produtos)

      // Carregar sabores e tamanhos se necessário
      const temProdutoComSabores = produtos.some(p => p.sabores_disponiveis)
      const temProdutoComTamanhos = produtos.some(() => {
        // Verificar se algum produto tem tamanhos (pode ser implementado conforme necessário)
        return false // Por enquanto, assumindo que combos não têm tamanhos
      })

      if (temProdutoComSabores) {
        const sabores = await saborService.buscarTodos()
        setSaboresDisponiveis(sabores)
      }

      if (temProdutoComTamanhos) {
        // Carregar tamanhos se necessário
        // const tamanhos = await tamanhoService.buscarTodos()
        // setTamanhosDisponiveis(tamanhos)
      }

    } catch (error) {
      console.error('Erro ao carregar dados do combo:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetarSelecoes = () => {
    setSaboresSelecionados([])
    setBordaSelecionada(null)
    setTamanhoSelecionado(null)
    setQuantidade(1)
    setProdutosCombo([])
    setSaboresDisponiveis([])
  }

  const handleConfirmar = () => {
    onConfirmar(saboresSelecionados, bordaSelecionada, tamanhoSelecionado, quantidade)
    onClose()
  }

  const calcularPrecoTotal = () => {
    if (!combo) return 0

    let precoBase = combo.preco_combo
    
    // Adicionar preço dos sabores premium se houver
    const precoSabores = saboresSelecionados.reduce((total, sabor) => {
      return total + (sabor.preco || 0)
    }, 0)

    // Adicionar preço da borda se houver
    const precoBorda = bordaSelecionada ? bordaSelecionada.preco : 0

    // Adicionar preço do tamanho se houver
    const precoTamanho = tamanhoSelecionado ? tamanhoSelecionado.valor : 0

    return (precoBase + precoSabores + precoBorda + precoTamanho) * quantidade
  }

  if (!isOpen || !combo) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-lg w-[calc(100%-20px)] sm:w-auto max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">Personalizar Combo</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <p>Carregando informações do combo...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Informações do Combo */}
              <div>
                <h3 className="text-xl font-bold mb-2">{combo.nome}</h3>
                <p className="text-gray-600 mb-4">{combo.descricao}</p>
                
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-[color:var(--price-color-cliente)]">
                      R$ {combo.preco_combo.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-sm text-gray-400 line-through">
                      R$ {combo.preco_original.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded">
                    Economize {combo.desconto.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Produtos do Combo */}
              {produtosCombo.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Produtos inclusos:</h4>
                  <div className="space-y-2">
                    {produtosCombo.map((produto) => (
                      <Card key={produto.id} className="p-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={produto.imagem_path || '/placeholder-food.svg'}
                            alt={produto.nome}
                            className="w-12 h-12 object-contain rounded bg-gray-50 p-1"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/placeholder-food.svg';
                            }}
                          />
                          <div>
                            <h5 className="font-medium">{produto.nome}</h5>
                            <p className="text-sm text-gray-600">{produto.descricao}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Sabores (se houver produtos com sabores) */}
              {saboresDisponiveis.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Escolha os sabores:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {saboresDisponiveis.map((sabor) => (
                      <div key={sabor.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`sabor-${sabor.id}`}
                          checked={saboresSelecionados.some(s => s.id === sabor.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSaboresSelecionados(prev => [...prev, {
                                id: sabor.id,
                                nome: sabor.nome,
                                descricao: '',
                                categoria: 'salgada',
                                ingredientes: [],
                                preco: sabor.valor_premium || 0
                              }])
                            } else {
                              setSaboresSelecionados(prev => prev.filter(s => s.id !== sabor.id))
                            }
                          }}
                          className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        />
                        <label htmlFor={`sabor-${sabor.id}`} className="text-sm">
                          {sabor.nome}
                          {sabor.is_premium && sabor.valor_premium && sabor.valor_premium > 0 && (
                            <span className="text-green-600 ml-1">
                              (+R$ {sabor.valor_premium.toFixed(2).replace('.', ',')})
                            </span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantidade */}
              <div className="flex items-center justify-between">
                <span className="font-semibold">Quantidade:</span>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
                    className="h-8 w-8 p-0"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="font-bold min-w-[20px] text-center">{quantidade}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantidade(quantidade + 1)}
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-semibold">Total:</span>
            <span className="text-xl font-bold text-[color:var(--price-color-cliente)]">
              R$ {calcularPrecoTotal().toFixed(2).replace('.', ',')}
            </span>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmar}
              className="flex-1 bg-red-600 hover:bg-red-700"
              disabled={loading}
            >
              Adicionar ao Carrinho
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}