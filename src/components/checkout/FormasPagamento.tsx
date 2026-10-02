import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CreditCard, Banknote, QrCode } from "lucide-react"
import { useValidacaoCheckout } from "@/hooks/useValidacaoCheckout"
import { obterClassesValidacao, deveMostrarErro } from "@/utils/validacaoVisual"
import type { DadosCliente, Configuracao } from "./types"

interface FormasPagamentoProps {
  dadosCliente: DadosCliente
  handleInputChange: (field: keyof DadosCliente, value: string | boolean) => void
  configuracoes: Configuracao
  entregaDomicilio?: boolean
}

const FormasPagamento = ({ dadosCliente, handleInputChange, configuracoes, entregaDomicilio = true }: FormasPagamentoProps) => {
  // Hook de validação em tempo real
  const { validarCampoEmTempoReal, estadosValidacao } = useValidacaoCheckout(entregaDomicilio)

  /**
   * Handler para mudança de forma de pagamento com validação
   */
  const handleFormaPagamentoChange = (forma: string) => {
    handleInputChange('formaPagamento', forma)
    validarCampoEmTempoReal('formaPagamento', forma, dadosCliente)
  }

  /**
   * Handler para mudança do valor do troco com validação
   */
  const handleValorTrocoChange = (valor: string) => {
    handleInputChange('valorTroco', valor)
    validarCampoEmTempoReal('valorTroco', valor, dadosCliente)
  }

  const getIconeFormaPagamento = (forma: string) => {
    switch (forma) {
      case 'dinheiro':
        return <Banknote className="w-4 h-4" />
      case 'cartaoDebito':
      case 'cartaoCredito':
      case 'cartaoVR':
      case 'cartaoVA':
        return <CreditCard className="w-4 h-4" />
      case 'pix':
      case 'pixEntrega':
        return <QrCode className="w-4 h-4" />
      case 'ticketPromo':
        return <Banknote className="w-4 h-4" />
      default:
        return <CreditCard className="w-4 h-4" />
    }
  }

  const getNomeFormaPagamento = (forma: string) => {
    switch (forma) {
      case 'dinheiro':
        return 'Dinheiro'
      case 'cartaoDebito':
        return 'Cartão de Débito'
      case 'cartaoCredito':
        return 'Cartão de Crédito'
      case 'pix':
        return 'PIX'
      case 'pixEntrega':
        return 'PIX na Entrega'
      case 'cartaoVR':
        return 'Cartão VR (Vale Refeição)'
      case 'cartaoVA':
        return 'Cartão VA (Vale Alimentação)'
      case 'ticketPromo':
        return 'Ticket Promocional'
      default:
        return forma
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Forma de Pagamento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {Object.entries(configuracoes.formasPagamento)
            .filter(([_, ativo]) => ativo)
            .map(([forma, _]) => (
              <button
                key={forma}
                onClick={() => handleFormaPagamentoChange(forma)}
                className={`p-4 border-2 rounded-lg text-left transition-colors cursor-pointer ${
                  dadosCliente.formaPagamento === forma
                    ? 'border-success bg-success/5'
                    : 'border-border hover:border-input'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${
                    dadosCliente.formaPagamento === forma
                      ? 'bg-success'
                      : 'border-2 border-input'
                  }`}>
                  </div>
                  {getIconeFormaPagamento(forma)}
                  <span className="font-medium">{getNomeFormaPagamento(forma)}</span>
                </div>
              </button>
            ))}
        </div>
        {deveMostrarErro(estadosValidacao.formaPagamento) && (
          <p className="text-destructive text-xs mt-2">⚠️ {estadosValidacao.formaPagamento.erro}</p>
        )}

        {/* Campo para troco se pagamento for dinheiro */}
        {dadosCliente.formaPagamento === 'dinheiro' && (
          <div className="mt-4 p-4 bg-warning/10 border border-warning/30 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="precisaTroco"
                checked={dadosCliente.precisaTroco}
                onChange={(e) => handleInputChange('precisaTroco', e.target.checked)}
                className="rounded cursor-pointer"
              />
              <Label htmlFor="precisaTroco" className="cursor-pointer">Preciso de troco</Label>
            </div>
            {dadosCliente.precisaTroco && (
              <div>
                <Label htmlFor="valorTroco">Troco para quanto?</Label>
                <Input
                  id="valorTroco"
                  type="number"
                  step="0.01"
                  value={dadosCliente.valorTroco}
                  onChange={(e) => handleValorTrocoChange(e.target.value)}
                  placeholder="0.00"
                  className={obterClassesValidacao(estadosValidacao.valorTroco, "mt-1")}
                />
                {deveMostrarErro(estadosValidacao.valorTroco) && (
                  <p className="text-destructive text-xs mt-1">⚠️ {estadosValidacao.valorTroco.erro}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Campo de observações */}
        <div className="mt-4">
          <Label htmlFor="observacoes">Observações (opcional)</Label>
          <Textarea
            id="observacoes"
            value={dadosCliente.observacoes || ''}
            onChange={(e) => handleInputChange('observacoes', e.target.value)}
            placeholder="Ex: Sem cebola, tirar azeitonas, entregar no portão..."
            className="mt-1 resize-none"
            rows={3}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {(dadosCliente.observacoes || '').length}/500 caracteres
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default FormasPagamento