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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Percent, DollarSign } from "lucide-react"
import { type ItemCarrinhoPDV, type TipoDescontoItem } from "./types"

interface ModalDescontoItemProps {
  isOpen: boolean
  onClose: () => void
  item: ItemCarrinhoPDV | null
  onAplicarDesconto: (itemIndex: number, desconto: number, tipoDesconto: TipoDescontoItem) => void
  itemIndex: number
}

export default function ModalDescontoItem({
  isOpen,
  onClose,
  item,
  onAplicarDesconto,
  itemIndex
}: ModalDescontoItemProps) {
  const [tipoDesconto, setTipoDesconto] = useState<TipoDescontoItem>('percentual')
  const [valorDesconto, setValorDesconto] = useState<string>('')

  if (!item) return null

  const handleAplicar = () => {
    const valor = parseFloat(valorDesconto)
    
    if (isNaN(valor) || valor < 0) {
      return
    }

    // Preço fixo é o novo preço unitário: não pode ser maior que o preço unitário original
    if (tipoDesconto === 'preco_fixo' && valor > precoUnitarioOriginal) {
      return
    }

    // Validar percentual máximo
    if (tipoDesconto === 'percentual' && valor > 100) {
      return
    }

    // Validar valor máximo (não pode ser maior que o preço total original)
    if (tipoDesconto === 'valor' && valor > precoOriginal) {
      return
    }

    onAplicarDesconto(itemIndex, valor, tipoDesconto)

    setValorDesconto('')
    onClose()
  }

  const descontoAtual = item.desconto || 0
  const tipoDescontoAtual = item.tipoDesconto || 'valor'
  // Preços antes do desconto (o item pode já ter um desconto aplicado)
  const precoOriginal = descontoAtual > 0 && item.precoOriginal ? item.precoOriginal : item.precoTotal
  const precoUnitarioOriginal = item.precoUnitarioOriginal || precoOriginal / item.quantidade
  const precoComDesconto = item.precoTotal

  const valorDigitado = parseFloat(valorDesconto)
  const novoPrecoPreview =
    tipoDesconto === 'percentual'
      ? precoOriginal - (precoOriginal * valorDigitado) / 100
      : tipoDesconto === 'valor'
        ? precoOriginal - valorDigitado
        : valorDigitado * item.quantidade

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aplicar Desconto no Item</DialogTitle>
          <DialogDescription>
            {item.produto.nome}
            {item.variantLabel && ` - ${item.variantLabel}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do Item */}
          <div className="bg-muted/50 p-3 rounded-lg space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Preço Original:</span>
              <span className="font-medium">R$ {precoOriginal.toFixed(2).replace('.', ',')}</span>
            </div>
            {descontoAtual > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Desconto Atual:</span>
                  <span className="font-medium text-warning-foreground">
                    {tipoDescontoAtual === 'percentual'
                      ? `${descontoAtual}%`
                      : tipoDescontoAtual === 'preco_fixo'
                        ? `R$ ${descontoAtual.toFixed(2).replace('.', ',')} / un.`
                        : `R$ ${descontoAtual.toFixed(2).replace('.', ',')}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t pt-1">
                  <span className="text-muted-foreground">Preço com Desconto:</span>
                  <span className="font-bold text-success">R$ {precoComDesconto.toFixed(2).replace('.', ',')}</span>
                </div>
              </>
            )}
          </div>

          {/* Tipo de Desconto */}
          <div className="space-y-2">
            <Label>Tipo de Desconto</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={tipoDesconto === 'percentual' ? 'default' : 'outline'}
                onClick={() => setTipoDesconto('percentual')}
                className="w-full"
              >
                <Percent className="h-4 w-4 mr-1" />
                %
              </Button>
              <Button
                type="button"
                variant={tipoDesconto === 'valor' ? 'default' : 'outline'}
                onClick={() => setTipoDesconto('valor')}
                className="w-full"
              >
                <DollarSign className="h-4 w-4 mr-1" />
                R$
              </Button>
              <Button
                type="button"
                variant={tipoDesconto === 'preco_fixo' ? 'default' : 'outline'}
                onClick={() => setTipoDesconto('preco_fixo')}
                className="w-full text-xs"
              >
                Preço
              </Button>
            </div>
          </div>

          {/* Valor do Desconto */}
          <div className="space-y-2">
            <Label htmlFor="valorDesconto">
              {tipoDesconto === 'percentual' && 'Percentual (%)'}
              {tipoDesconto === 'valor' && 'Valor do Desconto (R$)'}
              {tipoDesconto === 'preco_fixo' && 'Novo Preço Unitário (R$)'}
            </Label>
            <Input
              id="valorDesconto"
              type="number"
              step={tipoDesconto === 'percentual' ? '1' : '0.01'}
              min="0"
              max={
                tipoDesconto === 'percentual' 
                  ? '100' 
                  : tipoDesconto === 'preco_fixo'
                    ? precoUnitarioOriginal.toString()
                    : precoOriginal.toString()
              }
              value={valorDesconto}
              onChange={(e) => setValorDesconto(e.target.value)}
              placeholder={
                tipoDesconto === 'percentual' 
                  ? 'Ex: 10' 
                  : tipoDesconto === 'preco_fixo'
                    ? 'Ex: 12.00'
                    : 'Ex: 5.00'
              }
              autoFocus
            />
            {tipoDesconto === 'percentual' && (
              <p className="text-xs text-muted-foreground">
                Máximo: 100%
              </p>
            )}
            {tipoDesconto === 'valor' && (
              <p className="text-xs text-muted-foreground">
                Máximo: R$ {precoOriginal.toFixed(2).replace('.', ',')}
              </p>
            )}
            {tipoDesconto === 'preco_fixo' && (
              <p className="text-xs text-muted-foreground">
                Preço unitário original: R$ {precoUnitarioOriginal.toFixed(2).replace('.', ',')} — vale para qualquer quantidade
</p>
            )}
          </div>

          {/* Preview do Desconto */}
          {valorDesconto && parseFloat(valorDesconto) > 0 && (
            <div className="bg-success/5 border border-success/30 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground/80">Novo Preço:</span>
                <span className="text-lg font-bold text-success">
                  R$ {novoPrecoPreview.toFixed(2).replace('.', ',')}
                </span>
              </div>
              {tipoDesconto === 'preco_fixo' && (
                <div className="text-xs text-muted-foreground mt-1">
                  R$ {valorDigitado.toFixed(2).replace('.', ',')} x {item.quantidade} — Desconto: R$ {(precoOriginal - novoPrecoPreview).toFixed(2).replace('.', ',')}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleAplicar}
            disabled={!valorDesconto || parseFloat(valorDesconto) <= 0}
          >
            Aplicar Desconto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
