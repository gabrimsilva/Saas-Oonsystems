import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Menu,
  Home,
  Package,
  Settings,
  History,
  Tags,
  Archive,
  Eye,
  LogOut,
  Store,
  ChevronDown,
  ChevronRight,
  Info,
  Clock,
  CreditCard,
  Palette,
  UserCog,
  TrendingUp,
  ClipboardList
} from "lucide-react"
import { configuracaoService } from "@/services"
import { usePermissoes } from "@/hooks/usePermissoes"
import { useEstabelecimento } from "@/contexts/EstabelecimentoContext"
import IndicadorEstabelecimento from "@/components/estabelecimento/IndicadorEstabelecimento"

interface SubMenuItem {
  name: string
  id: string
  icon: React.ComponentType<{ className?: string }>
}

interface MenuItem {
  name: string
  id: string
  icon: React.ComponentType<{ className?: string }>
  submenu?: SubMenuItem[]
}

const menuItems: MenuItem[] = [
  { name: "Dashboard", id: "dashboard", icon: Home },
  { 
    name: "PDV", 
    id: "pdv", 
    icon: Store,
    submenu: [
      { name: "Histórico de Vendas", id: "historico-vendas", icon: History }
    ]
  },
  { 
    name: "Comandas", 
    id: "comandas", 
    icon: ClipboardList,
    submenu: [
      { name: "Histórico", id: "historico-comandas", icon: History }
    ]
  },
  { 
    name: "Estoque", 
    id: "estoque-produtos", 
    icon: Archive,
    submenu: [
      { name: "Histórico de Movimentações", id: "historico-movimentacoes", icon: History }
    ]
  },
  { 
    name: "Produtos", 
    id: "produtos", 
    icon: Package,
    submenu: [
      { name: "Categorias", id: "categorias", icon: Tags }
    ]
  },
  { 
    name: "Configurações", 
    id: "configuracoes", 
    icon: Settings,
    submenu: [
      { name: "Informações Gerais", id: "configuracoes-gerais", icon: Info },
      { name: "Horários", id: "configuracoes-horario", icon: Clock },
      { name: "Pagamentos", id: "configuracoes-pagamento", icon: CreditCard },
      { name: "Aparência", id: "configuracoes-visuais", icon: Palette }
    ]
  },
  { name: "Usuários", id: "usuarios", icon: UserCog },
  { name: "Métricas", id: "metricas", icon: TrendingUp }
]

interface MobileAdminHeaderProps {
  onLogout?: () => void
  onToggleView?: () => void
  currentPage?: string
}

export default function MobileAdminHeader({ onLogout, onToggleView, currentPage = "dashboard" }: MobileAdminHeaderProps) {
  const navigate = useNavigate()
  const { permissoes, podeAcessarPagina } = usePermissoes()
  const { estabelecimentoAtual } = useEstabelecimento()
  const [nomeEstabelecimento, setNomeEstabelecimento] = useState("Sistema Admin")
  const [isOpen, setIsOpen] = useState(false)
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({})

  // Filtrar itens do menu conforme a matriz de permissões (Req 2)
  const visibleMenuItems = menuItems.filter((item) => {
    switch (item.id) {
      case 'dashboard':
        return true
      case 'pdv':
        return permissoes.podeAcessarPDV
      case 'comandas':
        return permissoes.podeAcessarComandas
      case 'estoque-produtos':
        return permissoes.podeAcessarEstoque
      case 'produtos':
        return permissoes.podeAcessarProdutos
      case 'configuracoes':
        return permissoes.podeAcessarConfiguracoes
      case 'usuarios':
      case 'metricas':
        return podeAcessarPagina(item.id)
      default:
        return false
    }
  })

  useEffect(() => {
    const carregarNome = async () => {
      try {
        const config = await configuracaoService.buscarPorChave('nome_loja')
        if (config?.valor) {
          setNomeEstabelecimento(config.valor)
        } else if (estabelecimentoAtual?.nome) {
          setNomeEstabelecimento(estabelecimentoAtual.nome)
        }
      } catch (error) {
        // Erro ao carregar nome do estabelecimento
        if (estabelecimentoAtual?.nome) {
          setNomeEstabelecimento(estabelecimentoAtual.nome)
        }
      }
    }

    carregarNome()
  }, [estabelecimentoAtual?.id, estabelecimentoAtual?.nome])

  // Auto-abrir submenu se a página atual pertence a ele
  useEffect(() => {
    const newOpenSubmenus: Record<string, boolean> = {}
    
    menuItems.forEach(item => {
      if (item.submenu) {
        const isSubmenuActive = item.submenu.some(sub => {
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
          
          // Para sabores, considerar novo-sabor, novo-sabor-borda e editar-sabor-*
          if (sub.id === 'sabores' && (
            currentPage === 'novo-sabor' ||
            currentPage === 'novo-sabor-borda' ||
            currentPage === 'editar-sabor'
          )) {
            return true
          }
          
          // Para adicionais, considerar novo-adicional e editar-adicional-*
          if (sub.id === 'adicionais' && (
            currentPage === 'novo-adicional' ||
            currentPage === 'editar-adicional'
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
    if (itemId === currentPage) return true
    
    // Para produtos, considerar novo-produto, editar-produto-*, novo-combo e editar-combo-*
    if (itemId === 'produtos' && (
      currentPage === 'novo-produto' ||
      currentPage === 'editar-produto' ||
      currentPage === 'novo-combo' ||
      currentPage === 'editar-combo'
    )) {
      return true
    }
    
    // Para categorias, considerar nova-categoria e editar-categoria-*
    if (itemId === 'categorias' && (
      currentPage === 'nova-categoria' || 
      currentPage === 'editar-categoria'
    )) {
      return true
    }
    
    // Para funcionários, considerar novo-funcionario e editar-funcionario-*
    if (itemId === 'funcionarios' && (
      currentPage === 'novo-funcionario' ||
      currentPage === 'editar-funcionario'
    )) {
      return true
    }
    
    // Para sabores, considerar novo-sabor, novo-sabor-borda e editar-sabor-*
    if (itemId === 'sabores' && (
      currentPage === 'novo-sabor' ||
      currentPage === 'novo-sabor-borda' ||
      currentPage === 'editar-sabor'
    )) {
      return true
    }
    
    // Para adicionais, considerar novo-adicional e editar-adicional-*
    if (itemId === 'adicionais' && (
      currentPage === 'novo-adicional' ||
      currentPage === 'editar-adicional'
    )) {
      return true
    }
    
    // Para estoque, considerar novo-item-estoque e editar-item-estoque-*
    if (itemId === 'estoque' && (
      currentPage === 'novo-item-estoque' ||
      currentPage === 'editar-item-estoque'
    )) {
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

  const handleNavigation = (pageId: string) => {
    navigate(`/sistema/${pageId}`)
    setIsOpen(false)
  }

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-indigo-500 to-indigo-500 border-b border-indigo-600 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="p-2 text-white hover:bg-indigo-700">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 max-w-[calc(100vw-3rem)] bg-gradient-to-b from-indigo-500 to-indigo-500 border-indigo-600 p-0 mr-12 h-full [&>button]:bg-red-600 [&>button]:hover:bg-red-700 [&>button]:text-white flex flex-col">
            <SheetHeader className="mb-6 p-6 pb-0 flex-shrink-0">
              <SheetTitle className="text-left text-white">Menu de Navegação</SheetTitle>
              <SheetDescription className="sr-only">
                Menu principal de navegação do sistema administrativo
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              <div className="space-y-2">
                {visibleMenuItems.map((item) => {
                  const Icon = item.icon
                  const isActive = isItemActive(item.id)
                  return (
                    <div key={item.id}>
                      <div className="relative">
                        <button
                          onClick={() => {
                            if (item.submenu && item.submenu.length > 0) {
                              // Se tem submenu, navega E expande
                              handleNavigation(item.id)
                              toggleSubmenu(item.id)
                            } else {
                              // Se não tem submenu, apenas navega
                              handleNavigation(item.id)
                            }
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 pr-10 text-left text-sm font-medium rounded-lg transition-all duration-200 ${
                            isActive 
                              ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm' 
                              : 'text-white/80 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                          <span>{item.name}</span>
                          
                          {/* Seta integrada no botão para todos os itens com submenu */}
                          {item.submenu && item.submenu.length > 0 && (
                            <div className="ml-auto">
                              {openSubmenus[item.id] ? (
                                <ChevronDown className="h-4 w-4 text-white" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-white" />
                              )}
                            </div>
                          )}
                        </button>
                      </div>

                      {/* Submenu */}
                      {item.submenu && item.submenu.length > 0 && openSubmenus[item.id] && (
                        <div className="ml-4 mt-1 space-y-1">
                          {item.submenu.map((subitem) => {
                            const SubIcon = subitem.icon
                            const isSubActive = isItemActive(subitem.id)
                            return (
                              <button
                                key={subitem.id}
                                onClick={() => handleNavigation(subitem.id)}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-left text-sm font-medium rounded-lg transition-all duration-200 ${
                                  isSubActive 
                                    ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm' 
                                    : 'text-white/70 hover:text-white hover:bg-white/10'
                                }`}
                              >
                                <SubIcon className="h-4 w-4" />
                                <span>{subitem.name}</span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
                
                {/* Separador */}
                <div className="border-t border-white/20 my-6" />
                
                {/* Ações especiais */}
                <button
                  onClick={() => {
                    if (onToggleView) {
                      onToggleView()
                    }
                    setIsOpen(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                >
                  <Eye className="h-5 w-5" />
                  <span>Voltar ao Site</span>
                </button>
                
                <button
                  onClick={() => {
                    if (onLogout) {
                      onLogout()
                    }
                    setIsOpen(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sair</span>
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <h1 className="font-semibold text-white truncate">
          {nomeEstabelecimento}
        </h1>

        {/* Indicador permanente do estabelecimento atual (Req 7.1) */}
        <div className="flex-shrink-0">
          <IndicadorEstabelecimento />
        </div>
      </div>
    </div>
  )
}