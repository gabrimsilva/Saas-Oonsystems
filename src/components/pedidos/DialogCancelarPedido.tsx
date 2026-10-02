import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { DangerButton } from "@/components/ui/danger-button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertTriangle } from "lucide-react"
import toast from 'react-hot-toast'

interface DialogCancelarPedidoProps {
  aberto: boolean
  onMudarEstado: (aberto: boolean) => void
  onConfirmar: (dados: DadosCancelamento) => void
  valorTotal: number
}

export interface DadosCancelamento {
  motivo: string
  requerExtorno: boolean
  valorExtorno: number
  formaPagamentoExtorno: string
}

export default function DialogCancelarPedido({
  aberto,
  onMudarEstado,
  onConfirmar,
  valorTotal
}: DialogCancelarPedidoProps) {
  const [motivo, setMotivo] = useState("")
  const [requerExtorno, setRequerExtorno] = useState(false)
  const [valorExtorno, setValorExtorno] = useState(valorTotal.toString())
  const [formaPagamentoExtorno, setFormaPagamentoExtorno] = useState("")

  const handleConfirmar = () => {
    if (!motivo.trim()) {
      toast.error("Por favor, informe o motivo do cancelamento")
      return
    }

    if (requerExtorno && !formaPagamentoExtorno) {
      toast.error("Por favor, selecione a forma de pagamento para o extorno")
      return
    }

    onConfirmar({
      motivo: motivo.trim(),
      requerExtorno,
      valorExtorno: requerExtorno ? parseFloat(valorExtorno) || 0 : 0,
      formaPagamentoExtorno: requerExtorno ? formaPagamentoExtorno : ""
    })

    // Limpar campos
    setMotivo("")
    setRequerExtorno(false)
    setValorExtorno(valorTotal.toString())
    setFormaPagamentoExtorno("")
  }

  const handleFechar = () => {
    setMotivo("")
    setRequerExtorno(false)
    setValorExtorno(valorTotal.toString())
    setFormaPagamentoExtorno("")
    onMudarEstado(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={handleFechar}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Cancelar Pedido
          </DialogTitle>
          <DialogDescription>
            Informe os detalhes do cancelamento. Esta ação não poderá ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Motivo do cancelamento */}
          <div className="space-y-2">
            <Label htmlFor="motivo">
              Motivo do cancelamento <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="motivo"
              placeholder="Ex: Cliente solicitou cancelamento, erro no pedido, etc."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Requer extorno */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="requer-extorno"
              checked={requerExtorno}
              onCheckedChange={(checked) => setRequerExtorno(checked as boolean)}
            />
            <Label
              htmlFor="requer-extorno"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Este cancelamento requer extorno de valor
            </Label>
          </div>

          {/* Campos de extorno (aparecem apenas se requer extorno) */}
          {requerExtorno && (
            <div className="space-y-4 pl-6 border-l-2 border-warning/40 bg-warning/10 p-4 rounded-r-lg">
              <div className="space-y-2">
                <Label htmlFor="valor-extorno">
                  Valor do extorno <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    R$
                  </span>
                  <Input
                    id="valor-extorno"
                    type="number"
                    step="0.01"
                    min="0"
                    max={valorTotal}
                    value={valorExtorno}
                    onChange={(e) => setValorExtorno(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Valor total do pedido: R$ {valorTotal.toFixed(2).replace('.', ',')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="forma-pagamento-extorno">
                  Forma de pagamento do extorno <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formaPagamentoExtorno}
                  onValueChange={setFormaPagamentoExtorno}
                >
                  <SelectTrigger id="forma-pagamento-extorno">
                    <SelectValue placeholder="Selecione a forma de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cartaoCredito">Cartão de Crédito</SelectItem>
                    <SelectItem value="cartaoDebito">Cartão de Débito</SelectItem>
                    <SelectItem value="vale">Vale Refeição</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleFechar}>
            Voltar
          </Button>
          <DangerButton
            onClick={handleConfirmar}
            disabled={!motivo.trim()}
          >
            Confirmar Cancelamento
          </DangerButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
