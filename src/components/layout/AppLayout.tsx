import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  Package,
  History,
  Warehouse,
  Layers,
  Settings,
  LogOut,
  Store,
  Eye,
  ChevronDown,
  ChevronRight,
  Info,
  Receipt,
  Clock,
  CreditCard,
  Palette,
  UserCog,
  TrendingUp,
  ClipboardList
} from "lucide-react"
import MobileAdminHeader from "../MobileAdminHeader"
import { useConfig } from "@/contexts/ConfigContext"
import { usePermissoes } from "@/hooks/usePermissoes"
import { useEstabelecimento } from "@/contexts/EstabelecimentoContext"
import { configuracaoService } from "@/services"
import SeletorEstabelecimento from "@/components/estabelecimento/SeletorEstabelecimento"
import IndicadorEstabelecimento from "@/components/estabelecimento/IndicadorEstabelecimento"
import AvisoTeste from "@/components/AvisoTeste"

interface AppLayoutProps {
  children: React.ReactNode
  onLogout?: () => void
  onToggleView?: () => void
  currentPage?: string
}

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    id: "dashboard"
  },
  {
    title: "PDV",
    icon: Store,
    id: "pdv",
    submenu: [
      {
        title: "Histórico de Vendas",
        icon: Receipt,
        id: "historico-vendas"
      }
    ]
  },
  {
    title: "Comandas",
    icon: ClipboardList,
    id: "comandas",
    submenu: [
      {
        title: "Histórico de Comandas",
        icon: History,
        id: "historico-comandas"
      }
    ]
  },
  {
    title: "Estoque",
    icon: Warehouse,
    id: "estoque-produtos",
    submenu: [
      {
        title: "Histórico de Movimentações",
        icon: History,
        id: "historico-movimentacoes"
      }
    ]
  },
  {
    title: "Produtos",
    icon: Package,
    id: "produtos",
    submenu: [
      {
        title: "Categorias",
        icon: Layers,
        id: "categorias"
      }
    ]
  },
  {
    title: "Configurações",
    icon: Settings,
    id: "configuracoes",
    submenu: [
      {
        title: "Informações Gerais",
        icon: Info,
        id: "configuracoes-gerais"
      },
      {
        title: "Horários",
        icon: Clock,
        id: "configuracoes-horario"
      },
      {
        title: "Pagamentos",
        icon: CreditCard,
        id: "configuracoes-pagamento"
      },
      {
        title: "Aparência",
        icon: Palette,
        id: "configuracoes-visuais"
      }
    ]
  },
  {
    title: "Usuários",
    icon: UserCog,
    id: "usuarios"
  },
  {
    title: "Métricas",
    icon: TrendingUp,
    id: "metricas"
  }
]

export default function AppLayout({ children, onLogout, onToggleView, currentPage = "dashboard" }: AppLayoutProps) {
  const navigate = useNavigate()
  const { permissoes, podeAcessarPagina } = usePermissoes()
  const [activeItem, setActiveItem] = useState(currentPage)
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({})
  const { logoUrl: logoGlobal, nomeEstabelecimento: nomeGlobal } = useConfig()
  const { estabelecimentoAtual } = useEstabelecimento()

  // Logo e nome individuais por estabelecimento (configurados no menu Configurações).
  // Recarrega sempre que o estabelecimento ativo mudar (Req 6.1-6.4).
  const [logoUrl, setLogoUrl] = useState("")
  const [nomeEstabelecimento, setNomeEstabelecimento] = useState("")

  useEffect(() => {
    let ativo = true
    const estabId = estabelecimentoAtual?.id
    if (!estabId) {
      setLogoUrl("")
      setNomeEstabelecimento("")
      return
    }
    // Garante leitura fresca do estabelecimento ativo (evita cache de outro tenant)
    configuracaoService.limparCache()
    Promise.all([
      configuracaoService.buscarPorChave('logo_url').catch(() => null),
      configuracaoService.buscarPorChave('nome_loja').catch(() => null),
    ]).then(([logo, nome]) => {
      if (!ativo) return
      setLogoUrl(logo?.valor || logoGlobal || "")
      setNomeEstabelecimento(nome?.valor || estabelecimentoAtual?.nome || nomeGlobal || "")
    })
    return () => { ativo = false }
  }, [estabelecimentoAtual?.id, estabelecimentoAtual?.nome, logoGlobal, nomeGlobal])

  // Filtrar itens do menu baseado nas permissões (memoizado para evitar loop infinito)
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      // Dashboard sempre visível
      if (item.id === 'dashboard') return true
      
      // Verificar permissão para cada item
      if (item.id === 'pdv') return permissoes.podeAcessarPDV
      if (item.id === 'comandas') return permissoes.podeAcessarComandas
      if (item.id === 'estoque-produtos') return permissoes.podeAcessarEstoque
      if (item.id === 'produtos') return permissoes.podeAcessarProdutos
      if (item.id === 'configuracoes') return permissoes.podeAcessarConfiguracoes
      if (item.id === 'usuarios') return podeAcessarPagina('usuarios')
      if (item.id === 'metricas') return podeAcessarPagina('metricas')
      
      return false
    }).map(item => {
      // Filtrar submenus também
      if (item.submenu) {
        const filteredSubmenu = item.submenu.filter(subitem => {
          if (item.id === 'pdv' && subitem.id === 'historico-vendas') {
            return permissoes.podeAcessarPDV // Mesma permissão do PDV
          }
          if (item.id === 'comandas' && subitem.id === 'historico-comandas') {
            return permissoes.podeAcessarHistoricoComandas
          }
          if (item.id === 'estoque-produtos' && subitem.id === 'historico-movimentacoes') {
            return permissoes.podeAcessarEstoque // Mesma permissão do Estoque
          }
          if (item.id === 'produtos') {
            if (subitem.id === 'categorias') return permissoes.podeAcessarCategorias
          }
          return podeAcessarPagina(subitem.id)
        })
        
        return {
          ...item,
          submenu: filteredSubmenu
        }
      }
      
      return item
    })
  }, [
    permissoes.podeAcessarPDV,
    permissoes.podeAcessarComandas,
    permissoes.podeAcessarHistoricoComandas,
    permissoes.podeAcessarProdutos,
    permissoes.podeAcessarEstoque,
    permissoes.podeAcessarConfiguracoes,
    permissoes.podeAcessarCategorias,
    podeAcessarPagina
  ])

  // Sincronizar com a prop currentPage
  useEffect(() => {
    setActiveItem(currentPage)
    
    // Auto-abrir submenu se a página atual pertence a ele
    const newOpenSubmenus: Record<string, boolean> = {}
    
    filteredMenuItems.forEach(item => {
      if (item.submenu) {
        const isSubmenuActive = item.submenu.some(sub => {
          // Verificar se é a página exata ou se é uma página relacionada
          if (sub.id === currentPage) return true
          
          // Para categorias, considerar nova-categoria e editar-categoria-*
          if (sub.id === 'categorias' && (
            currentPage === 'nova-categoria' || 
            currentPage === 'editar-categoria'
          )) {
            return true
          }
          
          // Para funcionários, considerar novo-funcionario e editar-funcionario-*
          if (sub.id === 'funcionarios' && (
            currentPage === 'novo-funcionario' ||
            currentPage === 'editar-funcionario'
          )) {
            return true
          }
          
          return false
        })
        
        // Para produtos, considerar novo-produto, editar-produto-*, novo-combo e editar-combo-*
        const isProdutosActive = item.id === 'produtos' && (
          currentPage === 'novo-produto' ||
          currentPage === 'editar-produto' ||
          currentPage === 'novo-combo' ||
          currentPage === 'editar-combo'
        )
        
        if (isSubmenuActive || isProdutosActive) {
          newOpenSubmenus[item.id] = true
        }
      }
    })
    
    // Só atualizar se houver mudanças
    setOpenSubmenus(prev => {
      const hasChanges = Object.keys(newOpenSubmenus).some(key => !prev[key])
      return hasChanges ? { ...prev, ...newOpenSubmenus } : prev
    })
  }, [currentPage])

  // Função para verificar se um item está ativo
  const isItemActive = (itemId: string) => {
    if (itemId === activeItem) return true
    
    // Para produtos, considerar novo-produto, editar-produto-*, novo-combo e editar-combo-*
    if (itemId === 'produtos' && (
      activeItem === 'novo-produto' ||
      activeItem === 'editar-produto' ||
      activeItem === 'novo-combo' ||
      activeItem === 'editar-combo'
    )) {
      return true
    }
    
    // Para categorias, considerar nova-categoria e editar-categoria-*
    if (itemId === 'categorias' && (
      activeItem === 'nova-categoria' || 
      activeItem === 'editar-categoria'
    )) {
      return true
    }
    
    // Para funcionários, considerar novo-funcionario e editar-funcionario-*
    if (itemId === 'funcionarios' && (
      activeItem === 'novo-funcionario' ||
      activeItem === 'editar-funcionario'
    )) {
      return true
    }
    
    // Para estoque-produtos
    if (itemId === 'estoque-produtos' && activeItem === 'estoque-produtos') {
      return true
    }
    
    return false
  }

  const toggleSubmenu = (itemId: string) => {
    setOpenSubmenus(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }))
  }

  const handleNavigation = (itemId: string) => {
    setActiveItem(itemId)
    navigate(`/sistema/${itemId}`)
  }

  const handleLogout = () => {
    if (onLogout) {
      onLogout()
    }
  }

  return (
    <div className="flex h-screen w-full">
      {/* Sidebar fixa - apenas desktop */}
      <div className="hidden md:flex w-64 bg-sidebar border-r border-sidebar-border flex-col h-screen">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 px-6 py-5 border-b border-sidebar-border flex-shrink-0">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={nomeEstabelecimento}
              className="h-14 w-14 object-cover rounded-full ring-2 ring-sidebar-primary/30 shadow-md bg-white"
            />
          ) : (
            <div className="h-14 w-14 rounded-full bg-sidebar-primary flex items-center justify-center shadow-md ring-2 ring-sidebar-primary/30">
              <Store className="h-7 w-7 text-sidebar-primary-foreground" />
            </div>
          )}
          <span className="font-bold text-xl text-sidebar-foreground leading-tight">
            {nomeEstabelecimento}
          </span>
        </div>

        {/* Menu */}
        <div className="flex-1 py-4 overflow-y-auto min-h-0">
          <nav className="space-y-1 px-3">
            {filteredMenuItems.map((item) => (
              <div key={item.id}>
                <div className="relative">
                  <button
                    onClick={() => {
                      // Configurações só abre submenu
                      if (item.id === 'configuracoes') {
                        toggleSubmenu(item.id)
                      } else {
                        handleNavigation(item.id)
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${isItemActive(item.id)
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg'
                      : 'text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent'
                      }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.title}</span>
                  </button>

                  {/* Botão da seta separado para itens com submenu (exceto Configurações) */}
                  {item.submenu && item.submenu.length > 0 && item.id !== 'configuracoes' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleSubmenu(item.id)
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-sidebar-border rounded transition-colors z-10"
                    >
                      {openSubmenus[item.id] ? (
                        <ChevronDown className="h-4 w-4 text-sidebar-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-sidebar-foreground" />
                      )}
                    </button>
                  )}

                  {/* Seta para Configurações (comportamento antigo - clique no botão inteiro) */}
                  {item.id === 'configuracoes' && item.submenu && item.submenu.length > 0 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      {openSubmenus[item.id] ? (
                        <ChevronDown className="h-4 w-4 text-sidebar-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-sidebar-foreground" />
                      )}
                    </div>
                  )}
                </div>

                {/* Submenu */}
                {item.submenu && item.submenu.length > 0 && openSubmenus[item.id] && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.submenu.map((subitem: any) => (
                      <button
                        key={subitem.id}
                        onClick={() => handleNavigation(subitem.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${isItemActive(subitem.id)
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg'
                          : 'text-sidebar-foreground/70 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent'
                          }`}
                      >
                        <subitem.icon className="h-4 w-4" />
                        <span>{subitem.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-3 space-y-2 flex-shrink-0">
          <button
            onClick={onToggleView}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent rounded-lg transition-all duration-200"
          >
            <Eye className="h-5 w-5" />
            <span>Voltar ao Site</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent rounded-lg transition-all duration-200"
          >
            <LogOut className="h-5 w-5" />
            <span>Sair</span>
          </button>
        </div>
      </div>

      {/* Conteúdo principal */}
      <main className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        {/* Header mobile */}
        <MobileAdminHeader
          onLogout={onLogout}
          onToggleView={onToggleView}
          currentPage={currentPage}
        />

        {/* Barra superior fixa (desktop) — indicador + seletor de estabelecimento */}
        <div className="hidden md:flex items-center justify-between gap-4 px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0">
          <IndicadorEstabelecimento />
          <SeletorEstabelecimento />
        </div>

        <div className="flex-1 overflow-y-auto pt-16 md:pt-0">
          <AvisoTeste />
          {children}
        </div>
      </main>
    </div>
  )
}