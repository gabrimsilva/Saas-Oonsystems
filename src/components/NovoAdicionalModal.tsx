import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel
} from "@/components/ui/alert-dialog"

export interface Adicional {
  id: string
  categoria_id: string
  nome: string
  valor: number
  ativo: boolean
  criado_em?: string
  atualizado_em?: string
}

interface NovoAdicionalModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (adicional: Omit<Adicional, 'id' | 'criado_em' | 'atualizado_em'>) => void
  adicionalParaEditar?: Adicional | null
  categoriaId: string
}

export default function NovoAdicionalModal({ 
  isOpen, 
  onClose, 
  onSave, 
  adicionalParaEditar,
  categoriaId 
}: NovoAdicionalModalProps) {
  const [nome, setNome] = useState("")
  const [valor, setValor] = useState("")
  const [ativo, setAtivo] = useState(true)

  useEffect(() => {
    if (adicionalParaEditar) {
      setNome(adicionalParaEditar.nome)
      setValor(adicionalParaEditar.valor.toString())
      setAtivo(adicionalParaEditar.ativo)
    } else {
      setNome("")
      setValor("")
      setAtivo(true)
    }
  }, [adicionalParaEditar, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!nome.trim() || !valor) return
    
    const adicionalData = {
      categoria_id: categoriaId,
      nome: nome.trim(),
      valor: parseFloat(valor),
      ativo
    }
    
    onSave(adicionalData)
    handleClose()
  }

  const handleClose = () => {
    setNome("")
    setValor("")
    setAtivo(true)
    onClose()
  }

  if (!isOpen) return null

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md !max-h-[90vh] max-md:!w-[calc(100%-2rem)] max-md:!h-auto max-md:!max-h-[90vh] max-md:!top-[50%] max-md:!left-[50%] max-md:!translate-x-[-50%] max-md:!translate-y-[-50%] max-md:!rounded-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {adicionalParaEditar ? "Editar Adicional" : "Novo Adicional"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {adicionalParaEditar 
              ? "Edite as informações do adicional" 
              : "Crie um novo adicional para esta categoria"
            }
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Adicional</Label>
            <Input
              id="nome"
              type="text"
              placeholder="Ex: Bacon, Catupiry, Borda Recheada..."
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor">Valor (R$)</Label>
            <Input
              id="valor"
              type="number"
              placeholder="0,00"
              step="0.01"
              min="0"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="ativo"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              className="h-4 w-4 text-primary border-input rounded focus:ring-ring/30"
            />
            <Label htmlFor="ativo">Adicional ativo</Label>
          </div>
        </form>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              const form = document.querySelector('form') as HTMLFormElement
              if (form) {
                form.requestSubmit()
              }
            }}
            disabled={!nome.trim() || !valor}
          >
            {adicionalParaEditar ? "Atualizar" : "Salvar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
