import { createContext, useContext, type ReactNode } from 'react'
import toast from 'react-hot-toast'

/**
 * Tipos de erro do sistema
 */
export const ErrorType = {
  /** Erro de rede/conexão */
  NETWORK: 'network',
  /** Erro de validação de dados */
  VALIDATION: 'validation',
  /** Erro de autenticação/autorização */
  AUTH: 'auth',
  /** Erro do banco de dados */
  DATABASE: 'database',
  /** Erro genérico/desconhecido */
  GENERIC: 'generic'
} as const

export type ErrorType = typeof ErrorType[keyof typeof ErrorType]

/**
 * Severidade do erro
 */
export const ErrorSeverity = {
  /** Informação (não é erro, apenas aviso) */
  INFO: 'info',
  /** Aviso (erro não crítico) */
  WARNING: 'warning',
  /** Erro (funcionalidade afetada) */
  ERROR: 'error',
  /** Crítico (sistema pode estar comprometido) */
  CRITICAL: 'critical'
} as const

export type ErrorSeverity = typeof ErrorSeverity[keyof typeof ErrorSeverity]

/**
 * Interface para descrição completa de um erro
 */
export interface ErrorDetails {
  /** Tipo do erro */
  type: ErrorType
  /** Severidade do erro */
  severity: ErrorSeverity
  /** Mensagem amigável para o usuário */
  message: string
  /** Mensagem técnica (para logs) */
  technicalMessage?: string
  /** Erro original (se disponível) */
  originalError?: Error | unknown
  /** Contexto adicional */
  context?: Record<string, unknown>
  /** Se deve tentar novamente automaticamente */
  retryable?: boolean
  /** Ação sugerida para o usuário */
  action?: string
}

/**
 * Opções para exibição de notificação
 */
interface NotificationOptions {
  /** Duração em ms (padrão: 4000) */
  duration?: number
  /** Se deve incluir botão de fechar */
  dismissible?: boolean
  /** Ícone customizado */
  icon?: string
}

/**
 * Interface do contexto de erros
 */
interface ErrorContextType {
  /**
   * Reporta um erro e exibe notificação
   * @param details Detalhes do erro
   * @param options Opções de notificação
   */
  reportError: (details: ErrorDetails, options?: NotificationOptions) => void

  /**
   * Exibe notificação de sucesso
   * @param message Mensagem de sucesso
   * @param options Opções de notificação
   */
  showSuccess: (message: string, options?: NotificationOptions) => void

  /**
   * Exibe notificação de informação
   * @param message Mensagem informativa
   * @param options Opções de notificação
   */
  showInfo: (message: string, options?: NotificationOptions) => void

  /**
   * Exibe notificação de aviso
   * @param message Mensagem de aviso
   * @param options Opções de notificação
   */
  showWarning: (message: string, options?: NotificationOptions) => void
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined)

/**
 * Provider de gerenciamento de erros
 *
 * Centraliza o tratamento de erros da aplicação, fornecendo:
 * - Notificações toast com react-hot-toast
 * - Categorização de erros por tipo e severidade
 * - Logging estruturado para debugging
 * - Mensagens amigáveis para o usuário
 *
 * @example
 * ```tsx
 * <ErrorProvider>
 *   <App />
 * </ErrorProvider>
 * ```
 */
export function ErrorProvider({ children }: { children: ReactNode }) {
  /**
   * Reporta um erro e exibe notificação apropriada
   */
  const reportError = (details: ErrorDetails, options?: NotificationOptions) => {
    const {
      type,
      severity,
      message,
      technicalMessage,
      originalError,
      context,
      retryable,
      action
    } = details

    // Log estruturado para debugging
    const logData = {
      timestamp: new Date().toISOString(),
      type,
      severity,
      message,
      technicalMessage,
      context,
      retryable,
      error: originalError instanceof Error ? {
        name: originalError.name,
        message: originalError.message,
        stack: originalError.stack
      } : originalError
    }

    // Logar no console baseado na severidade (apenas erros críticos e erros)
    if (severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.ERROR) {
      console.error(severity === ErrorSeverity.CRITICAL ? '🔴 [CRÍTICO]' : '🔴 [ERRO]', logData)
    }

    // Construir mensagem completa para o usuário
    let userMessage = message
    if (action) {
      userMessage += `\n\n${action}`
    }
    if (retryable) {
      userMessage += '\n\nTente novamente em alguns instantes.'
    }

    // Exibir notificação baseada na severidade
    const toastOptions = {
      duration: options?.duration ?? (severity === ErrorSeverity.CRITICAL ? 6000 : 4000),
      icon: options?.icon
    }

    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.ERROR:
        toast.error(userMessage, {
          ...toastOptions,
          icon: options?.icon ?? '❌'
        })
        break
      case ErrorSeverity.WARNING:
        toast(userMessage, {
          ...toastOptions,
          icon: options?.icon ?? '⚠️',
          style: {
            borderLeft: '3px solid var(--warning)'
          }
        })
        break
      case ErrorSeverity.INFO:
        toast(userMessage, {
          ...toastOptions,
          icon: options?.icon ?? 'ℹ️',
          style: {
            borderLeft: '3px solid var(--info)'
          }
        })
        break
    }

    // TODO: Integrar com serviço de monitoramento (Sentry, LogRocket, etc.)
    // if (severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.ERROR) {
    //   sendToMonitoringService(logData)
    // }
  }

  /**
   * Exibe notificação de sucesso
   */
  const showSuccess = (message: string, options?: NotificationOptions) => {
    toast.success(message, {
      duration: options?.duration ?? 3000,
      icon: options?.icon ?? '✅'
    })
  }

  /**
   * Exibe notificação de informação
   */
  const showInfo = (message: string, options?: NotificationOptions) => {
    toast(message, {
      duration: options?.duration ?? 3000,
      icon: options?.icon ?? 'ℹ️',
      style: {
        borderLeft: '3px solid var(--info)'
      }
    })
  }

  /**
   * Exibe notificação de aviso
   */
  const showWarning = (message: string, options?: NotificationOptions) => {
    toast(message, {
      duration: options?.duration ?? 4000,
      icon: options?.icon ?? '⚠️',
      style: {
        borderLeft: '3px solid var(--warning)'
      }
    })
  }

  return (
    <ErrorContext.Provider value={{ reportError, showSuccess, showInfo, showWarning }}>
      {children}
    </ErrorContext.Provider>
  )
}

/**
 * Hook para acessar o contexto de erros
 *
 * @throws Error se usado fora do ErrorProvider
 *
 * @example
 * ```tsx
 * const { reportError, showSuccess } = useError()
 *
 * try {
 *   await salvarPedido()
 *   showSuccess('Pedido salvo com sucesso!')
 * } catch (error) {
 *   reportError({
 *     type: ErrorType.DATABASE,
 *     severity: ErrorSeverity.ERROR,
 *     message: 'Não foi possível salvar o pedido',
 *     technicalMessage: 'Falha ao inserir no Supabase',
 *     originalError: error,
 *     retryable: true,
 *     action: 'Verifique sua conexão e tente novamente'
 *   })
 * }
 * ```
 */
export function useError() {
  const context = useContext(ErrorContext)
  if (!context) {
    throw new Error('useError deve ser usado dentro de um ErrorProvider')
  }
  return context
}
