import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Phone,
  ChevronDown,
  ChevronUp,
  X,
  Split,
  Truck,
  Store,
  User,
  Package
} from "lucide-react"
import { type PedidoSupabase } from "@/services"
import PrintOrder from "./PrintOrder"
import { DialogCancelarPedido, type DadosCancelamento } from "./pedidos"
import NotificarClienteWhatsApp from "./NotificarClienteWhatsApp"
import { usePedidoExpandido } from "@/hooks/usePedidoExpandido"
import { renderizarDetalhesCombo } from "@/utils/comboFormatacao"
import { calcularDescontoEmReais } from "@/utils/descontoCalculation"



interface PedidoCardProps {
  pedido: PedidoSupabase
  onStatusChange: (pedidoId: string, novoStatus: string) => void
  onCancelar?: (pedidoId: string, dados: DadosCancelamento) => void
  isDragging?: boolean
}

export default function PedidoCard({ pedido, onStatusChange: _, onCancelar, isDragging = false }: PedidoCardProps) {
  const [showDetalhesModal, setShowDetalhesModal] = useState(false)
  const [showCancelarModal, setShowCancelarModal] = useState(false)
  
  // Hook para gerenciar estado de expansão com persistência
  const { isExpanded, toggle: toggleExpanded } = usePedidoExpandido(pedido.pedido_id)

  const formatarHora = (dataISO: string) => {
    return new Date(dataISO).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatarFormaPagamento = (forma: string) => {
    const formas: { [key: string]: string } = {
      'dinheiro': 'Dinheiro',
      'cartao_credito': 'Cartão de Crédito',
      'cartao_debito': 'Cartão de Débito',
      'cartaoCredito': 'Cartão de Crédito',
      'cartaoDebito': 'Cartão de Débito',
      'pix': 'PIX',
      'pixEntrega': 'PIX na Entrega',
      'pix_entrega': 'PIX na Entrega',
      'cartaoVR': 'Cartão VR',
      'cartao_vr': 'Cartão VR',
      'cartaoVA': 'Cartão VA',
      'cartao_va': 'Cartão VA',
      'ticketPromo': 'Ticket Promocional',
      'ticket_promo': 'Ticket Promocional'
    }
    return formas[forma] || forma
  }

  // Extrair ID curto do pedido (últimos 4 dígitos)
  const idCurto = pedido.codigo_pedido || pedido.pedido_id.split('-').pop()?.slice(-4) || pedido.pedido_id.slice(-4)

  const handleCancelar = (dados: DadosCancelamento) => {
    if (onCancelar) {
      onCancelar(pedido.pedido_id, dados)
    }
    setShowCancelarModal(false)
  }

  return (
    <>
      <Card className={`mb-3 hover:shadow-md transition-all bg-white border border-gray-200 rounded-xl cursor-grab active:cursor-grabbing py-3 sm:py-4 ${isDragging ? 'opacity-80 shadow-2xl transform scale-105' : ''
        }`}>
        <CardContent className="px-3 sm:px-4">
          {/* Cabeçalho sempre visível */}
          <div className="flex items-center justify-between mb-2 gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px] sm:text-xs font-mono bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full whitespace-nowrap">
                #{idCurto}
              </Badge>
              <Badge
                variant={pedido.entrega_domicilio ? "default" : "secondary"}
                className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full whitespace-nowrap flex items-center gap-1 ${pedido.entrega_domicilio
                  ? 'bg-[color:var(--secondary-foreground)] hover:bg-[color:var(--secondary-foreground)]/90 text-white border-[color:var(--secondary-foreground)]'
                  : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                  }`}
                title={pedido.entrega_domicilio ? "Entrega" : "Retirada"}
              >
                {pedido.entrega_domicilio ? (
                  <Truck className="w-3 h-3" />
                ) : (
                  <Store className="w-3 h-3" />
                )}
              </Badge>
              {pedido.forma_pagamento_dividido && (
                <Badge
                  variant="outline"
                  className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full whitespace-nowrap bg-purple-50 text-purple-700 border-purple-300 flex items-center"
                  title="Pagamento Dividido"
                >
                  <Split className="w-3 h-3" />
                </Badge>
              )}
              {pedido.tipo_venda === 'atacado' && (
                <Badge
                  variant="outline"
                  className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full whitespace-nowrap bg-amber-50 text-amber-800 border-amber-300"
                  title="Venda no atacado (catálogo)"
                >
                  Atacado
                </Badge>
              )}
              {pedido.mercado_pago_status === 'approved' && (
                <Badge
                  variant="outline"
                  className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full whitespace-nowrap bg-green-50 text-green-700 border-green-300"
                  title="Pago online pelo Mercado Pago"
                >
                  Pago online
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
              {/* Botão WhatsApp - aparece quando status é Liberado ou Finalizado */}
              {(pedido.status === 'Liberado' || pedido.status === 'Finalizado') && (
                <NotificarClienteWhatsApp pedido={pedido} compact />
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowCancelarModal(true)
                }}
                className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600 flex-shrink-0"
                title="Cancelar pedido"
              >
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleExpanded}
                className="h-6 w-6 p-0 hover:bg-gray-100 flex-shrink-0"
              >
                {isExpanded ? <ChevronUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
              </Button>
            </div>
          </div>

          {/* Nome do cliente sempre visível */}
          <div className="text-left mb-2">
            <h3 className="font-bold text-sm sm:text-base text-gray-900 truncate">
              {pedido.cliente_nome} {pedido.cliente_sobrenome}
            </h3>
          </div>

          {/* Botões sempre visíveis */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex-1 min-w-0">
              <PrintOrder pedido={pedido} />
            </div>

            <Button
              variant="default"
              size="sm"
              className="flex-1 min-w-0 text-[10px] sm:text-xs h-7 sm:h-8 bg-indigo-600 hover:bg-indigo-700 rounded-lg whitespace-nowrap"
              onClick={() => setShowDetalhesModal(true)}
            >
              <span className="hidden sm:inline">+ Ver todos</span>
              <span className="sm:hidden">Ver +</span>
            </Button>
          </div>

          {/* Conteúdo expansível */}
          {isExpanded && (
            <div className="space-y-2 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-100">
              {/* Valor e hora */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-lg sm:text-xl font-bold text-[color:var(--price-color)]">
                  R$ {pedido.total.toFixed(2).replace('.', ',')}
                </span>
                <span className="text-gray-500 text-xs sm:text-sm whitespace-nowrap">
                  {formatarHora(pedido.criado_em)}
                </span>
              </div>

              {/* Telefone e Status de Pagamento */}
              <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600 min-w-0">
                  <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="text-xs sm:text-sm truncate">{pedido.cliente_telefone}</span>
                </div>
                {/* Tag de status de pagamento */}
                {(pedido as any).mercado_pago_status === 'approved' ? (
                  <Badge className="bg-green-500 hover:bg-green-500 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                    Pago
                  </Badge>
                ) : (
                  <Badge className="bg-red-500 hover:bg-red-500 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                    Pagar
                  </Badge>
                )}
              </div>

              {/* Forma de Pagamento */}
              <div className="bg-gray-50 p-2 sm:p-3 rounded-lg">
                <div className="text-xs sm:text-sm text-gray-600 mb-1">Forma de Pagamento:</div>
                {pedido.forma_pagamento_dividido ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="font-medium text-gray-900">
                        {formatarFormaPagamento(pedido.pagamento_1_tipo || '')}
                      </span>
                      <span className="font-semibold text-purple-700">
                        R$ {(pedido.pagamento_1_valor || 0).toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="font-medium text-gray-900">
                        {formatarFormaPagamento(pedido.pagamento_2_tipo || '')}
                      </span>
                      <span className="font-semibold text-purple-700">
                        R$ {(pedido.pagamento_2_valor || 0).toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="font-medium text-gray-900 text-xs sm:text-sm">
                    {formatarFormaPagamento(pedido.forma_pagamento)}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal com detalhes completos */}
      <Dialog open={showDetalhesModal} onOpenChange={setShowDetalhesModal}>
        <DialogContent className="max-w-none w-[calc(100vw-18rem)] h-[calc(100vh-2rem)] max-h-none left-[16rem] right-auto top-4 translate-x-0 translate-y-0 flex flex-col ml-4 mr-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span>Detalhes do Pedido #{idCurto}</span>
              <PrintOrder pedido={pedido} compact />
            </DialogTitle>
            <DialogDescription>
              Informações completas do pedido
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4 min-h-0">
            {/* Layout em 2 colunas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Coluna Esquerda - Informações do Cliente e Entrega */}
              <div className="space-y-6">
                {/* Dados Pessoais */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-gray-900 flex items-center gap-2">
                    <User className="w-5 h-5 text-indigo-600" />
                    Dados Pessoais
                  </h3>
                  <div className="space-y-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                      <span className="text-gray-600 font-medium">Nome:</span>
                      <span className="font-medium text-gray-900">{pedido.cliente_nome} {pedido.cliente_sobrenome}</span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                      <span className="text-gray-600 font-medium">Telefone:</span>
                      <span className="font-medium text-gray-900">{pedido.cliente_telefone}</span>
                    </div>
                    {pedido.cliente_email && (
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-gray-600 font-medium">Email:</span>
                        <span className="font-medium text-gray-900">{pedido.cliente_email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dados de Entrega */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-gray-900 flex items-center gap-2">
                    {pedido.entrega_domicilio ? (
                      <Truck className="w-5 h-5 text-green-600" />
                    ) : (
                      <Store className="w-5 h-5 text-purple-600" />
                    )}
                    Dados de Entrega
                  </h3>
                  <div className="space-y-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                      <span className="text-gray-600 font-medium">Tipo:</span>
                      <span className="font-medium text-gray-900">
                        {pedido.entrega_domicilio ? 'Entrega a Domicílio' : 'Retirada no Local'}
                      </span>
                    </div>
                    {pedido.entrega_domicilio && pedido.cliente_endereco && (
                      <>
                        <div className="grid grid-cols-[120px_1fr] gap-2">
                          <span className="text-gray-600 font-medium">Endereço:</span>
                          <span className="font-medium text-gray-900">
                            {pedido.cliente_endereco}, {pedido.cliente_numero}
                            {pedido.cliente_complemento && ` - ${pedido.cliente_complemento}`}
                          </span>
                        </div>
                        {pedido.cliente_bairro && (
                          <div className="grid grid-cols-[120px_1fr] gap-2">
                            <span className="text-gray-600 font-medium">Bairro:</span>
                            <span className="font-medium text-gray-900">{pedido.cliente_bairro}</span>
                          </div>
                        )}
                        {pedido.cliente_cidade && (
                          <div className="grid grid-cols-[120px_1fr] gap-2">
                            <span className="text-gray-600 font-medium">Cidade:</span>
                            <span className="font-medium text-gray-900">{pedido.cliente_cidade} - {pedido.cliente_estado}</span>
                          </div>
                        )}
                        {pedido.cliente_cep && (
                          <div className="grid grid-cols-[120px_1fr] gap-2">
                            <span className="text-gray-600 font-medium">CEP:</span>
                            <span className="font-medium text-gray-900">{pedido.cliente_cep}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Dados do Pedido */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-gray-900 flex items-center gap-2">
                    <Package className="w-5 h-5 text-orange-600" />
                    Informações do Pedido
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2">
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                      <span className="text-gray-600 font-medium">Data/Hora:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(pedido.criado_em).toLocaleDateString('pt-BR')} às {formatarHora(pedido.criado_em)}
                      </span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                      <span className="text-gray-600 font-medium">Pagamento:</span>
                      <span className="font-medium text-gray-900">
                        {pedido.forma_pagamento_dividido ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Split className="w-4 h-4 text-purple-600" />
                              <span className="text-purple-700 font-semibold">Pagamento Dividido</span>
                            </div>
                            <div className="text-sm pl-6">
                              {formatarFormaPagamento(pedido.pagamento_1_tipo || '')}: R$ {(pedido.pagamento_1_valor || 0).toFixed(2).replace('.', ',')}
                            </div>
                            <div className="text-sm pl-6">
                              {formatarFormaPagamento(pedido.pagamento_2_tipo || '')}: R$ {(pedido.pagamento_2_valor || 0).toFixed(2).replace('.', ',')}
                            </div>
                          </div>
                        ) : (
                          formatarFormaPagamento(pedido.forma_pagamento)
                        )}
                      </span>
                    </div>
                    {pedido.precisa_troco && pedido.valor_troco && (
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-gray-600 font-medium">Troco para:</span>
                        <span className="font-medium text-gray-900">R$ {pedido.valor_troco.toFixed(2).replace('.', ',')}</span>
                      </div>
                    )}
                    {pedido.observacoes && (
                      <div className="pt-2 border-t border-gray-200">
                        <span className="text-gray-600 font-medium block mb-1">Observações:</span>
                        <span className="font-medium text-gray-900 whitespace-pre-wrap block bg-yellow-50 p-2 rounded">
                          {pedido.observacoes}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Coluna Direita - Itens do Pedido */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg mb-3 text-gray-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-red-600" />
                  Itens do Pedido
                </h3>
                <div className="space-y-3">
                  {pedido.itens.map((item: any, index: number) => (
                    <div key={index} className="border border-gray-200 p-4 rounded-lg bg-white hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-semibold text-gray-900 text-base">
                          {item.quantidade}x {item.produto.nome}
                          {(item.produto?.categoria_nome || item.produto?.categoria) && (
                            <span className="text-xs text-gray-500 ml-2 font-normal">
                              ({item.produto.categoria_nome || item.produto.categoria})
                            </span>
                          )}
                        </div>
                        <div className="text-base font-bold text-green-600">
                          R$ {(() => {
                            let precoItem = item.produto.preco
                            if (item.produto.categoria === 'combo') {
                              return (precoItem * item.quantidade).toFixed(2).replace('.', ',')
                            }
                            if (item.tamanhoSelecionado?.valor) {
                              precoItem = item.tamanhoSelecionado.valor
                            }
                            if (item.bordaSelecionada?.valor) {
                              precoItem += item.bordaSelecionada.valor
                            }
                            if (item.adicionaisSelecionados?.length > 0) {
                              const totalAdicionais = item.adicionaisSelecionados.reduce(
                                (sum: number, adicional: any) => sum + (adicional.valor * adicional.quantidade),
                                0
                              )
                              precoItem += totalAdicionais
                            }
                            return (precoItem * item.quantidade).toFixed(2).replace('.', ',')
                          })()}
                        </div>
                      </div>
                      
                      {/* Renderizar detalhes do combo se for um combo */}
                      {renderizarDetalhesCombo(item)}
                      
                      {/* Renderizar detalhes normais se não for combo */}
                      {!item.produtosCombo && (
                        <div className="space-y-1 text-sm">
                          {item.tamanhoSelecionado && (
                            <div className="text-gray-600">
                              <span className="font-medium">Tamanho:</span> {item.tamanhoSelecionado.nome} ({item.tamanhoSelecionado.tamanho})
                            </div>
                          )}
                          {item.saboresSelecionados && item.saboresSelecionados.length > 0 && (
                            <div className="text-gray-600">
                              <span className="font-medium">Sabores:</span> {item.saboresSelecionados.map((s: any) => s.nome).join(', ')}
                            </div>
                          )}
                          {item.bordaSelecionada && (
                            <div className="text-gray-600">
                              <span className="font-medium">Borda:</span> {item.bordaSelecionada.nome}
                            </div>
                          )}
                          {item.adicionaisSelecionados && item.adicionaisSelecionados.length > 0 && (
                            <div className="text-gray-600">
                              <div className="font-medium">Adicionais:</div>
                              <div className="ml-2 space-y-0.5">
                                {item.adicionaisSelecionados.map((adicional: any, idx: number) => (
                                  <div key={idx}>
                                    • {adicional.quantidade}x {adicional.nome} (+R$ {(adicional.valor * adicional.quantidade).toFixed(2).replace('.', ',')})
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {item.observacoes && (
                            <div className="text-sm text-gray-700 mt-2 italic bg-yellow-50 p-2 rounded border border-yellow-200">
                              <span className="font-medium">Obs:</span> {item.observacoes}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Footer fixo com totais - Compacto */}
          <div className="border-t pt-3 flex-shrink-0">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">R$ {pedido.subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                {pedido.taxa_entrega > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Taxa de entrega:</span>
                    <span className="font-medium">R$ {pedido.taxa_entrega.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
                {pedido.desconto > 0 && (() => {
                  const descontoCalculado = calcularDescontoEmReais(
                    pedido.desconto,
                    pedido.tipo_desconto,
                    pedido.subtotal
                  )
                  return (
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Desconto {pedido.tipo_desconto === 'percentual' ? `(${pedido.desconto}%)` : ''}:
                      </span>
                      <span className="font-medium text-red-600">
                        -R$ {descontoCalculado.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  )
                })()}
                {(pedido as any).taxa_extra_km > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Taxa extra (dist.):</span>
                    <span className="font-medium text-orange-600">R$ {(pedido as any).taxa_extra_km.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between text-lg font-bold border-t mt-2 pt-2">
                <span>Total:</span>
                <span className="text-[color:var(--price-color)]">R$ {pedido.total.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de cancelamento */}
      <DialogCancelarPedido
        aberto={showCancelarModal}
        onMudarEstado={setShowCancelarModal}
        onConfirmar={handleCancelar}
        valorTotal={pedido.total}
      />
    </>
  )
}