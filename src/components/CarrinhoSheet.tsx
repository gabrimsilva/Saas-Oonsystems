import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DangerButton } from "@/components/ui/danger-button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ShoppingCart, Plus, Minus, AlertCircle, Clock, Star, Package, MessageSquare } from "lucide-react"
import { useLojaStatus } from "@/hooks/useLojaStatus"
import type { Sabor, Borda, Tamanho, Adicional } from '@/types/carrinho'
import { renderizarDetalhesCombo } from "@/utils/comboFormatacao"
import { chaveCarrinhoPublico } from '@/services/tenant'

interface Produto {
  id: string
  nome: string
  descricao: string
  preco: number
  preco_promocional?: number
  precoPromocional?: number
  categoria_id?: string
  categoria_nome?: string
  categoria: string
  imagem_path?: string
  urlImagem: string
  sabores_disponiveis?: boolean
  saboresDisponiveis: boolean
  quantidade_sabores?: number
  quantidadeSabores: number
  ativo?: boolean
  criado_em?: string
  atualizado_em?: string
}

interface ItemCarrinho {
  produto: Produto
  quantidade: number
  saboresSelecionados?: Sabor[]
  bordaSelecionada?: Borda
  tamanhoSelecionado?: Tamanho
  adicionaisSelecionados?: Adicional[]
  observacoes?: string
  produtosCombo?: any[] // Produtos individuais do combo personalizado
  variantId?: string
  variantLabel?: string
}

interface CarrinhoSheetProps {
  carrinho: ItemCarrinho[]
  carrinhoAberto: boolean
  setCarrinhoAberto: (aberto: boolean) => void
  onRemoverDoCarrinho: (produtoId: string, index?: number) => void
  onIncrementarItem: (index: number) => void
  onNavigateToCheckout: () => void
  onLimparCarrinho?: () => void
}

export default function CarrinhoSheet({
  carrinho,
  carrinhoAberto,
  setCarrinhoAberto,
  onRemoverDoCarrinho,
  onIncrementarItem,
  onNavigateToCheckout,
  onLimparCarrinho
}: CarrinhoSheetProps) {
  const { isAberta, loading: loadingStatus } = useLojaStatus()

  // Estados para os dialogs
  const [dialogAberto, setDialogAberto] = useState(false)
  const [dialogTipo, setDialogTipo] = useState<'loja-fechada' | 'carrinho-vazio' | 'limpar-carrinho'>('loja-fechada')
  const [dialogTitulo, setDialogTitulo] = useState('')
  const [dialogDescricao, setDialogDescricao] = useState('')

  const calcularTotal = () => {
    return carrinho.reduce((total, item) => {
      let precoItem = 0

      // Para combos personalizados, o preço já foi calculado corretamente
      if (item.produto.categoria === 'combo' && item.produto.id.includes('-')) {
        // Combo personalizado - usar preço já calculado
        precoItem = item.produto.preco || 0
      } else if (item.tamanhoSelecionado) {
        // Para produtos com tamanho (porções), usar o valor do tamanho
        precoItem = item.tamanhoSelecionado.valor
      } else {
        // Usar preço normal do produto
        precoItem = (item.produto.precoPromocional && item.produto.precoPromocional > 0)
          ? item.produto.precoPromocional
          : item.produto.preco || 0
      }

      // Para produtos normais (não combos personalizados), adicionar preços extras
      if (!(item.produto.categoria === 'combo' && item.produto.id.includes('-'))) {
        // Adicionar preço dos sabores (se houver)
        if (item.saboresSelecionados) {
          precoItem += item.saboresSelecionados.reduce((soma, sabor) => soma + (sabor.preco || 0), 0)
        }

        // Adicionar preço da borda (se houver)
        if (item.bordaSelecionada) {
          precoItem += item.bordaSelecionada.preco || 0
        }

        // Adicionar preço dos adicionais (se houver)
        if (item.adicionaisSelecionados) {
          precoItem += item.adicionaisSelecionados.reduce((soma: number, adicional: Adicional) =>
            soma + (adicional.valor * adicional.quantidade), 0
          )
        }
      }

      return total + (precoItem * item.quantidade)
    }, 0)
  }

  const totalItens = carrinho.reduce((total, item) => total + item.quantidade, 0)

  const mostrarDialog = (tipo: typeof dialogTipo, titulo: string, descricao: string) => {
    setDialogTipo(tipo)
    setDialogTitulo(titulo)
    setDialogDescricao(descricao)
    setDialogAberto(true)
  }

  const handleFinalizarPedido = () => {

    // Verificar se a loja está aberta
    if (!isAberta) {
      mostrarDialog(
        'loja-fechada',
        'Loja Fechada',
        'A loja está fechada no momento. Volte quando estivermos abertos!'
      )
      return
    }

    // Verificar se há itens no carrinho
    if (carrinho.length === 0) {
      mostrarDialog(
        'carrinho-vazio',
        'Carrinho Vazio',
        'Adicione produtos antes de finalizar o pedido.'
      )
      return
    }

    // Salvar carrinho no localStorage antes de navegar
    localStorage.setItem(chaveCarrinhoPublico(), JSON.stringify(carrinho))
    // Fechar o carrinho
    setCarrinhoAberto(false)
    // Navegar para checkout
    onNavigateToCheckout()
  }

  const handleLimparCarrinho = () => {
    mostrarDialog(
      'limpar-carrinho',
      'Limpar Carrinho',
      'Tem certeza que deseja limpar todo o carrinho?'
    )
  }

  const handleConfirmarDialog = () => {
    if (dialogTipo === 'limpar-carrinho' && onLimparCarrinho) {
      onLimparCarrinho()
    }
    setDialogAberto(false)
  }

  return (
    <>
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-destructive rounded-full shadow-lg flex items-center">
          {/* Botão Avaliar */}
          <Button
            size="lg"
            className="bg-primary hover:bg-primary-hover p-4 rounded-full shadow-none border-0 cursor-pointer"
            onClick={() => window.location.href = '/avaliar'}
          >
            <Star className="h-6 w-6" />
          </Button>

          {/* Botão Carrinho */}
          <Sheet open={carrinhoAberto} onOpenChange={(open) => {
            setCarrinhoAberto(open)
          }}>
            <SheetTrigger asChild>
              <Button
                size="lg"
                className="bg-primary hover:bg-primary-hover px-8 py-4 rounded-none shadow-none border-0 cursor-pointer"
              >
                <span className="text-xl font-bold whitespace-nowrap">
                  R$ {calcularTotal().toFixed(2).replace('.', ',')}
                </span>
              </Button>
            </SheetTrigger>

            <SheetContent side="right" className="w-[95%] sm:w-96">
              <SheetHeader className="pb-4 border-b">
                <div className="flex items-center justify-between gap-4">
                  <SheetTitle className="flex items-center gap-2 text-lg font-semibold flex-1">
                    <ShoppingCart className="h-5 w-5" />
                    Pedido ({totalItens} {totalItens === 1 ? 'item' : 'itens'})
                  </SheetTitle>
                  <SheetDescription className="sr-only">
                    Carrinho de compras com seus itens selecionados
                  </SheetDescription>
                  {carrinho.length > 0 && onLimparCarrinho && (
                    <DangerButton
                      variant="outline"
                      size="sm"
                      onClick={handleLimparCarrinho}
                      className="border-destructive/30 font-medium shrink-0 mr-[47px] cursor-pointer"
                    >
                      Limpar
                    </DangerButton>
                  )}
                </div>
              </SheetHeader>

              <div className="flex flex-col h-[calc(100vh-80px)]">
                {/* Lista de itens com scroll */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                  {carrinho.map((item, index) => (
                    <div key={`${item.produto.id}-${index}`} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      {/* Imagem do produto */}
                      <img
                        src={item.produto.urlImagem}
                        alt={item.produto.nome}
                        className="w-12 h-12 object-cover rounded"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder-food.svg';
                        }}
                      />

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {item.produto.nome}
                          {item.variantLabel && ` - ${item.variantLabel}`}
                        </p>

                        {/* Renderizar detalhes do combo se for um combo */}
                        {renderizarDetalhesCombo(item)}

                        {/* Renderizar detalhes normais se não for combo */}
                        {!item.produtosCombo && (
                          <>
                            {/* Mostrar tamanho selecionado */}
                            {item.tamanhoSelecionado && (
                              <p className="text-xs text-muted-foreground">
                                Tamanho: {item.tamanhoSelecionado.nome} ({item.tamanhoSelecionado.tamanho})
                              </p>
                            )}

                            {/* Mostrar sabores selecionados */}
                            {item.saboresSelecionados && item.saboresSelecionados.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Sabores: {item.saboresSelecionados.map(s => s.nome).join(', ')}
                              </p>
                            )}

                            {/* Mostrar borda selecionada */}
                            {item.bordaSelecionada && (
                              <p className="text-xs text-muted-foreground">
                                Borda: {item.bordaSelecionada.nome}
                              </p>
                            )}

                            {/* Mostrar adicionais selecionados */}
                            {item.adicionaisSelecionados && item.adicionaisSelecionados.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Adicionais: {item.adicionaisSelecionados.map((a: Adicional) =>
                                  `${a.quantidade}x ${a.nome}`
                                ).join(', ')}
                              </p>
                            )}
                            
                            {/* Mostrar observações (apenas para produtos normais, não combos) */}
                            {item.observacoes && (
                              <p className="text-xs text-muted-foreground italic">
                                <MessageSquare className="inline h-3 w-3 mr-1" />
                                Obs: {item.observacoes}
                              </p>
                            )}
                          </>
                        )}

                        <p className="text-xs text-muted-foreground">
                          R$ {(() => {
                            let precoUnitario = 0

                            // Para combos personalizados, o preço já foi calculado corretamente
                            if (item.produto.categoria === 'combo' && item.produto.id.includes('-')) {
                              // Combo personalizado - usar preço já calculado
                              precoUnitario = item.produto.preco || 0
                            } else if (item.tamanhoSelecionado) {
                              // Para produtos com tamanho (porções), usar o valor do tamanho
                              precoUnitario = item.tamanhoSelecionado.valor
                            } else {
                              // Usar preço normal do produto
                              precoUnitario = (item.produto.precoPromocional && item.produto.precoPromocional > 0)
                                ? item.produto.precoPromocional
                                : item.produto.preco || 0
                            }

                            // Para produtos normais (não combos personalizados), adicionar preços extras
                            if (!(item.produto.categoria === 'combo' && item.produto.id.includes('-'))) {
                              if (item.saboresSelecionados) {
                                precoUnitario += item.saboresSelecionados.reduce((soma, sabor) => soma + (sabor.preco || 0), 0)
                              }
                              if (item.bordaSelecionada) {
                                precoUnitario += item.bordaSelecionada.preco || 0
                              }
                              if (item.adicionaisSelecionados) {
                                precoUnitario += item.adicionaisSelecionados.reduce((soma: number, adicional: Adicional) =>
                                  soma + (adicional.valor * adicional.quantidade), 0
                                )
                              }
                            }

                            return precoUnitario.toFixed(2).replace('.', ',')
                          })()} x {item.quantidade}
                        </p>

                        <p className="font-semibold text-sm text-[color:var(--price-color-cliente)]">
                          R$ {(() => {
                            let preco = 0

                            // Para combos personalizados, o preço já foi calculado corretamente
                            if (item.produto.categoria === 'combo' && item.produto.id.includes('-')) {
                              // Combo personalizado - usar preço já calculado
                              preco = item.produto.preco || 0
                            } else if (item.tamanhoSelecionado) {
                              // Para produtos com tamanho (porções), usar o valor do tamanho
                              preco = item.tamanhoSelecionado.valor
                            } else {
                              // Usar preço normal do produto
                              preco = (item.produto.precoPromocional && item.produto.precoPromocional > 0)
                                ? item.produto.precoPromocional
                                : item.produto.preco || 0
                            }

                            // Para produtos normais (não combos personalizados), adicionar preços extras
                            if (!(item.produto.categoria === 'combo' && item.produto.id.includes('-'))) {
                              if (item.saboresSelecionados) {
                                preco += item.saboresSelecionados.reduce((soma, sabor) => soma + (sabor.preco || 0), 0)
                              }
                              if (item.bordaSelecionada) {
                                preco += item.bordaSelecionada.preco || 0
                              }
                              if (item.adicionaisSelecionados) {
                                preco += item.adicionaisSelecionados.reduce((soma: number, adicional: Adicional) =>
                                  soma + (adicional.valor * adicional.quantidade), 0
                                )
                              }
                            }

                            return (preco * item.quantidade).toFixed(2).replace('.', ',')
                          })()}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onRemoverDoCarrinho(
                            item.produto.id,
                            (item.saboresSelecionados ||
                             item.tamanhoSelecionado ||
                             item.bordaSelecionada ||
                             item.observacoes ||
                             (item.adicionaisSelecionados && item.adicionaisSelecionados.length > 0))
                              ? index
                              : undefined
                          )}
                          className="h-8 w-8 p-0 cursor-pointer"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{item.quantidade}</span>
                        <Button
                          size="sm"
                          onClick={() => onIncrementarItem(index)}
                          className="bg-primary hover:bg-primary-hover h-8 w-8 p-0 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total fixo na parte inferior */}
                <div className="border-t bg-card px-4 pt-4 pb-2 mt-auto">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-semibold">Total:</span>
                    <span className="text-2xl font-bold text-[color:var(--price-color-cliente)]">
                      R$ {calcularTotal().toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  {/* Aviso de loja fechada */}
                  {!loadingStatus && !isAberta && (
                    <div className="mb-4 p-3 bg-destructive/5 border border-destructive/30 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-destructive">
                          <p className="font-medium">Loja fechada</p>
                          <p>
                            Não é possível finalizar pedidos no momento. Volte quando estivermos abertos!
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full bg-primary hover:bg-primary-hover py-3 text-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
                    onClick={handleFinalizarPedido}
                    disabled={loadingStatus || !isAberta}
                  >
                    {loadingStatus
                      ? 'Verificando horário...'
                      : !isAberta
                        ? 'Loja Fechada'
                        : 'Finalizar Pedido'
                    }
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Botão Meus Pedidos */}
          <Button
            size="lg"
            className="bg-primary hover:bg-primary-hover p-4 rounded-full shadow-none border-0 cursor-pointer"
            onClick={() => window.location.href = '/meus-pedidos'}
          >
            <Package className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Dialog de Alertas */}
      <AlertDialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {dialogTipo === 'loja-fechada' && <Clock className="h-5 w-5 text-destructive" />}
              {dialogTipo === 'carrinho-vazio' && <ShoppingCart className="h-5 w-5 text-warning-foreground" />}
              {dialogTipo === 'limpar-carrinho' && <AlertCircle className="h-5 w-5 text-destructive" />}
              {dialogTitulo}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialogDescricao}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {dialogTipo === 'limpar-carrinho' ? (
              <>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmarDialog}
                  className="bg-primary hover:bg-primary-hover"
                >
                  Limpar
                </AlertDialogAction>
              </>
            ) : (
              <AlertDialogAction onClick={() => setDialogAberto(false)}>
                OK
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}