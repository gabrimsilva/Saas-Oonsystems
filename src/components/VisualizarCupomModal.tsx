/**
 * Modal para visualizar e imprimir cupom fiscal
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Printer, Download, X, Loader2, Receipt } from "lucide-react"
import { toast } from 'react-hot-toast'

interface VisualizarCupomModalProps {
  isOpen: boolean
  onClose: () => void
  cupomHTML: string
  titulo: string
  numero: string
  onImprimir?: () => Promise<void>
}

export default function VisualizarCupomModal({
  isOpen,
  onClose,
  cupomHTML,
  titulo,
  numero,
  onImprimir
}: VisualizarCupomModalProps) {
  const [imprimindo, setImprimindo] = useState(false)

  const handleImprimir = async () => {
    if (onImprimir) {
      try {
        setImprimindo(true)
        await onImprimir()
      } catch (error) {
        console.error('Erro ao imprimir:', error)
        toast.error('Erro ao imprimir cupom')
      } finally {
        setImprimindo(false)
      }
    } else {
      // Fallback: usar window.print()
      handleImprimirNavegador()
    }
  }

  const handleImprimirNavegador = () => {
    // Criar janela temporária para impressão
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    
    if (printWindow) {
      printWindow.document.write(cupomHTML)
      printWindow.document.close()
      
      // Aguardar carregamento e imprimir
      printWindow.onload = () => {
        printWindow.focus()
        printWindow.print()
        printWindow.close()
      }
    } else {
      toast.error('Não foi possível abrir janela de impressão. Verifique se pop-ups estão bloqueados.')
    }
  }

  const handleBaixarPDF = () => {
    // Criar blob com HTML
    const blob = new Blob([cupomHTML], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    
    // Criar link temporário para download
    const link = document.createElement('a')
    link.href = url
    link.download = `cupom-${numero}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Limpar URL
    URL.revokeObjectURL(url)
    
    toast.success('Cupom baixado com sucesso!')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogTitle className="sr-only">{titulo} - {numero}</DialogTitle>
        <style>{`
          .flex.items-center.gap-3.pt-6.mt-6.border-t.p-5 {
            padding: 20px !important;
          }
          p.text-sm.text-muted-foreground {
            padding-bottom: 5px !important;
            display: flex !important;
            align-content: flex-start !important;
            justify-content: space-around !important;
          }
          .flex.items-center.gap-3.mb-2 {
            display: flex !important;
            justify-content: center !important;
            padding: 6px 0px !important;
          }
          /* Prevenir shift de layout quando modal abre */
          body {
            padding-right: 0 !important;
          }
        `}</style>
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6">
            {/* Cabeçalho integrado */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <Receipt className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-semibold">{titulo} - {numero}</h2>
              </div>
              <p className="text-sm text-muted-foreground">Visualize o cupom antes de imprimir</p>
            </div>

            {/* Conteúdo do Cupom */}
            <div className="border rounded-lg bg-card mb-6">
              <div 
                dangerouslySetInnerHTML={{ __html: cupomHTML }}
                className="cupom-preview"
              />
            </div>

            {/* Botões de ação integrados */}
            <div className="flex items-center gap-3 pt-6 mt-6 border-t p-5">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 py-6 px-6"
              >
                <X className="h-4 w-4 mr-2" />
                Fechar
              </Button>

              <Button
                variant="outline"
                onClick={handleBaixarPDF}
                className="flex-1 py-6 px-6"
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar HTML
              </Button>

              <Button
                onClick={handleImprimir}
                disabled={imprimindo}
                className="flex-1 py-6 px-6 bg-primary hover:bg-primary-hover"
              >
                {imprimindo ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Imprimindo...
                  </>
                ) : (
                  <>
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir
                  </>
                )}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
