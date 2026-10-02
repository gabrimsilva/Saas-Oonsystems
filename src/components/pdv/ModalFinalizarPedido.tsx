import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CreditCard } from "lucide-react"
import PagamentoDividido from "@/components/PagamentoDividido"
import { DIVISAO_INICIAL, resolverDivisao, type PagamentoDivididoResolvido } from "@/utils/pagamentoDividido"
import { format, addDays } from "date-fns"
import { ptBR } from "date-fns/locale"

interface ModalFinalizarPedidoProps {
  isOpen: boolean
  onClose: () => void
  onConfirmar: (dadosPagamento: {
    formaPagamento: string
    precisaTroco: boolean
    valorTroco?: number
    consumoInterno?: boolean
    prazoDias?: number
    numeroParcelas?: number
    nomeCliente?: string
    /** Preenchido quando formaPagamento = 'dividido' */
    pagamentoDividido?: PagamentoDivididoResolvido
  }) => void
  subtotal: number
  taxaEntrega: number
  taxaExtraKm?: number
  total: number
  entregaDomicilio: boolean
  processando: boolean
  simplified?: boolean // Nova prop para modo simplificado
  carrinhoVazio?: boolean // Prop para indicar se carrinho está vazio
}

/** Opções de número de parcelas disponíveis para venda "A Prazo" (1x a 12x) */
const OPCOES_PARCELAS = Array.from({ length: 12 }, (_, i) => i + 1)

export default function ModalFinalizarPedido({
  isOpen,
  onClose,
  onConfirmar,
  subtotal,
  total,
  processando,
  carrinhoVazio = false
}: ModalFinalizarPedidoProps) {
  const [formaPagamento, setFormaPagamento] = useState('pix')
  const [precisaTroco, setPrecisaTroco] = useState(false)
  const [valorTroco, setValorTroco] = useState('')
  const [consumoInterno, setConsumoInterno] = useState(false)
  const [prazoDias, setPrazoDias] = useState('7')
  const [numeroParcelas, setNumeroParcelas] = useState('3')
  const [nomeCliente, setNomeCliente] = useState('')
  const [divisao, setDivisao] = useState(DIVISAO_INICIAL)

  // 🐛 DEBUG: Log para verificar remontagem do modal
  useEffect(() => {
    console.log('🔄 [MODAL] Modal montado/atualizado, isOpen:', isOpen)
    return () => {
      console.log('❌ [MODAL] Modal desmontado')
    }
  }, [])

  // 🐛 DEBUG: Log para verificar mudanças no isOpen
  useEffect(() => {
    console.log('🔔 [MODAL] isOpen mudou para:', isOpen)
  }, [isOpen])

  // 🔧 FIX: Resetar estado sempre que o modal abre OU fecha.
  // Resetar na abertura garante que o padrão (PIX) seja aplicado mesmo que
  // o componente permaneça montado entre aberturas.
  useEffect(() => {
    setFormaPagamento('pix')
    setPrecisaTroco(false)
    setValorTroco('')
    setConsumoInterno(false)
    setPrazoDias('7')
    setNumeroParcelas('3')
    setNomeCliente('')
    setDivisao(DIVISAO_INICIAL)
  }, [isOpen])

  const dividido = !consumoInterno && formaPagamento === 'dividido'
  const pagamentoDividido = dividido ? resolverDivisao(total, divisao) : null

  const handleConfirmar = () => {
    if (dividido) {
      if (!pagamentoDividido) return
      onConfirmar({
        formaPagamento: 'dividido',
        precisaTroco: pagamentoDividido.trocoPara !== undefined,
        valorTroco: pagamentoDividido.trocoPara,
        consumoInterno: false,
        nomeCliente: nomeCliente.trim() || undefined,
        pagamentoDividido,
      })
      return
    }
    // Finalizar venda
    onConfirmar({
      formaPagamento: consumoInterno ? 'interno' : formaPagamento,
      precisaTroco: consumoInterno ? false : precisaTroco,
      valorTroco: (consumoInterno || !precisaTroco) ? undefined : parseFloat(valorTroco) || 0,
      consumoInterno,
      prazoDias: (!consumoInterno && formaPagamento === 'aPrazo') ? (parseInt(prazoDias) || 7) : undefined,
      numeroParcelas: (!consumoInterno && formaPagamento === 'aPrazo') ? (parseInt(numeroParcelas) || 3) : undefined,
      nomeCliente: (!consumoInterno && nomeCliente.trim()) ? nomeCliente.trim() : undefined
    })
  }

  // Resetar quando modal fecha
  const handleClose = () => {
    setFormaPagamento('pix')
    setPrecisaTroco(false)
    setValorTroco('')
    setConsumoInterno(false)
    setPrazoDias('7')
    setNumeroParcelas('3')
    setNomeCliente('')
    setDivisao(DIVISAO_INICIAL)
    onClose()
  }

  return (
    <>
      {/* Modal Principal de Finalizar Pedido */}
      <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-md:!top-0 max-md:!left-0 max-md:!translate-x-0 max-md:!translate-y-0 max-md:!max-w-full max-md:!w-full max-md:!h-full max-md:!max-h-full max-md:!rounded-none max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Finalizar Pedido
          </DialogTitle>
          <DialogDescription>
            {consumoInterno 
              ? 'Registrar consumo interno - Sem cobrança'
              : 'Confirme os dados do pagamento'
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Checkbox Consumo Interno */}
          <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="consumoInterno"
                checked={consumoInterno}
                onChange={(e) => setConsumoInterno(e.target.checked)}
                disabled={processando}
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="consumoInterno" className="font-semibold text-warning-foreground cursor-pointer">
                  Consumo Interno
                </Label>
                <p className="text-xs text-warning-foreground mt-1">
                  Marcar para registrar como consumo interno (sem cobrança, estoque reduzido normalmente)
                </p>
                {consumoInterno && (
                  <div className="mt-2 p-2 bg-warning/15 rounded border border-warning/40 text-xs text-warning-foreground">
                    Consumo interno ativado - Total será R$ 0,00 e estoque será reduzido normalmente
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Forma de Pagamento - Ocultar se consumo interno */}
          {!consumoInterno && (
            <>
          <div>
            <Label htmlFor="formaPagamento">
              Forma de Pagamento
            </Label>
            <select 
              id="formaPagamento"
              className="w-full px-3 py-2 border border-input rounded-md bg-card"
              value={formaPagamento} 
              onChange={(e) => setFormaPagamento(e.target.value)}
              disabled={processando}
            >
              <option value="pix">PIX</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="cartaoDebito">Cartão de Débito</option>
              <option value="cartaoCredito">Cartão de Crédito</option>
              <option value="aPrazo">A Prazo</option>
              <option value="dividido">Dividir em duas formas</option>
            </select>
          </div>

          {formaPagamento === 'dividido' && (
            <PagamentoDividido total={total} valor={divisao} onChange={setDivisao} disabled={processando} idBase="pdv-divisao" />
          )}

          {/* Nome do Cliente - Disponível para todas as formas de pagamento */}
          <div>
            <Label htmlFor="nomeCliente">Nome do Cliente (opcional)</Label>
            <Input
              id="nomeCliente"
              type="text"
              value={nomeCliente}
              onChange={(e) => setNomeCliente(e.target.value)}
              placeholder="Digite o nome do cliente"
              disabled={processando}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Facilita identificar a venda no histórico
            </p>
          </div>

          {formaPagamento === 'aPrazo' && (
            <div className="space-y-3 p-3 bg-warning/10 border border-warning/30 rounded-lg">

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="prazoDias">Prazo (dias)</Label>
                  <Input
                    id="prazoDias"
                    type="number"
                    min="1"
                    step="1"
                    value={prazoDias}
                    onChange={(e) => setPrazoDias(e.target.value)}
                    placeholder="7"
                    disabled={processando}
                  />
                  <p className="text-xs text-warning-foreground mt-1">
                    Dias até o vencimento da 1ª parcela
                  </p>
                </div>
                <div>
                  <Label htmlFor="numeroParcelas">Parcelas</Label>
                  <select
                    id="numeroParcelas"
                    className="w-full px-3 py-2 border border-input rounded-md bg-card"
                    value={numeroParcelas}
                    onChange={(e) => setNumeroParcelas(e.target.value)}
                    disabled={processando}
                  >
                    {OPCOES_PARCELAS.map((n) => (
                      <option key={n} value={n}>{n}x</option>
                    ))}
                  </select>
                  <p className="text-xs text-warning-foreground mt-1">
                    Em quantas vezes será dividido
                  </p>
                </div>
              </div>

              {/* Preview das parcelas */}
              {total > 0 && (
                <div className="p-3 bg-card rounded border border-warning/40 space-y-2">
                  {(() => {
                    const prazo = parseInt(prazoDias) || 7
                    const qtdParcelas = parseInt(numeroParcelas) || 3
                    const valorParcela = total / qtdParcelas
                    const hoje = new Date()

                    if (qtdParcelas === 1) {
                      const dataVencimento = addDays(hoje, prazo)
                      return (
                        <div className="text-xs text-warning-foreground">
                          <span className="font-semibold">Pagamento único</span> de{' '}
                          <span className="font-semibold">R$ {valorParcela.toFixed(2).replace('.', ',')}</span>
                          {' '}em{' '}
                          <span className="font-semibold">{format(dataVencimento, "dd/MM/yyyy", { locale: ptBR })}</span>
                        </div>
                      )
                    }

                    return (
                      <>
                        <div className="text-xs text-warning-foreground font-semibold mb-1">
                          {qtdParcelas}x de R$ {valorParcela.toFixed(2).replace('.', ',')}
                        </div>
                        <div className="space-y-1">
                          {Array.from({ length: qtdParcelas }, (_, i) => {
                            // Cada parcela vence a cada "prazo" dias (ex: 7 dias, 14 dias, 21 dias)
                            const dataVencimento = addDays(hoje, prazo * (i + 1))
                            return (
                              <div key={i} className="text-xs text-warning-foreground flex items-center gap-2">
                                <span className="font-medium">{i + 1}ª parcela:</span>
                                <span>{format(dataVencimento, "dd/MM/yyyy", { locale: ptBR })}</span>
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}
            </div>
          )}

          {formaPagamento === 'dinheiro' && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="precisaTroco"
                  checked={precisaTroco}
                  onChange={(e) => setPrecisaTroco(e.target.checked)}
                  disabled={processando}
                />
                <Label htmlFor="precisaTroco">Cliente precisa de troco</Label>
              </div>
              
              {precisaTroco && (
                <div className="space-y-3 p-3 bg-info/5 border border-info/30 rounded-lg">
                  <div>
                    <Label htmlFor="valorTroco">Valor pago (troco para)</Label>
                    <Input
                      id="valorTroco"
                      type="number"
                      step="0.01"
                      value={valorTroco}
                      onChange={(e) => setValorTroco(e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  
                  {/* Exibir troco calculado */}
                  {valorTroco && parseFloat(valorTroco) > 0 && (
                    <div className="p-3 bg-card rounded border border-info/30 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total do pedido:</span>
                        <span className="font-semibold">R$ {total.toFixed(2).replace('.', ',')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Valor pago:</span>
                        <span className="font-semibold">R$ {parseFloat(valorTroco).toFixed(2).replace('.', ',')}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between">
                        <span className="font-semibold text-success">Troco:</span>
                        <span className="font-bold text-success text-lg">
                          R$ {(parseFloat(valorTroco) - total).toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                      {parseFloat(valorTroco) < total && (
                        <div className="text-xs text-destructive mt-2">
                          Valor pago é menor que o total!
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
            </>
          )}

          <Separator />

          {/* Resumo Simplificado - PDV */}
          <div className="p-4 rounded-lg space-y-2 bg-muted/50">
            {!consumoInterno && (
              <>
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
            </div>
            <Separator />
              </>
            )}
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span className={consumoInterno ? "text-warning-foreground" : "text-success"}>
                R$ {consumoInterno ? '0,00' : total.toFixed(2).replace('.', ',')}
              </span>
            </div>
            {consumoInterno && (
              <p className="text-xs text-warning-foreground mt-1">
                * Consumo interno - sem valor de cobrança
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose} 
            disabled={processando}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmar} 
            disabled={processando || carrinhoVazio || (dividido && !pagamentoDividido)}
          >
            {processando ? 'Processando...' : 'Confirmar Pedido'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}