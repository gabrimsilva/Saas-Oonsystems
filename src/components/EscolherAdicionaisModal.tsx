import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Minus, X } from "lucide-react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { adicionalService, type AdicionalSupabase } from "@/services"

interface AdicionalSelecionado {
  id: string
  nome: string
  valor: number
  quantidade: number
}

interface EscolherAdicionaisModalProps {
  isOpen: boolean
  onClose: () => void
  categoriaId: string
  onConfirm: (adicionais: AdicionalSelecionado[]) => void
  variant?: 'default' | 'delivery' // 'default' usa --primary (admin), 'delivery' usa vermelho
}

export default function EscolherAdicionaisModal({
  isOpen,
  onClose,
  categoriaId,
  onConfirm,
  variant = 'delivery'
}: EscolherAdicionaisModalProps) {
  const [adicionaisDisponiveis, setAdicionaisDisponiveis] = useState<AdicionalSupabase[]>([])
  const [adicionaisSelecionados, setAdicionaisSelecionados] = useState<AdicionalSelecionado[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && categoriaId) {
      carregarAdicionais()
    }
  }, [isOpen, categoriaId])

  const carregarAdicionais = async () => {
    try {
      setLoading(true)
      const adicionais = await adicionalService.buscarPorCategoria(categoriaId)
      setAdicionaisDisponiveis(adicionais)
    } catch (error) {
      console.error('Erro ao carregar adicionais:', error)
    } finally {
      setLoading(false)
    }
  }

  const adicionarAdicional = (adicional: AdicionalSupabase) => {
    const jaExiste = adicionaisSelecionados.find(a => a.id === adicional.id)

    if (jaExiste) {
      setAdicionaisSelecionados(prev =>
        prev.map(a =>
          a.id === adicional.id
            ? { ...a, quantidade: a.quantidade + 1 }
            : a
        )
      )
    } else {
      setAdicionaisSelecionados(prev => [
        ...prev,
        {
          id: adicional.id,
          nome: adicional.nome,
          valor: adicional.valor,
          quantidade: 1
        }
      ])
    }
  }

  const removerAdicional = (adicionalId: string) => {
    const adicional = adicionaisSelecionados.find(a => a.id === adicionalId)

    if (adicional && adicional.quantidade > 1) {
      setAdicionaisSelecionados(prev =>
        prev.map(a =>
          a.id === adicionalId
            ? { ...a, quantidade: a.quantidade - 1 }
            : a
        )
      )
    } else {
      setAdicionaisSelecionados(prev => prev.filter(a => a.id !== adicionalId))
    }
  }

  const getQuantidadeAdicional = (adicionalId: string) => {
    const adicional = adicionaisSelecionados.find(a => a.id === adicionalId)
    return adicional?.quantidade || 0
  }

  const calcularTotal = () => {
    return adicionaisSelecionados.reduce(
      (total, adicional) => total + (adicional.valor * adicional.quantidade),
      0
    )
  }

  const handleConfirmar = () => {
    // Retornar adicionais selecionados para o modal pai
    onConfirm(adicionaisSelecionados)
    handleClose()
  }

  const handleClose = () => {
    setAdicionaisSelecionados([])
    onClose()
  }

  const handlePular = () => {
    onConfirm([])
    handleClose()
  }

  if (!isOpen) return null

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="w-[550px] h-[604px] max-w-[calc(100%-2rem)] max-h-[90vh] flex flex-col overflow-hidden max-md:!p-0">
        {/* Botão fechar mobile */}
        <button
          onClick={handleClose}
          className="hidden max-md:block absolute right-4 top-4 z-20 rounded-full bg-card p-2 hover:bg-accent transition-colors shadow-md cursor-pointer"
          aria-label="Fechar"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>

        <AlertDialogHeader className="flex-shrink-0 max-md:p-4 max-md:pb-2 max-md:sticky max-md:top-0 max-md:bg-card max-md:z-10 max-md:border-b">
          <AlertDialogTitle className="max-md:pr-10">Adicionar Extras</AlertDialogTitle>
          <AlertDialogDescription>
            Selecione os adicionais que deseja incluir no seu pedido
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 max-md:px-4">
          <ScrollArea className="h-full pr-4 max-md:pr-0">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando adicionais...
              </div>
            ) : adicionaisDisponiveis.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum adicional disponível
              </div>
            ) : (
              <div className="space-y-3 pb-4">
                {adicionaisDisponiveis.map((adicional) => {
                  const quantidade = getQuantidadeAdicional(adicional.id)

                  return (
                    <div
                      key={adicional.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <h4 className="font-medium text-foreground truncate">{adicional.nome}</h4>
                        <p className="text-sm text-muted-foreground whitespace-nowrap">
                          +R$ {adicional.valor.toFixed(2).replace('.', ',')}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {quantidade > 0 ? (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removerAdicional(adicional.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center font-medium">{quantidade}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => adicionarAdicional(adicional)}
                              className="h-8 w-8 p-0"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => adicionarAdicional(adicional)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Adicionar
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {adicionaisSelecionados.length > 0 && (
          <div className="border-t pt-4 flex-shrink-0 max-md:px-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Adicionais selecionados:</h4>
              <div className="max-h-24 overflow-y-auto space-y-1">
                {adicionaisSelecionados.map((adicional) => (
                  <div key={adicional.id} className="flex justify-between text-sm">
                    <span className="truncate pr-2">
                      {adicional.quantidade}x {adicional.nome}
                    </span>
                    <span className="font-medium whitespace-nowrap">
                      R$ {(adicional.valor * adicional.quantidade).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
                <span>Total de adicionais:</span>
                <span className="text-success whitespace-nowrap">
                  +R$ {calcularTotal().toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>
          </div>
        )}

        <AlertDialogFooter className="flex-col sm:flex-row gap-2 flex-shrink-0 max-md:sticky max-md:bottom-0 max-md:bg-card max-md:p-4 max-md:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <Button
            type="button"
            variant="outline"
            onClick={handlePular}
            className="w-full sm:w-auto"
          >
            Pular
          </Button>
          <Button
            type="button"
            onClick={handleConfirmar}
            className={variant === 'delivery' ? 'w-full sm:w-auto bg-primary hover:bg-primary-hover' : 'w-full sm:w-auto'}
            disabled={adicionaisSelecionados.length === 0}
          >
            {adicionaisSelecionados.length > 0
              ? `Confirmar (+R$ ${calcularTotal().toFixed(2).replace('.', ',')})`
              : 'Confirmar'
            }
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
