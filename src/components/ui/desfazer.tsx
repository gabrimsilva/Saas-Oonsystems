import toast from "react-hot-toast"

/**
 * Aviso de sucesso com botão "Desfazer", para ações leves e reversíveis
 * (ativar/desativar, marcar como pago) no lugar de um modal de confirmação.
 */
export function avisoComDesfazer(mensagem: string, desfazer: () => void | Promise<void>, duracao = 6000) {
  toast.success(
    (t) => (
      <span className="flex items-center gap-3">
        <span>{mensagem}</span>
        <button
          type="button"
          className="rounded px-1.5 py-0.5 text-sm font-semibold text-primary hover:bg-primary/10"
          onClick={() => {
            toast.dismiss(t.id)
            void desfazer()
          }}
        >
          Desfazer
        </button>
      </span>
    ),
    { duration: duracao },
  )
}
