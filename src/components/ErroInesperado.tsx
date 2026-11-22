import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Estado {
  erro: Error | null
}

/**
 * Captura erros ao montar uma tela e mostra um aviso com "Recarregar", em vez
 * de deixar a página inteira em branco.
 */
export default class ErroInesperado extends Component<{ children: ReactNode }, Estado> {
  state: Estado = { erro: null }

  static getDerivedStateFromError(erro: Error): Estado {
    return { erro }
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error('Erro ao montar a tela:', erro, info.componentStack)
  }

  render() {
    if (!this.state.erro) return this.props.children
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-foreground">Não foi possível abrir esta tela</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pode ser uma atualização do sistema que acabou de sair. Recarregue a página para continuar.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover cursor-pointer"
            >
              Recarregar
            </button>
            <button
              type="button"
              onClick={() => { window.location.href = '/sistema/dashboard' }}
              className="h-9 rounded-md border border-border px-4 text-sm font-medium text-foreground hover:bg-accent cursor-pointer"
            >
              Ir para o início
            </button>
          </div>
          <p className="mt-4 break-words text-xs text-muted-foreground/80">{this.state.erro.message}</p>
        </div>
      </div>
    )
  }
}
