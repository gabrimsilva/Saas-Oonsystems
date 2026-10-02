/**
 * Confirmação no padrão do sistema, no lugar do `window.confirm` do navegador.
 *
 *   if (!(await confirmar({ titulo: 'Excluir produto?', perigo: true }))) return
 *
 * Basta um `<ConfirmacaoGlobal />` montado na raiz do app.
 */

import { useEffect, useState, type ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { buttonVariants } from '@/components/ui/button'

export interface OpcoesConfirmacao {
  titulo: string
  descricao?: ReactNode
  /** Texto do botão de confirmação (padrão: "Confirmar" ou "Excluir" quando `perigo`) */
  confirmar?: string
  cancelar?: string
  /** Ação destrutiva: botão vermelho */
  perigo?: boolean
}

interface Pedido extends OpcoesConfirmacao {
  responder: (ok: boolean) => void
}

let ouvinte: ((pedido: Pedido) => void) | null = null

export function confirmar(opcoes: OpcoesConfirmacao): Promise<boolean> {
  return new Promise((resolve) => {
    // Sem o componente montado (ex.: testes), cai no confirm do navegador
    if (!ouvinte) {
      resolve(window.confirm(opcoes.titulo))
      return
    }
    ouvinte({ ...opcoes, responder: resolve })
  })
}

export function ConfirmacaoGlobal() {
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    ouvinte = (novo) => {
      setPedido((atual) => {
        atual?.responder(false)
        return novo
      })
      setAberto(true)
    }
    return () => {
      ouvinte = null
    }
  }, [])

  const responder = (ok: boolean) => {
    pedido?.responder(ok)
    setAberto(false)
  }

  return (
    <AlertDialog open={aberto} onOpenChange={(abrir) => !abrir && responder(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{pedido?.titulo}</AlertDialogTitle>
          {pedido?.descricao && <AlertDialogDescription>{pedido.descricao}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => responder(false)}>{pedido?.cancelar ?? 'Cancelar'}</AlertDialogCancel>
          <AlertDialogAction
            className={pedido?.perigo ? buttonVariants({ variant: 'destructive' }) : undefined}
            onClick={() => responder(true)}
          >
            {pedido?.confirmar ?? (pedido?.perigo ? 'Excluir' : 'Confirmar')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
