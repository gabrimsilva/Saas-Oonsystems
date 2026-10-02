import type { ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

/**
 * Páginas disponíveis no sistema administrativo
 */
export type AdminPage =
  | 'dashboard'
  | 'pdv'
  | 'comandas'
  | 'historico-comandas'
  | 'funcionarios'
  | 'novo-funcionario'
  | 'editar-funcionario'
  | 'produtos'
  | 'novo-produto'
  | 'editar-produto'
  | 'novo-combo'
  | 'editar-combo'
  | 'pedidos'
  | 'historico'
  | 'aguardando-pagamento'
  | 'estoque'
  | 'novo-item-estoque'
  | 'editar-item-estoque'
  | 'sabores'
  | 'novo-sabor'
  | 'editar-sabor'
  | 'sabores-borda'
  | 'novo-sabor-borda'
  | 'editar-sabor-borda'
  | 'adicionais'
  | 'novo-adicional'
  | 'editar-adicional'
  | 'categorias'
  | 'nova-categoria'
  | 'editar-categoria'
  | 'configuracoes'
  | 'configuracoes-gerais'
  | 'configuracoes-horario'
  | 'configuracoes-pagamento'
  | 'configuracoes-visuais'

/**
 * Contexto de navegação do sistema administrativo
 */
interface NavigationContextData {
  /** Página atual sendo exibida */
  currentPage: AdminPage
  /** Navega para uma nova página */
  navigateTo: (page: AdminPage) => void
  /** Limpa o estado de navegação (usado no logout) */
  clearNavigation: () => void
}

/**
 * Hook para acessar o contexto de navegação
 *
 * Fornece acesso ao estado de navegação e funções para manipulá-lo.
 * Agora usa React Router internamente para navegação real com histórico.
 *
 * @returns Dados e funções do contexto de navegação
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { currentPage, navigateTo } = useNavigation()
 *
 *   return (
 *     <button onClick={() => navigateTo('pedidos')}>
 *       Ver Pedidos
 *     </button>
 *   )
 * }
 * ```
 */
export function useNavigation(): NavigationContextData {
  const navigate = useNavigate()
  const location = useLocation()

  // Extrair a página atual da URL (apenas a primeira parte do caminho)
  const currentPage = (location.pathname.replace('/sistema/', '').split('/')[0] || 'dashboard') as AdminPage

  /**
   * Navega para uma nova página usando React Router
   */
  const navigateTo = (page: AdminPage) => {
    navigate(`/sistema/${page}`)
  }

  /**
   * Limpa o estado de navegação
   * Usado durante o logout para resetar o estado
   */
  const clearNavigation = () => {
    // Não precisa fazer nada, o React Router gerencia o histórico
  }

  return {
    currentPage,
    navigateTo,
    clearNavigation,
  }
}

// Manter exports antigos para compatibilidade (não são mais usados)
// const NavigationContext = createContext<NavigationContextData | undefined>(undefined)

export function NavigationProvider({ children }: { children: ReactNode }) {
  // Provider vazio para compatibilidade, não é mais necessário
  return <>{children}</>
}
