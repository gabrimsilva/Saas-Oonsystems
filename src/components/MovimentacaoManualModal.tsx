/**
 * Modal para entrada e saída manual de estoque
 * 
 * Permite registrar movimentações manuais de estoque com:
 * - Tipo (Entrada ou Saída)
 * - Quantidade
 * - Variante (se houver)
 * - Observação
 * 
 * @module components/MovimentacaoManualModal
 */

import { useState, useEffect } from "react"
import { Plus, Minus, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ActionButton } from "@/components/ui/action-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { stockService, type StockVariant, auditoriaService } from "@/services"
import toast from "react-hot-toast"

interface MovimentacaoManualModalProps {
  isOpen: boolean
  onClose: () => void
  stockItemId: string
  productName: string
  currentQty: number
  hasVariants: boolean
  onMovimentacaoCompleta?: () => void
}

export default function MovimentacaoManualModal({
  isOpen,
  onClose,
  stockItemId,
  productName,
  currentQty,
  hasVariants,
  onMovimentacaoCompleta
}: MovimentacaoManualModalProps) {
  const [tipo, setTipo] = useState<'IN' | 'OUT'>('IN')
  const [quantidade, setQuantidade] = useState<number>(0)
  const [varianteSelecionada, setVarianteSelecionada] = useState<string>('')
  const [observacao, setObservacao] = useState('')
  const [variantes, setVariantes] = useState<StockVariant[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && hasVariants) {
      carregarVariantes()
    }
  }, [isOpen, hasVariants, stockItemId])

  useEffect(() => {
    if (!isOpen) {
      // Resetar formulário ao fechar
      setTipo('IN')
      setQuantidade(0)
      setVarianteSelecionada('')
      setObservacao('')
      setError(null)
    }
  }, [isOpen])

  const carregarVariantes = async () => {
    try {
      setLoading(true)
      const data = await stockService.buscarVariantes(stockItemId)
      setVariantes(data)
      
      // Selecionar primeira variante por padrão
      if (data.length > 0) {
        setVarianteSelecionada(data[0].id)
      }
    } catch (err) {
      console.error('Erro ao carregar variantes:', err)
      setError('Erro ao carregar variantes')
    } finally {
      setLoading(false)
    }
  }

  const validarMovimentacao = (): string | null => {
    if (quantidade <= 0) {
      return 'Quantidade deve ser maior que zero'
    }

    if (hasVariants && !varianteSelecionada) {
      return 'Selecione uma variante'
    }

    // Validar saída: não permitir estoque negativo
    if (tipo === 'OUT') {
      if (hasVariants) {
        const variante = variantes.find(v => v.id === varianteSelecionada)
        if (variante && ((variante.quantidade ?? variante.qty ?? 0)) < quantidade) {
          return `Quantidade insuficiente. Disponível: ${variante.quantidade ?? variante.qty ?? 0}`
        }
      } else {
        if (currentQty < quantidade) {
          return `Quantidade insuficiente. Disponível: ${currentQty}`
        }
      }
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const erroValidacao = validarMovimentacao()
    if (erroValidacao) {
      setError(erroValidacao)
      return
    }

    try {
      setSaving(true)
      setError(null)

      const observacaoFinal = observacao.trim() || 
        (tipo === 'IN' ? 'Entrada manual' : 'Saída manual')

      if (tipo === 'IN') {
        // Entrada
        await stockService.darEntrada(
          stockItemId,
          quantidade,
          hasVariants ? varianteSelecionada : undefined,
          observacaoFinal
        )

        // Registrar auditoria
        await auditoriaService.registrar({
          acao: 'ESTOQUE_ENTRADA',
          descricao: `Entrada de ${quantidade} unidade(s) do produto "${productName}"${hasVariants && varianteSelecionada ? ` - Variante: ${variantes.find(v => v.id === varianteSelecionada)?.nome || ''}` : ''}. Justificativa: ${observacaoFinal}`,
          metadata: {
            tipo: 'entrada_manual',
            stock_item_id: stockItemId,
            quantidade,
            variant_id: varianteSelecionada,
            observacao: observacaoFinal
          }
        })

        toast.success(`${quantidade} unidades adicionadas ao estoque`)
      } else {
        // Saída
        await stockService.darBaixa(
          stockItemId,
          quantidade,
          hasVariants ? varianteSelecionada : undefined,
          undefined // refId
        )

        // Registrar auditoria
        await auditoriaService.registrar({
          acao: 'ESTOQUE_SAIDA',
          descricao: `Saída de ${quantidade} unidade(s) do produto "${productName}"${hasVariants && varianteSelecionada ? ` - Variante: ${variantes.find(v => v.id === varianteSelecionada)?.nome || ''}` : ''}. Justificativa: ${observacaoFinal}`,
          metadata: {
            tipo: 'saida_manual',
            stock_item_id: stockItemId,
            quantidade,
            variant_id: varianteSelecionada,
            observacao: observacaoFinal
          }
        })

        toast.success(`${quantidade} unidades removidas do estoque`)
      }

      // Notificar conclusão
      if (onMovimentacaoCompleta) {
        onMovimentacaoCompleta()
      }

      // Fechar modal
      onClose()
    } catch (err: any) {
      console.error('Erro ao registrar movimentação:', err)
      setError(err.message || 'Erro ao registrar movimentação')
      toast.error(err.message || 'Erro ao registrar movimentação')
    } finally {
      setSaving(false)
    }
  }

  const getQuantidadeDisponivel = () => {
    if (hasVariants && varianteSelecionada) {
      const variante = variantes.find(v => v.id === varianteSelecionada)
      return variante?.quantidade ?? variante?.qty ?? 0
    }
    return currentQty
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Movimentação Manual
          </DialogTitle>
          <DialogDescription>
            {productName}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-destructive/5 border border-destructive/30 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tipo de Movimentação */}
            <div className="space-y-2">
              <Label>Tipo de Movimentação</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={tipo === 'IN' ? 'default' : 'outline'}
                  onClick={() => setTipo('IN')}
                  className={tipo === 'IN' ? 'bg-success hover:bg-success/90' : ''}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Entrada
                </Button>
                <Button
                  type="button"
                  variant={tipo === 'OUT' ? 'default' : 'outline'}
                  onClick={() => setTipo('OUT')}
                  className={tipo === 'OUT' ? 'bg-destructive hover:bg-destructive-hover' : ''}
                >
                  <Minus className="h-4 w-4 mr-2" />
                  Saída
                </Button>
              </div>
            </div>

            {/* Variante (se houver) */}
            {hasVariants && variantes.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="variante">Variante *</Label>
                <select
                  id="variante"
                  value={varianteSelecionada}
                  onChange={(e) => setVarianteSelecionada(e.target.value)}
                  className="w-full px-3 py-2 border border-input bg-background text-sm rounded-md"
                  required
                >
                  <option value="">Selecione uma variante</option>
                  {variantes.map((variante) => (
                    <option key={variante.id} value={variante.id}>
                      {variante.nome || variante.label} - Disponível: {variante.quantidade ?? variante.qty ?? 0}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quantidade */}
            <div className="space-y-2">
              <Label htmlFor="quantidade">Quantidade *</Label>
              <Input
                id="quantidade"
                type="number"
                min="1"
                value={quantidade || ''}
                onChange={(e) => setQuantidade(parseInt(e.target.value) || 0)}
                placeholder="Digite a quantidade"
                required
              />
              {tipo === 'OUT' && (
                <p className="text-xs text-muted-foreground">
                  Disponível: {getQuantidadeDisponivel()} unidades
                </p>
              )}
            </div>

            {/* Observação */}
            <div className="space-y-2">
              <Label htmlFor="observacao">Observação (opcional)</Label>
              <textarea
                id="observacao"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex: Abastecimento semanal, Produto danificado, etc."
                className="w-full min-h-[80px] px-3 py-2 border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md resize-none"
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                {observacao.length}/200 caracteres
              </p>
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                Cancelar
              </Button>
              <ActionButton
                type="submit"
                loading={saving}
                disabled={quantidade <= 0 || (hasVariants && !varianteSelecionada)}
                className={tipo === 'IN' ? 'bg-success hover:bg-success/90' : 'bg-destructive hover:bg-destructive-hover'}
              >
                {tipo === 'IN' ? 'Adicionar' : 'Remover'}
              </ActionButton>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
