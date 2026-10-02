import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Settings } from "lucide-react"
import { stockService } from "@/services"
import toast from "react-hot-toast"

interface EditarEstoqueModalProps {
  isOpen: boolean
  onClose: () => void
  stockItemId: string
  productName: string
  currentMinQty: number
  currentReorderQty: number
  onSaved: () => void
}

export default function EditarEstoqueModal({
  isOpen,
  onClose,
  stockItemId,
  productName,
  currentMinQty,
  currentReorderQty,
  onSaved
}: EditarEstoqueModalProps) {
  const [minQty, setMinQty] = useState(currentMinQty)
  const [reorderQty, setReorderQty] = useState(currentReorderQty)
  const [loading, setLoading] = useState(false)

  // A faixa amarela só existe quando a reposição é maior que o mínimo.
  // Acima do limite de atenção o item é considerado saudável (verde).
  const temFaixaAtencao = reorderQty > minQty
  const limiteAtencao = temFaixaAtencao ? reorderQty : minQty

  useEffect(() => {
    if (isOpen) {
      setMinQty(currentMinQty)
      setReorderQty(currentReorderQty)
    }
  }, [isOpen, currentMinQty, currentReorderQty])

  const handleSalvar = async () => {
    try {
      setLoading(true)

      // Validações
      if (minQty < 0) {
        toast.error('Estoque mínimo não pode ser negativo')
        return
      }

      if (reorderQty < 0) {
        toast.error('Quantidade de reposição não pode ser negativa')
        return
      }

      if (reorderQty > 0 && reorderQty <= minQty) {
        toast.error('Quantidade de reposição deve ser maior que o estoque mínimo')
        return
      }

      // Atualizar no banco
      await stockService.atualizarQuantidadeMinima(stockItemId, minQty)
      await stockService.atualizarQuantidadeReposicao(stockItemId, reorderQty)

      toast.success('Configurações atualizadas com sucesso')
      onSaved()
      onClose()
    } catch (err: any) {
      console.error('Erro ao salvar:', err)
      toast.error(err.message || 'Erro ao salvar configurações')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurar Estoque
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Nome do Produto */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">{productName}</Label>
            <p className="text-sm text-muted-foreground">
              Configure os níveis de estoque para alertas e reposição
            </p>
          </div>

          {/* Estoque Mínimo */}
          <div className="space-y-2">
            <Label htmlFor="min-qty">
              Estoque Mínimo
              <span className="text-destructive ml-1">*</span>
            </Label>
            <Input
              id="min-qty"
              type="number"
              min="0"
              value={minQty}
              onChange={(e) => setMinQty(parseInt(e.target.value) || 0)}
              placeholder="Ex: 5"
            />
            <p className="text-xs text-muted-foreground">
              Alerta crítico quando o estoque atingir este valor
            </p>
          </div>

          {/* Quantidade de Reposição */}
          <div className="space-y-2">
            <Label htmlFor="reorder-qty">Quantidade de Reposição</Label>
            <Input
              id="reorder-qty"
              type="number"
              min="0"
              value={reorderQty}
              onChange={(e) => setReorderQty(parseInt(e.target.value) || 0)}
              placeholder="Ex: 10"
            />
            <p className="text-xs text-muted-foreground">
              Alerta de atenção até este valor. É também a quantidade sugerida para compra
            </p>
          </div>

          {/* Preview do Status */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <p className="text-sm font-medium">Preview dos Alertas:</p>
            <div className="space-y-1 text-xs">
              <p>
                <span className="font-medium">Crítico:</span>{' '}
                {minQty > 0 ? `Quando estoque ≤ ${minQty}` : 'Quando estoque = 0'}
              </p>
              {temFaixaAtencao ? (
                <p>
                  <span className="font-medium">Atenção:</span> Quando estoque entre {minQty + 1} e {reorderQty}
                </p>
              ) : (
                <p className="text-warning-foreground">
                  <span className="font-medium">Atenção:</span> sem faixa de atenção — informe uma
                  quantidade de reposição maior que {minQty}
                </p>
              )}
              <p>
                <span className="font-medium">Saudável:</span> Quando estoque {'>'} {limiteAtencao}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSalvar}
            disabled={loading}
            className="bg-primary hover:bg-primary-hover"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
