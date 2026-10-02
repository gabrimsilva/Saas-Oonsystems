// @ts-nocheck
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ActionButton } from "@/components/ui/action-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Package, Search, Plus, AlertTriangle, TrendingUp, TrendingDown, Edit, Trash2, Loader2, AlertCircle, ChevronUp, ChevronDown, Layers } from "lucide-react"
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog"
import VariantesModal from "@/components/VariantesModal"
import { estoqueService, stockService, produtoService, auditoriaService, type EstoqueSupabase } from "@/services"
import { useNavigation } from "@/contexts/NavigationContext"
import { CarregandoPagina } from '@/components/ui/feedback'

type ItemEstoque = EstoqueSupabase & {
  quantidadeMinima: number // Alias para quantidade_minima
}

export default function Estoque() {
  const { navigateTo } = useNavigation()
  const [itens, setItens] = useState<ItemEstoque[]>([])
  const [termoBusca, setTermoBusca] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Estados para modal de variedades
  const [variantesModalOpen, setVariantesModalOpen] = useState(false)
  const [itemSelecionado, setItemSelecionado] = useState<{ stockItemId: string; productName: string } | null>(null)

  // Carregar itens do Supabase
  useEffect(() => {
    carregarItens()
  }, [])

  const carregarItens = async () => {
    try {
      setLoading(true)
      setError(null)
      const itensData = await estoqueService.buscarTodos()

      // Mapear para incluir quantidadeMinima como alias
      const itensComAlias = itensData.map(item => ({
        ...item,
        quantidadeMinima: item.quantidade_minima
      }))

      setItens(itensComAlias)
    } catch (err) {
      console.error('Erro ao carregar itens do estoque:', err)
      setError('Erro ao carregar itens do estoque.')
    } finally {
      setLoading(false)
    }
  }

  const handleEditarItem = (item: ItemEstoque) => {
    navigateTo(`editar-item-estoque/${item.id}` as any)
  }

  const handleNovoItemClick = () => {
    navigateTo('novo-item-estoque' as any)
  }

  const handleExcluirItem = async (item: ItemEstoque) => {
    try {
      setSaving(true)
      setError(null)
      await estoqueService.excluir(item.id)
      await carregarItens()
    } catch (err) {
      console.error('Erro ao excluir item do estoque:', err)
      setError('Erro ao excluir item do estoque.')
    } finally {
      setSaving(false)
    }
  }

  const handleAumentarQuantidade = async (item: ItemEstoque) => {
    try {
      setSaving(true)
      setError(null)
      await estoqueService.atualizar(item.id, {
        quantidade: item.quantidade + 1
      })

      // Registrar auditoria
      await auditoriaService.registrar({
        acao: 'ESTOQUE_ENTRADA',
        descricao: `Entrada de 1 unidade do produto "${item.nome}" via controle de estoque (botão aumentar).`,
        metadata: {
          tipo: 'entrada_botao',
          stock_item_id: item.id,
          quantidade: 1,
          quantidade_anterior: item.quantidade,
          quantidade_nova: item.quantidade + 1
        }
      })

      await carregarItens()
    } catch (err) {
      console.error('Erro ao atualizar quantidade:', err)
      setError('Erro ao atualizar quantidade.')
    } finally {
      setSaving(false)
    }
  }

  const handleDiminuirQuantidade = async (item: ItemEstoque) => {
    if (item.quantidade > 0) {
      try {
        setSaving(true)
        setError(null)
        await estoqueService.atualizar(item.id, {
          quantidade: item.quantidade - 1
        })

        // Registrar auditoria
        await auditoriaService.registrar({
          acao: 'ESTOQUE_SAIDA',
          descricao: `Saída de 1 unidade do produto "${item.nome}" via controle de estoque (botão diminuir).`,
          metadata: {
            tipo: 'saida_botao',
            stock_item_id: item.id,
            quantidade: 1,
            quantidade_anterior: item.quantidade,
            quantidade_nova: item.quantidade - 1
          }
        })

        await carregarItens()
      } catch (err) {
        console.error('Erro ao atualizar quantidade:', err)
        setError('Erro ao atualizar quantidade.')
      } finally {
        setSaving(false)
      }
    }
  }

  const handleGerenciarVariantes = (item: ItemEstoque) => {
    try {
      console.log('📦 Abrindo modal de variantes para:', item.nome)
      setError(null)
      setItemSelecionado({
        stockItemId: item.id,
        productName: item.nome
      })
      setVariantesModalOpen(true)
    } catch (err) {
      console.error('Erro ao abrir modal de variedades:', err)
      setError('Erro ao carregar informações do produto')
    }
  }

  const handleVariantesChanged = () => {
    console.log('🔄 Callback: Variantes foram alteradas - recarregando itens do Estoque')
    carregarItens()
  }

  // Função para formatar data de validade
  const formatarValidade = (validade: string) => {
    // Se já estiver no formato DD/MM/YYYY, retorna como está
    if (validade.includes('/')) return validade
    
    // Se estiver no formato YYYY-MM-DD, converte para DD/MM/YYYY
    const partes = validade.split('-')
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`
    }
    
    return validade
  }

  // Função para calcular a porcentagem do estoque
  const calcularPorcentagemEstoque = (quantidade: number, minimo: number) => {
    const maximo = minimo * 2 // Assumindo que o máximo ideal é 2x o mínimo
    return Math.min((quantidade / maximo) * 100, 100)
  }

  // Função para determinar o status do estoque
  const getStatusEstoque = (quantidade: number, minimo: number) => {
    if (quantidade === 0) {
      return {
        status: 'Sem estoque!',
        cor: 'red',
        icone: AlertTriangle,
        trend: TrendingDown
      }
    } else if (quantidade < minimo) {
      return {
        status: 'Estoque crítico!',
        cor: 'red',
        icone: AlertTriangle,
        trend: TrendingDown
      }
    } else if (quantidade < minimo * 1.5) {
      return {
        status: 'Estoque baixo',
        cor: 'yellow',
        icone: AlertTriangle,
        trend: TrendingDown
      }
    } else {
      return {
        status: 'Estoque bom',
        cor: 'green',
        icone: null,
        trend: TrendingUp
      }
    }
  }

  // Filtrar itens por termo de busca
  const itensFiltrados = itens.filter(item =>
    item.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
    item.descricao.toLowerCase().includes(termoBusca.toLowerCase())
  )

  if (loading) {
    return <CarregandoPagina variante="tabela" />
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Layout Desktop */}
      <div className="hidden md:flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6" />
            Estoque
          </h1>
          <p className="text-muted-foreground">
            Controle e monitore o estoque de ingredientes e produtos
          </p>
        </div>
        <ActionButton onClick={handleNovoItemClick} loading={saving}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Item
        </ActionButton>
      </div>

      {/* Layout Mobile */}
      <div className="md:hidden space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight flex items-center justify-center gap-2">
            <Package className="h-6 w-6" />
            Estoque
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            Controle e monitore o estoque de ingredientes e produtos
          </p>
        </div>
        <ActionButton onClick={handleNovoItemClick} loading={saving} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Item
        </ActionButton>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-destructive/5 border border-destructive/30 rounded-lg text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="buscar-estoque"
            name="buscar-estoque"
            placeholder="Buscar itens do estoque..."
            className="pl-8"
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
          />
        </div>
      </div>

      {itensFiltrados.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
            {termoBusca ? "Nenhum item encontrado" : "Nenhum item no estoque"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {termoBusca
              ? "Tente buscar com outros termos"
              : "Comece adicionando itens ao seu estoque"
            }
          </p>
          {!termoBusca && (
            <ActionButton onClick={handleNovoItemClick} loading={saving}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro Item
            </ActionButton>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {itensFiltrados.map((item) => {
            const statusInfo = getStatusEstoque(item.quantidade, item.quantidadeMinima)
            const porcentagem = calcularPorcentagemEstoque(item.quantidade, item.quantidadeMinima)
            const IconeStatus = statusInfo.icone
            const IconeTrend = statusInfo.trend

            return (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {IconeStatus && <IconeStatus className={`h-5 w-5 text-${statusInfo.cor}-500`} />}
                      {item.nome}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <IconeTrend className={`h-4 w-4 text-${statusInfo.cor}-500`} />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleGerenciarVariantes(item)}
                        className="h-8 w-8 p-0"
                        disabled={saving}
                        title="Gerenciar Variedades"
                      >
                        <Layers className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditarItem(item)}
                        className="h-8 w-8 p-0"
                        disabled={saving}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <ConfirmDeleteDialog
                        trigger={
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            disabled={saving}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        }
                        title="Confirmar Exclusão"
                        description={`Tem certeza que deseja excluir o item "${item.nome}"? Esta ação não pode ser desfeita.`}
                        onConfirm={() => handleExcluirItem(item)}
                        disabled={saving}
                      />
                    </div>
                  </div>
                  <CardDescription>
                    {item.descricao}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Quantidade:</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDiminuirQuantidade(item)}
                          disabled={saving || item.quantidade === 0}
                          className="h-7 w-7 p-0"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <span className={`font-medium text-${statusInfo.cor}-600 min-w-[2rem] text-center`}>
                          {item.quantidade}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAumentarQuantidade(item)}
                          disabled={saving}
                          className="h-7 w-7 p-0"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Mínimo:</span>
                      <span className="text-sm text-muted-foreground">{item.quantidadeMinima}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Validade:</span>
                      <span className="text-sm text-muted-foreground">{formatarValidade(item.validade)}</span>
                    </div>
                    <div className={`w-full bg-${statusInfo.cor}-100 rounded-full h-2`}>
                      <div
                        className={`bg-${statusInfo.cor}-600 h-2 rounded-full`}
                        style={{ width: `${porcentagem}%` }}
                      ></div>
                    </div>
                    <p className={`text-xs text-${statusInfo.cor}-600`}>{statusInfo.status}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal de Variedades */}
      {itemSelecionado && (
        <VariantesModal
          isOpen={variantesModalOpen}
          onClose={() => {
            setVariantesModalOpen(false)
            setItemSelecionado(null)
          }}
          stockItemId={itemSelecionado.stockItemId}
          productName={itemSelecionado.productName}
          onVariantesChanged={carregarItens}
        />
      )}
    </div>
  )
}