import { useState, useEffect } from "react"
import { Plus, Trash2, Package, Edit2, Check, X } from "lucide-react"
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
import { stockService, type StockVariant } from "@/services"
import toast from "react-hot-toast"
import { confirmar } from '@/components/ui/confirmar'

interface VariantesModalProps {
  isOpen: boolean
  onClose: () => void
  stockItemId: string
  productName: string
  onVariantesChanged?: () => void
}

export default function VariantesModal({
  isOpen,
  onClose,
  stockItemId,
  productName,
  onVariantesChanged
}: VariantesModalProps) {
  const [variantes, setVariantes] = useState<StockVariant[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Estado para editar variante
  const [edicao, setEdicao] = useState<{
    id: string
    novaQtd: number
  } | null>(null)
  const [savingEdicao, setSavingEdicao] = useState(false)
  
  // Estado para nova variante
  const [novaVariante, setNovaVariante] = useState({
    label: "",
    sku: "",
    barcode: "",
    qty: 0
  })

  useEffect(() => {
    if (isOpen) {
      carregarVariantes()
    }
  }, [isOpen, stockItemId])

  const carregarVariantes = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await stockService.buscarVariantes(stockItemId)
      setVariantes(data)
    } catch (err) {
      console.error('Erro ao carregar variantes:', err)
      setError('Erro ao carregar variantes')
    } finally {
      setLoading(false)
    }
  }

  const handleAdicionarVariante = async () => {
    if (!novaVariante.label.trim()) {
      setError('Nome da variante é obrigatório')
      return
    }

    try {
      setSaving(true)
      setError(null)

      await stockService.criarVariante({
        stock_item_id: stockItemId,
        nome: novaVariante.label.trim(),
        quantidade: novaVariante.qty,
        sku: novaVariante.sku.trim() || undefined,
        barcode: novaVariante.barcode.trim() || undefined
      })

      // Limpar formulário
      setNovaVariante({ label: "", sku: "", barcode: "", qty: 0 })

      // Recarregar lista
      await carregarVariantes()
      
      // Notificar mudança
      if (onVariantesChanged) {
        onVariantesChanged()
      }
    } catch (err: any) {
      console.error('Erro ao adicionar variante:', err)
      setError(err.message || 'Erro ao adicionar variante')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoverVariante = async (variantId: string) => {
    if (!(await confirmar({ titulo: 'Remover esta variante?', descricao: 'O estoque desta variante deixa de ser controlado.', confirmar: 'Remover', perigo: true }))) {
      return
    }

    try {
      setError(null)
      await stockService.removerVariante(variantId)
      
      // Remover localmente
      setVariantes(prev => prev.filter(v => v.id !== variantId))

      // Notificar mudança
      if (onVariantesChanged) {
        onVariantesChanged()
      }
    } catch (err: any) {
      console.error('Erro ao remover variante:', err)
      setError(err.message || 'Erro ao remover variante')
    }
  }

  const handleIniciarEdicao = (variante: StockVariant) => {
    setEdicao({
      id: variante.id,
      novaQtd: variante.quantidade ?? 0
    })
  }

  const handleSalvarEdicao = async () => {
    if (!edicao) return

    try {
      setSavingEdicao(true)
      setError(null)

      await stockService.atualizarQuantidadeVariante(edicao.id, edicao.novaQtd)

      // Atualizar localmente
      setVariantes(prev => prev.map(v => 
        v.id === edicao.id ? { ...v, quantidade: edicao.novaQtd } : v
      ))

      toast.success('Quantidade atualizada com sucesso!')
      setEdicao(null)

      // Notificar mudança
      if (onVariantesChanged) {
        onVariantesChanged()
      }
    } catch (err: any) {
      console.error('Erro ao atualizar variante:', err)
      setError(err.message || 'Erro ao atualizar variante')
    } finally {
      setSavingEdicao(false)
    }
  }

  const handleCancelarEdicao = () => {
    setEdicao(null)
  }

  const calcularTotal = () => {
    // Number() evita concatenação quando quantidade vem como string (NUMERIC)
    return variantes.reduce((sum, v) => sum + (Number(v.quantidade ?? v.qty) || 0), 0)
  }

  const handleCloseModal = () => {
    console.log('🔄 Modal de variantes fechando - chamando onVariantesChanged')
    // Sempre chamar callback ao fechar, independente se fez mudanças ou não
    if (onVariantesChanged) {
      onVariantesChanged()
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseModal}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Gerenciar Variedades
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

        {/* Informação sobre total */}
        {variantes.length > 0 && (
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-sm text-primary">
              <strong>Total em estoque:</strong> {calcularTotal()} unidades
            </p>
            <p className="text-xs text-primary mt-1">
              O total é calculado automaticamente pela soma das variantes
            </p>
          </div>
        )}

        {/* Lista de variantes existentes */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : variantes.length > 0 ? (
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Variantes Cadastradas</h3>
            {variantes.map((variante) => (
              <div
                key={variante.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent"
              >
                <div className="flex-1">
                  <p className="font-medium">{variante.nome}</p>
                  {variante.sku && (
                    <p className="text-xs text-muted-foreground">SKU: {variante.sku}</p>
                  )}
                  {variante.barcode && (
                    <p className="text-xs text-muted-foreground">Código: {variante.barcode}</p>
                  )}
                  
                  {edicao?.id === variante.id ? (
                    <div className="flex items-center gap-2 mt-2">
                      <Label htmlFor={`qty-${variante.id}`} className="text-xs whitespace-nowrap">Qtd:</Label>
                      <Input
                        id={`qty-${variante.id}`}
                        type="number"
                        min="0"
                        value={edicao.novaQtd}
                        onChange={(e) => setEdicao({
                          ...edicao,
                          novaQtd: parseInt(e.target.value) || 0
                        })}
                        className="w-20 h-8"
                      />
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-primary mt-1">
                      Quantidade: {variante.quantidade} unidades
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {edicao?.id === variante.id ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSalvarEdicao}
                        disabled={savingEdicao}
                        className="bg-success hover:bg-success/90 h-8 w-8 p-0"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleCancelarEdicao}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleIniciarEdicao(variante)}
                        className="h-8 w-8 p-0 border-primary/20 text-primary hover:bg-primary/5"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoverVariante(variante.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/5 h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma variante cadastrada</p>
            <p className="text-xs mt-1">Adicione variantes como cor, fragrância ou tamanho</p>
          </div>
        )}

        {/* Formulário para adicionar nova variante */}
        <div className="border-t pt-4 space-y-4">
          <h3 className="font-medium text-sm">Adicionar Nova Variante</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-2">
              <Label htmlFor="nova-label">Nome da Variante *</Label>
              <Input
                id="nova-label"
                placeholder="Ex: Rosa Claro, 50ml"
                value={novaVariante.label}
                onChange={(e) => setNovaVariante(prev => ({ ...prev, label: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nova-sku">SKU (opcional)</Label>
              <Input
                id="nova-sku"
                placeholder="Ex: BAT-ROSA-50"
                value={novaVariante.sku}
                onChange={(e) => setNovaVariante(prev => ({ ...prev, sku: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nova-barcode">Código de Barras</Label>
              <Input
                id="nova-barcode"
                placeholder="Ex: 7891234567890"
                value={novaVariante.barcode}
                onChange={(e) => setNovaVariante(prev => ({ ...prev, barcode: e.target.value }))}
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nova-qty">Quantidade Inicial</Label>
              <Input
                id="nova-qty"
                type="number"
                min="0"
                placeholder="0"
                value={novaVariante.qty}
                onChange={(e) => setNovaVariante(prev => ({ ...prev, qty: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <ActionButton
            type="button"
            onClick={handleAdicionarVariante}
            loading={saving}
            disabled={!novaVariante.label.trim()}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Variante
          </ActionButton>
        </div>

        {/* Botão fechar */}
        <div className="flex justify-end pt-4 border-t">
          <Button type="button" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
