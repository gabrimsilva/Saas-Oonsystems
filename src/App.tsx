import { useState, useEffect, useRef, Suspense, lazy } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useLocation, useNavigate } from "react-router-dom"
import AppLayout from "@/components/layout/AppLayout"
import { authService } from "@/services"
import { plataformaService } from "@/services/plataformaService"
import { ConfigProvider } from "@/contexts/ConfigContext"
import { ErrorProvider } from "@/contexts/ErrorContext"
import { EstabelecimentoProvider, useEstabelecimento } from "@/contexts/EstabelecimentoContext"
import { TemaEstabelecimentoProvider } from "@/contexts/TemaEstabelecimentoContext"
import { EstabelecimentoPublicoProvider } from "@/contexts/EstabelecimentoPublicoContext"
import { preCarregarConfiguracoes } from "@/lib/configService"
import { useImpressaoAutomaticaGlobal } from "@/hooks/useImpressaoAutomaticaGlobal"
import { usePermissoes } from "@/hooks/usePermissoes"
import SEOHead from "@/components/SEOHead"
import { Toaster } from "react-hot-toast"
import { googleAnalytics } from "@/services/googleAnalyticsService"
import { AlertCircle } from "lucide-react"

// Lazy loading das páginas principais
const Login = lazy(() => import("@/pages/Login"))
const UsuarioBloqueado = lazy(() => import("@/pages/UsuarioBloqueado"))
const Dashboard = lazy(() => import("@/pages/Dashboard"))
const Funcionarios = lazy(() => import("@/pages/Funcionarios"))
const NovoFuncionario = lazy(() => import("@/pages/NovoFuncionario"))
const EditarFuncionario = lazy(() => import("@/pages/EditarFuncionario"))
const Produtos = lazy(() => import("@/pages/Produtos"))
const NovoProduto = lazy(() => import("@/pages/NovoProduto"))
const EditarProduto = lazy(() => import("@/pages/EditarProduto"))
const NovoCombo = lazy(() => import("@/pages/NovoCombo"))
const EditarCombo = lazy(() => import("@/pages/EditarCombo"))
const Pedidos = lazy(() => import("@/pages/Pedidos"))
const Historico = lazy(() => import("@/pages/Historico"))
const AguardandoPagamento = lazy(() => import("@/pages/AguardandoPagamento"))
const Estoque = lazy(() => import("@/pages/Estoque"))
const EstoqueProdutos = lazy(() => import("@/pages/EstoqueProdutos"))
const HistoricoMovimentacoes = lazy(() => import("@/pages/HistoricoMovimentacoes"))
const NovoItemEstoque = lazy(() => import("@/pages/NovoItemEstoque"))
const EditarItemEstoque = lazy(() => import("@/pages/EditarItemEstoque"))
const Sabores = lazy(() => import("@/pages/Sabores"))
const NovoSabor = lazy(() => import("@/pages/NovoSabor"))
const EditarSabor = lazy(() => import("@/pages/EditarSabor"))
const SaboresBorda = lazy(() => import("@/pages/SaboresBorda"))
const NovoSaborBorda = lazy(() => import("@/pages/NovoSaborBorda"))
const EditarSaborBorda = lazy(() => import("@/pages/EditarSaborBorda"))
const Adicionais = lazy(() => import("@/pages/Adicionais"))
const NovoAdicional = lazy(() => import("@/pages/NovoAdicional"))
const EditarAdicional = lazy(() => import("@/pages/EditarAdicional"))
const Categorias = lazy(() => import("@/pages/Categorias"))
const NovaCategoria = lazy(() => import("@/pages/NovaCategoria"))
const EditarCategoria = lazy(() => import("@/pages/EditarCategoria"))
const Configuracoes = lazy(() => import("@/pages/ConfiguracoesIndex"))
const PDV = lazy(() => import("@/pages/PDV"))

const Comandas = lazy(() => import("@/pages/Comandas"))
const HistoricoVendas = lazy(() => import("@/pages/HistoricoVendas"))
const HistoricoComandas = lazy(() => import("@/pages/HistoricoComandas"))
const CatalogoPage = lazy(() => import("@/pages/CatalogoPage"))
const PedidoCatalogoStatus = lazy(() => import("@/pages/PedidoCatalogoStatus"))
const CheckoutWrapper = lazy(() => import("@/components/CheckoutWrapper"))
const ProcessandoPedido = lazy(() => import("@/pages/ProcessandoPedido"))
const MeusPedidos = lazy(() => import("@/pages/MeusPedidos"))
const AvaliarEstabelecimento = lazy(() => import("@/pages/AvaliarEstabelecimento"))
const PagamentoPix = lazy(() => import("@/pages/PagamentoPix"))
const Analytics = lazy(() => import("@/pages/Analytics"))
const Metricas = lazy(() => import("@/pages/Metricas"))
const TermosUso = lazy(() => import("@/pages/TermosUso"))
const PoliticasPrivacidade = lazy(() => import("@/pages/PoliticasPrivacidade"))
const Estabelecimentos = lazy(() => import("@/pages/Estabelecimentos"))
const Usuarios = lazy(() => import("@/pages/Usuarios"))
const Auditoria = lazy(() => import("@/pages/Auditoria"))
const Plataforma = lazy(() => import("@/pages/Plataforma"))
const Cadastro = lazy(() => import("@/pages/Cadastro"))

// Componente de loading
const LoadingSpinner = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-gray-600">Carregando...</p>
    </div>
  </div>
)

// Componente para proteger rotas administrativas
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const currentUserIdRef = useRef<string | null>(null)

  // 🐛 DEBUG: Log para verificar remontagem do ProtectedRoute
  useEffect(() => {
    console.log('🔐 [PROTECTED] ProtectedRoute montado/atualizado')
    return () => {
      console.log('❌ [PROTECTED] ProtectedRoute desmontado')
    }
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await authService.getSession()
        setIsAuthenticated(!!session)
        currentUserIdRef.current = session?.user?.id || null

        // Verificar se o usuário está bloqueado
        if (session?.user) {
          const bloqueado = await authService.isBloqueado()
          if (bloqueado) {
            await authService.logout()
            window.location.href = '/usuario-bloqueado'
            return
          }
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()

    const { data: { subscription } } = authService.onAuthStateChange((event, session) => {
      // Sempre atualizar em SIGNED_OUT
      if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false)
        currentUserIdRef.current = null
        setIsLoading(false)
        return
      }

      // Para SIGNED_IN, verificar se o usuário mudou
      if (event === 'SIGNED_IN') {
        const newUserId = session?.user?.id

        if (newUserId && newUserId !== currentUserIdRef.current) {
          // Verificar se está bloqueado
          authService.isBloqueado().then(bloqueado => {
            if (bloqueado) {
              authService.logout().then(() => {
                window.location.href = '/usuario-bloqueado'
              })
            } else {
              setIsAuthenticated(!!session)
              currentUserIdRef.current = newUserId
              setIsLoading(false)
            }
          })
        }
        return
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Carregando...</p>
        </div>
      </div>
    )
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

// Componente para o sistema administrativo com rotas
function AdminSystem() {
  const location = useLocation()
  const navigate = useNavigate()
  const { permissoes, podeAcessarPagina, isLoading: loadingPermissoes } = usePermissoes()
  const {
    estabelecimentoAtual,
    loading: loadingEstab,
    erro: erroEstab,
  } = useEstabelecimento()

  // 🐛 DEBUG: Log para verificar remontagem do AdminSystem
  useEffect(() => {
    console.log('🏢 [ADMIN] AdminSystem montado/atualizado')
    return () => {
      console.log('❌ [ADMIN] AdminSystem desmontado')
    }
  }, [])

  // 🔄 PERSISTÊNCIA DA ÚLTIMA ROTA ACESSADA
  // Salva a rota atual no localStorage sempre que o usuário navega
  useEffect(() => {
    if (location.pathname.startsWith('/sistema/') && location.pathname !== '/sistema/') {
      localStorage.setItem('oonsystems_last_admin_route', location.pathname)
    }
  }, [location.pathname])

  // Restaura a última rota quando o componente monta (usuário volta ao sistema)
  useEffect(() => {
    const lastRoute = localStorage.getItem('oonsystems_last_admin_route')
    // Se está na rota raiz /sistema/ e existe uma última rota salva, redirecionar
    if (location.pathname === '/sistema/' && lastRoute && lastRoute !== '/sistema/') {
      navigate(lastRoute, { replace: true })
    }
  }, []) // Executa apenas uma vez no mount

  // Determinar a página atual baseada na URL (sem parâmetros)
  const currentPage = location.pathname.replace('/sistema/', '').split('/')[0] || 'dashboard'

  const handleLogout = async () => {
    try {
      await authService.logout()
      navigate('/', { replace: true })
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  const handleBackToCustomer = () => {
    navigate('/', { replace: true })
  }

  // Mostrar loading enquanto carrega permissões
  if (loadingPermissoes) {
    return <LoadingSpinner />
  }

  // Verificar se o usuário tem permissão para acessar a página
  if (!podeAcessarPagina(currentPage)) {
    return (
      <AppLayout 
        onLogout={handleLogout}
        onToggleView={handleBackToCustomer}
        currentPage={currentPage}
      >
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
            <p className="text-gray-600 mb-6">
              Você não tem permissão para acessar esta página.
            </p>
            <div className="text-sm text-gray-500 mb-4">
              <p>Seu nível de acesso: <strong>{permissoes.funcao || 'Administrador'}</strong></p>
              <p className="mt-2">Página solicitada: <strong>{currentPage}</strong></p>
            </div>
            {permissoes.funcao === 'entregador' && (
              <p className="text-sm text-gray-600 mb-4">
                Entregadores não têm acesso à área administrativa.
              </p>
            )}
            {permissoes.funcao === 'garcom' && (
              <p className="text-sm text-gray-600 mb-4">
                Garçons têm acesso apenas à área de Comandas.
              </p>
            )}
            {permissoes.funcao === 'atendente' && (
              <p className="text-sm text-gray-600 mb-4">
                Atendentes têm acesso a Comandas, Pedidos e PDV.
              </p>
            )}
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout 
      onLogout={handleLogout}
      onToggleView={handleBackToCustomer}
      currentPage={currentPage}
    >
      {loadingEstab ? (
        <LoadingSpinner />
      ) : !estabelecimentoAtual ? (
        // Sem estabelecimento selecionado/vinculado: solicitar seleção (Req 9.2, 11.4, 11.5)
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Selecione um estabelecimento</h2>
            <p className="text-gray-600">
              {erroEstab || 'Escolha um estabelecimento no seletor do topo para visualizar os dados.'}
            </p>
          </div>
        </div>
      ) : (
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
          <Route path="/" element={<Navigate to="/sistema/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/pdv" element={<PDV />} />
          <Route path="/historico-vendas" element={<HistoricoVendas />} />
          <Route path="/comandas" element={<Comandas />} />
          <Route path="/historico-comandas" element={<HistoricoComandas />} />

          <Route path="/analytics" element={<Analytics />} />
          <Route path="/metricas" element={<Metricas />} />
          
          {/* Funcionários */}
          <Route path="/funcionarios" element={<Funcionarios />} />
          <Route path="/novo-funcionario" element={<NovoFuncionario />} />
          <Route path="/editar-funcionario/:id" element={<EditarFuncionario />} />
          
          {/* Produtos */}
          <Route path="/produtos" element={<Produtos />} />
          <Route path="/novo-produto" element={<NovoProduto />} />
          <Route path="/editar-produto/:id" element={<EditarProduto />} />
          <Route path="/novo-combo" element={<NovoCombo />} />
          <Route path="/editar-combo/:id" element={<EditarCombo />} />
          
          {/* Pedidos */}
          <Route path="/pedidos" element={<Pedidos />} />
          <Route path="/historico" element={<Historico />} />
          <Route path="/aguardando-pagamento" element={<AguardandoPagamento />} />
          
          {/* Estoque */}
          <Route path="/estoque" element={<Estoque />} />
          <Route path="/estoque-produtos" element={<EstoqueProdutos />} />
          <Route path="/historico-movimentacoes" element={<HistoricoMovimentacoes />} />
          <Route path="/novo-item-estoque" element={<NovoItemEstoque />} />
          <Route path="/editar-item-estoque/:id" element={<EditarItemEstoque />} />
          
          {/* Sabores */}
          <Route path="/sabores" element={<Sabores />} />
          <Route path="/novo-sabor" element={<NovoSabor />} />
          <Route path="/editar-sabor/:id" element={<EditarSabor />} />
          
          {/* Sabores de Borda */}
          <Route path="/sabores-borda" element={<SaboresBorda />} />
          <Route path="/novo-sabor-borda" element={<NovoSaborBorda />} />
          <Route path="/editar-sabor-borda/:id" element={<EditarSaborBorda />} />
          
          {/* Adicionais */}
          <Route path="/adicionais" element={<Adicionais />} />
          <Route path="/novo-adicional" element={<NovoAdicional />} />
          <Route path="/editar-adicional/:id" element={<EditarAdicional />} />
          
          {/* Categorias */}
          <Route path="/categorias" element={<Categorias />} />
          <Route path="/nova-categoria" element={<NovaCategoria />} />
          <Route path="/editar-categoria/:id" element={<EditarCategoria />} />
          
          {/* Configurações */}
          <Route path="/configuracoes" element={<Configuracoes initialPage="index" />} />
          <Route path="/configuracoes-gerais" element={<Configuracoes initialPage="gerais" />} />
          <Route path="/configuracoes-horario" element={<Configuracoes initialPage="horario" />} />
          <Route path="/configuracoes-pagamento" element={<Configuracoes initialPage="pagamento" />} />
          <Route path="/configuracoes-visuais" element={<Configuracoes initialPage="visuais" />} />

          {/* Multi-estabelecimento */}
          <Route path="/estabelecimentos" element={<Estabelecimentos />} />
          <Route path="/usuarios" element={<Usuarios />} />
          <Route path="/auditoria" element={<Auditoria />} />
          
          {/* Rota padrão */}
          <Route path="*" element={<Navigate to="/sistema/dashboard" replace />} />
        </Routes>
      </Suspense>
      )}
    </AppLayout>
  )
}

// Componente de Login
function LoginPage() {
  const handleLogin = async (_credentials: { login: string; senha: string }) => {
    // Após login bem-sucedido: administração da plataforma ou sistema do cliente
    const adminPlataforma = await plataformaService.ehAdminPlataforma()
    window.location.href = adminPlataforma ? '/plataforma' : '/sistema'
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Login onLogin={handleLogin} />
    </Suspense>
  )
}

// Componente da página de checkout
function CustomerCheckoutPage() {
  const handleNavigate = (page: 'delivery' | 'checkout') => {
    if (page === 'delivery') {
      window.location.href = '/'
    }
  }

  return (
    <EstabelecimentoPublicoProvider slug={undefined}>
      <Suspense fallback={<LoadingSpinner />}>
        <CheckoutWrapper onNavigate={handleNavigate} />
      </Suspense>
    </EstabelecimentoPublicoProvider>
  )
}

// Componente da página de meus pedidos
function MeusPedidosPage() {
  const handleVoltar = () => {
    window.location.href = '/'
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <MeusPedidos onVoltar={handleVoltar} />
    </Suspense>
  )
}

// Componente da página de avaliação
function AvaliarEstabelecimentoPage() {
  const handleVoltar = () => {
    window.location.href = '/'
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AvaliarEstabelecimento onVoltar={handleVoltar} />
    </Suspense>
  )
}

// ============================================================================
// Fluxos públicos por slug (multi-estabelecimento) — /:slug, /:slug/pedido/:id, /:slug/avaliar
// ============================================================================
function SlugCatalogoPage() {
  const { slug } = useParams<{ slug: string }>()
  return (
    <EstabelecimentoPublicoProvider slug={slug}>
      <Suspense fallback={<LoadingSpinner />}>
        <CatalogoPage />
      </Suspense>
    </EstabelecimentoPublicoProvider>
  )
}

// O pedido é feito no carrinho do próprio catálogo (Edge Function catalogo-pedidos)
function SlugCheckoutPage() {
  const { slug } = useParams<{ slug: string }>()
  return <Navigate to={`/${slug}`} replace />
}

function SlugPedidoStatusPage() {
  const { slug } = useParams<{ slug: string }>()
  return (
    <EstabelecimentoPublicoProvider slug={slug}>
      <Suspense fallback={<LoadingSpinner />}>
        <PedidoCatalogoStatus />
      </Suspense>
    </EstabelecimentoPublicoProvider>
  )
}

function SlugAvaliarPage() {
  const { slug } = useParams<{ slug: string }>()
  return (
    <EstabelecimentoPublicoProvider slug={slug}>
      <Suspense fallback={<LoadingSpinner />}>
        <AvaliarEstabelecimento onVoltar={() => { window.location.href = `/${slug}` }} />
      </Suspense>
    </EstabelecimentoPublicoProvider>
  )
}

// Componente para rastrear mudanças de página (apenas páginas públicas)
function PageTracker() {
  const location = useLocation()

  useEffect(() => {
    // Não rastrear páginas administrativas (que começam com /sistema ou /login)
    const isAdminPage = location.pathname.startsWith('/sistema') || location.pathname === '/login'
    
    if (!isAdminPage) {
      googleAnalytics.trackPageView(location.pathname + location.search, document.title)
    }
  }, [location])

  return null
}

function App() {
  // Ativar impressão automática global
  useImpressaoAutomaticaGlobal()

  // Pré-carregar configurações essenciais na inicialização
  useEffect(() => {
    preCarregarConfiguracoes().catch(() => {
      // Erro ao pré-carregar configurações
    })
  }, [])

  // Componente da página de processamento do pedido
  function ProcessandoPedidoPage() {
    const { pedidoId } = useParams<{ pedidoId: string }>()
    
    const handleVoltarMenu = () => {
      window.location.href = '/'
    }

    if (!pedidoId) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-4">ID do pedido não encontrado</p>
            <button onClick={handleVoltarMenu} className="bg-red-600 text-white px-4 py-2 rounded">
              Voltar ao Menu
            </button>
          </div>
        </div>
      )
    }

    return (
      <Suspense fallback={<LoadingSpinner />}>
        <ProcessandoPedido pedidoId={pedidoId} onVoltarMenu={handleVoltarMenu} />
      </Suspense>
    )
  }

  return (
    <ErrorProvider>
      <ConfigProvider>
        <SEOHead />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#363636',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              borderRadius: '8px',
              padding: '16px',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <Router>
          <PageTracker />
          <Routes>
            {/* Página principal - Catálogo */}
            {/* Raiz do SaaS: não há "loja padrão"; catálogos ficam em /:slug */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Página de checkout */}
            <Route path="/checkout" element={<CustomerCheckoutPage />} />

            {/* Página de pagamento PIX */}
            <Route path="/pagamento-pix" element={
              <Suspense fallback={<LoadingSpinner />}>
                <PagamentoPix />
              </Suspense>
            } />

            {/* Página de acompanhamento do pedido */}
            <Route path="/meu-pedido/:pedidoId" element={<ProcessandoPedidoPage />} />

            {/* Página de consulta de pedidos */}
            <Route path="/meus-pedidos" element={<MeusPedidosPage />} />

            {/* Página de avaliação do estabelecimento */}
            <Route path="/avaliar" element={<AvaliarEstabelecimentoPage />} />

            {/* Páginas públicas de termos e políticas */}
            <Route path="/termos-uso" element={
              <Suspense fallback={<LoadingSpinner />}>
                <TermosUso />
              </Suspense>
            } />
            <Route path="/politicas-privacidade" element={
              <Suspense fallback={<LoadingSpinner />}>
                <PoliticasPrivacidade />
              </Suspense>
            } />

            {/* Página de login */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/cadastro" element={
              <Suspense fallback={<LoadingSpinner />}>
                <Cadastro />
              </Suspense>
            } />

            {/* Página de usuário bloqueado */}
            <Route path="/usuario-bloqueado" element={
              <Suspense fallback={<LoadingSpinner />}>
                <UsuarioBloqueado />
              </Suspense>
            } />

            {/* Sistema administrativo protegido */}
            <Route
              path="/plataforma"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Plataforma />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/sistema/*"
              element={
                <ProtectedRoute>
                  <EstabelecimentoProvider>
                    <TemaEstabelecimentoProvider>
                      <AdminSystem />
                    </TemaEstabelecimentoProvider>
                  </EstabelecimentoProvider>
                </ProtectedRoute>
              }
            />

            {/* Fluxos públicos por slug (multi-estabelecimento) */}
            <Route path="/:slug/checkout" element={<SlugCheckoutPage />} />
            <Route path="/:slug/pedido/:pedidoId" element={<SlugPedidoStatusPage />} />
            <Route path="/:slug/avaliar" element={<SlugAvaliarPage />} />
            <Route path="/:slug" element={<SlugCatalogoPage />} />

            {/* Redirecionar rotas não encontradas para a página principal */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ConfigProvider>
    </ErrorProvider>
  )
}

export default App
