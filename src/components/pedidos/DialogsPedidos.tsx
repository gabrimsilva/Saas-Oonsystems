import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DangerButton } from "@/components/ui/danger-button"
import { History, CheckCircle, AlertCircle } from "lucide-react"

/**
 * Props do DialogZerarPedidos
 */
interface DialogZerarPedidosProps {
  /** Indica se o dialog está aberto */
  aberto: boolean
  /** Callback para mudar o estado do dialog */
  onMudarEstado: (aberto: boolean) => void
  /** Callback para confirmar a ação */
  onConfirmar: () => void
}

/**
 * Dialog de confirmação para zerar pedidos
 */
export function DialogZerarPedidos({
  aberto,
  onMudarEstado,
  onConfirmar
}: DialogZerarPedidosProps) {
  return (
    <AlertDialog open={aberto} onOpenChange={onMudarEstado}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-destructive" />
            Confirmar Ação
          </AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja mover os pedidos <strong>finalizados</strong> para o histórico?
            <br />
            <strong>Esta ação não pode ser desfeita.</strong>
            <br /><br />
            Apenas pedidos com status <strong>"Finalizado"</strong> serão movidos.
            <br />
            Pedidos com status "Entregue" permanecerão no Kanban.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <DangerButton onClick={onConfirmar}>
            Sim, Mover para Histórico
          </DangerButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * Props do DialogResultado
 */
interface DialogResultadoProps {
  /** Indica se o dialog está aberto */
  aberto: boolean
  /** Callback para mudar o estado do dialog */
  onMudarEstado: (aberto: boolean) => void
  /** Tipo do resultado (sucesso ou erro) */
  tipo: 'sucesso' | 'erro'
  /** Mensagem a ser exibida */
  mensagem: string
}

/**
 * Dialog para exibir resultado de uma operação
 */
export function DialogResultado({
  aberto,
  onMudarEstado,
  tipo,
  mensagem
}: DialogResultadoProps) {
  return (
    <AlertDialog open={aberto} onOpenChange={onMudarEstado}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className={`flex items-center gap-2 ${
            tipo === 'sucesso' ? 'text-success' : 'text-destructive'
          }`}>
            {tipo === 'sucesso' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            {tipo === 'sucesso' ? 'Sucesso!' : 'Erro!'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {mensagem}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>OK</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
