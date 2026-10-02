/**
 * Modal para seleção de variante no PDV
 * 
 * Permite ao usuário escolher qual variante de um produto está sendo vendida
 * 
 * @module components/pdv/SelecionarVarianteModal
 */

import { useState, useEffect } from "react"
import { Package, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ActionButton } from "@/components/ui/action-button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { stockService, type StockVariant } from "@/services"
import { type ProdutoPDV } from "./types"

interface SelecionarVarianteModalProps {
  isOpen: boolean
  onClose: () => void
  produto: ProdutoPDV | null
  onConfirmar: (variantId: string, variantLabel: string) => void
}

export default function SelecionarVarianteModal({
  isOpen,
  onClose,
  produto,
  onConfirmar
}: SelecionarVarianteModalProps) {
  const [variantes, setVariantes] = useState<StockVariant[]>([])
  const [varianteSelecionada, setVarianteSelecionada] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && produto) {
      carregarVariantes()
    } else {
      // Limpar ao fechar
      setVariantes([])
      setVarianteSelecionada(null)
      setError(null)
    }
  }, [isOpen, produto])

  const carregarVariantes = async () => {
    if (!produto) return

    try {
      setLoading(true)
      setError(null)

      // Buscar stock_item do produto
      const stockItem = await stockService.buscarPorProduto(produto.id)

      if (!stockItem) {
        setError('Produto não possui controle de estoque configurado')
        return
      }

      // Buscar variantes
      const variantesData = await stockService.buscarVariantes(stockItem.id)

      if (!variantesData || variantesData.length === 0) {
        setError('Produto não possui variantes cadastradas')
        return
      }

      // Filtrar apenas variantes com estoque disponível
      const variantesComEstoque = variantesData.filter(v => (v.quantidade ?? 0) > 0)

      if (variantesComEstoque.length === 0) {
        setError('Nenhuma variante possui estoque disponível')
        return
      }

      setVariantes(variantesComEstoque)

      // Se houver apenas uma variante, selecionar automaticamente
      if (variantesComEstoque.length === 1) {
        setVarianteSelecionada(variantesComEstoque[0].id)
      }
    } catch (err) {
      console.error('Erro ao carregar variantes:', err)
      setError('Erro ao carregar variantes do produto')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmar = () => {
    if (!varianteSelecionada) {
      setError('Selecione uma variante')
      return
    }

    const variante = variantes.find(v => v.id === varianteSelecionada)
    if (!variante) {
      setError('Variante não encontrada')
      return
    }

    console.log('🔍 [SelecionarVarianteModal] Confirmando variante:', {
      variantId: variante.id,
      variantName: variante.nome ?? variante.label,
      variante: variante
    })

    onConfirmar(variante.id, variante.nome ?? variante.label ?? '')
    onClose()
  }

  const handleFechar = () => {
    setVarianteSelecionada(null)
    setError(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleFechar}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Selecionar Variante
          </DialogTitle>
          <DialogDescription>
            {produto?.nome}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-destructive/5 border border-destructive/30 rounded-lg text-destructive text-sm flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : variantes.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Escolha qual variante está sendo vendida:
            </p>

            {/* Container com scroll para muitas variantes */}
            <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {variantes.map((variante) => (
                <button
                  key={variante.id}
                  type="button"
                  onClick={() => setVarianteSelecionada(variante.id)}
                  className={`
                    w-full p-4 border-2 rounded-lg text-left transition-all
                    ${varianteSelecionada === variante.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-input hover:bg-accent'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {variante.nome ?? variante.label}
                      </p>
                      {variante.sku && (
                        <p className="text-xs text-muted-foreground mt-1">
                          SKU: {variante.sku}
                        </p>
                      )}
                      {variante.barcode && (
                        <p className="text-xs text-muted-foreground">
                          Código: {variante.barcode}
                        </p>
                      )}
                    </div>
                    <div className="ml-4">
                      <span className={`
                        inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                        ${(variante.quantidade ?? 0) > 10
                          ? 'bg-success/10 text-success'
                          : (variante.quantidade ?? 0) > 5
                          ? 'bg-warning/15 text-warning-foreground'
                          : 'bg-destructive/10 text-destructive'
                        }
                      `}>
                        {variante.quantidade ?? 0} em estoque
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleFechar}
            className="flex-1"
          >
            Cancelar
          </Button>
          <ActionButton
            type="button"
            onClick={handleConfirmar}
            disabled={!varianteSelecionada || loading}
            className="flex-1"
          >
            Confirmar
          </ActionButton>
        </div>
      </DialogContent>
    </Dialog>
  )
}
