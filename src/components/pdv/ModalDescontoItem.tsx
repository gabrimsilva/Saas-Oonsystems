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
import { type ItemCarrinhoPDV } from "./types"

interface ModalDescontoItemProps {
  isOpen: boolean
  onClose: () => void
  item: ItemCarrinhoPDV | null
  onAplicarDesconto: (itemIndex: number, desconto: number, tipoDesconto: 'percentual' | 'valor') => void
  itemIndex: number
}

export default function ModalDescontoItem({
  isOpen,
  onClose,
  item,
  onAplicarDesconto,
  itemIndex
}: ModalDescontoItemProps) {
  const [tipoDesconto, setTipoDesconto] = useState<'percentual' | 'valor'>('percentual')
  const [valorDesconto, setValorDesconto] = useState<string>('')

  if (!item) return null

  const handleAplicar = () => {
    const valor = parseFloat(valorDesconto)
    
    if (isNaN(valor) || valor < 0) {
      return
    }

    // Validar percentual máximo
    if (tipoDesconto === 'percentual' && valor > 100) {
      return
    }

    // Validar valor máximo (não pode ser maior que o preço total)
    if (tipoDesconto === 'valor' && valor > item.precoTotal) {
      return
    }

    onAplicarDesconto(itemIndex, valor, tipoDesconto)
    setValorDesconto('')
    onClose()
  }

  const precoOriginal = item.precoTotal
  const descontoAtual = item.desconto || 0
  const tipoDescontoAtual = item.tipoDesconto || 'valor'
  
  let valorDescontoAtual = 0
  if (descontoAtual > 0) {
    valorDescontoAtual = tipoDescontoAtual === 'percentual' 
      ? (precoOriginal * descontoAtual) / 100
      : descontoAtual
  }

  const precoComDesconto = precoOriginal - valorDescontoAtual

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
          <div className="bg-gray-50 p-3 rounded-lg space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Preço Original:</span>
              <span className="font-medium">R$ {precoOriginal.toFixed(2).replace('.', ',')}</span>
            </div>
            {descontoAtual > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Desconto Atual:</span>
                  <span className="font-medium text-orange-600">
                    {tipoDescontoAtual === 'percentual' ? `${descontoAtual}%` : `R$ ${descontoAtual.toFixed(2).replace('.', ',')}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t pt-1">
                  <span className="text-gray-600">Preço com Desconto:</span>
                  <span className="font-bold text-green-600">R$ {precoComDesconto.toFixed(2).replace('.', ',')}</span>
                </div>
              </>
            )}
          </div>

          {/* Tipo de Desconto */}
          <div className="space-y-2">
            <Label>Tipo de Desconto</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={tipoDesconto === 'percentual' ? 'default' : 'outline'}
                onClick={() => setTipoDesconto('percentual')}
                className="w-full"
              >
                <Percent className="h-4 w-4 mr-2" />
                Percentual
              </Button>
              <Button
                type="button"
                variant={tipoDesconto === 'valor' ? 'default' : 'outline'}
                onClick={() => setTipoDesconto('valor')}
                className="w-full"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Valor (R$)
              </Button>
            </div>
          </div>

          {/* Valor do Desconto */}
          <div className="space-y-2">
            <Label htmlFor="valorDesconto">
              {tipoDesconto === 'percentual' ? 'Percentual (%)' : 'Valor (R$)'}
            </Label>
            <Input
              id="valorDesconto"
              type="number"
              step={tipoDesconto === 'percentual' ? '1' : '0.01'}
              min="0"
              max={tipoDesconto === 'percentual' ? '100' : precoOriginal.toString()}
              value={valorDesconto}
              onChange={(e) => setValorDesconto(e.target.value)}
              placeholder={tipoDesconto === 'percentual' ? 'Ex: 10' : 'Ex: 5.00'}
              autoFocus
            />
            {tipoDesconto === 'percentual' && (
              <p className="text-xs text-gray-500">
                Máximo: 100%
              </p>
            )}
            {tipoDesconto === 'valor' && (
              <p className="text-xs text-gray-500">
                Máximo: R$ {precoOriginal.toFixed(2).replace('.', ',')}
              </p>
            )}
          </div>

          {/* Preview do Desconto */}
          {valorDesconto && parseFloat(valorDesconto) > 0 && (
            <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Novo Preço:</span>
                <span className="text-lg font-bold text-green-600">
                  R$ {
                    (tipoDesconto === 'percentual'
                      ? precoOriginal - (precoOriginal * parseFloat(valorDesconto)) / 100
                      : precoOriginal - parseFloat(valorDesconto)
                    ).toFixed(2).replace('.', ',')
                  }
                </span>
              </div>
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
