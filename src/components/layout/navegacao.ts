/**
 * Navegação do sistema (menu lateral e menu do celular): grupos, itens,
 * regra de "item ativo" e títulos das páginas. Fonte única para o desktop e
 * o mobile.
 */

import {
  Building2,
  ClipboardList,
  Clock,
  CreditCard,
  FileClock,
  History,
  Hourglass,
  Info,
  Layers,
  LayoutDashboard,
  Package,
  Palette,
  Receipt,
  Settings,
  ShoppingBag,
  Store,
  TrendingUp,
  UserCog,
  Warehouse,
  type LucideIcon,
} from 'lucide-react'

export interface ItemMenu {
  id: string
  titulo: string
  icone: LucideIcon
  submenu?: ItemMenu[]
  /** Só abre/fecha o submenu (não tem página própria) */
  apenasGrupo?: boolean
}

export interface GrupoMenu {
  titulo: string
  itens: ItemMenu[]
}

export const GRUPOS_MENU: GrupoMenu[] = [
  {
    titulo: 'Operação',
    itens: [
      { id: 'dashboard', titulo: 'Dashboard', icone: LayoutDashboard },
      {
        id: 'pdv',
        titulo: 'PDV',
        icone: Store,
        submenu: [{ id: 'historico-vendas', titulo: 'Histórico de vendas', icone: Receipt }],
      },
      {
        id: 'pedidos',
        titulo: 'Pedidos',
        icone: ShoppingBag,
        submenu: [
          { id: 'aguardando-pagamento', titulo: 'Aguardando pagamento', icone: Hourglass },
          { id: 'historico', titulo: 'Histórico de pedidos', icone: History },
        ],
      },
      {
        id: 'comandas',
        titulo: 'Comandas',
        icone: ClipboardList,
        submenu: [{ id: 'historico-comandas', titulo: 'Histórico de comandas', icone: History }],
      },
    ],
  },
  {
    titulo: 'Catálogo e estoque',
    itens: [
      {
        id: 'produtos',
        titulo: 'Produtos',
        icone: Package,
        submenu: [{ id: 'categorias', titulo: 'Categorias', icone: Layers }],
      },
      {
        id: 'estoque-produtos',
        titulo: 'Estoque',
        icone: Warehouse,
        submenu: [{ id: 'historico-movimentacoes', titulo: 'Movimentações', icone: History }],
      },
    ],
  },
  {
    titulo: 'Gestão',
    itens: [
      { id: 'metricas', titulo: 'Métricas', icone: TrendingUp },
      { id: 'usuarios', titulo: 'Usuários', icone: UserCog },
      { id: 'estabelecimentos', titulo: 'Estabelecimentos', icone: Building2 },
      { id: 'auditoria', titulo: 'Auditoria', icone: FileClock },
      {
        id: 'configuracoes',
        titulo: 'Configurações',
        icone: Settings,
        apenasGrupo: true,
        submenu: [
          { id: 'configuracoes-gerais', titulo: 'Informações gerais', icone: Info },
          { id: 'configuracoes-horario', titulo: 'Horários', icone: Clock },
          { id: 'configuracoes-pagamento', titulo: 'Pagamentos', icone: CreditCard },
          { id: 'configuracoes-visuais', titulo: 'Aparência', icone: Palette },
        ],
      },
    ],
  },
]

/** Páginas internas que pertencem a um item do menu (formulários de criação/edição) */
const PAGINAS_RELACIONADAS: Record<string, string[]> = {
  produtos: ['novo-produto', 'editar-produto', 'novo-combo', 'editar-combo'],
  categorias: ['nova-categoria', 'editar-categoria'],
  'estoque-produtos': ['estoque', 'novo-item-estoque', 'editar-item-estoque'],
  usuarios: ['funcionarios', 'novo-funcionario', 'editar-funcionario'],
}

/** Título das páginas que não estão no menu */
const TITULOS_EXTRAS: Record<string, string> = {
  'novo-produto': 'Novo produto',
  'editar-produto': 'Editar produto',
  'novo-combo': 'Novo combo',
  'editar-combo': 'Editar combo',
  'nova-categoria': 'Nova categoria',
  'editar-categoria': 'Editar categoria',
  estoque: 'Estoque',
  'novo-item-estoque': 'Novo item de estoque',
  'editar-item-estoque': 'Editar item de estoque',
  funcionarios: 'Funcionários',
  'novo-funcionario': 'Novo funcionário',
  'editar-funcionario': 'Editar funcionário',
  sabores: 'Sabores',
  adicionais: 'Adicionais',
}

export function itemAtivo(itemId: string, paginaAtual: string): boolean {
  return itemId === paginaAtual || (PAGINAS_RELACIONADAS[itemId]?.includes(paginaAtual) ?? false)
}

/** Item ou algum subitem ativo */
export function ramoAtivo(item: ItemMenu, paginaAtual: string): boolean {
  return itemAtivo(item.id, paginaAtual) || (item.submenu?.some((s) => itemAtivo(s.id, paginaAtual)) ?? false)
}

/**
 * Itens visíveis para o usuário: cada página passa pela mesma regra de acesso
 * usada nas rotas (`podeAcessarPagina`). Grupos sem itens somem.
 */
export function filtrarMenu(podeAcessarPagina: (pagina: string) => boolean): GrupoMenu[] {
  return GRUPOS_MENU.map((grupo) => ({
    ...grupo,
    itens: grupo.itens
      .map((item) => ({
        ...item,
        submenu: item.submenu?.filter((sub) => podeAcessarPagina(sub.id)),
      }))
      .filter((item) =>
        item.apenasGrupo ? (item.submenu?.length ?? 0) > 0 : item.id === 'dashboard' || podeAcessarPagina(item.id),
      ),
  })).filter((grupo) => grupo.itens.length > 0)
}

/** Título e "trilha" (grupo › item pai) da página atual */
export function localizarPagina(paginaAtual: string): { titulo: string; trilha: string[] } {
  for (const grupo of GRUPOS_MENU) {
    for (const item of grupo.itens) {
      if (itemAtivo(item.id, paginaAtual)) {
        const titulo = item.id === paginaAtual ? item.titulo : TITULOS_EXTRAS[paginaAtual] ?? item.titulo
        return { titulo, trilha: item.id === paginaAtual ? [grupo.titulo] : [grupo.titulo, item.titulo] }
      }
      for (const sub of item.submenu ?? []) {
        if (itemAtivo(sub.id, paginaAtual)) {
          const titulo = sub.id === paginaAtual ? sub.titulo : TITULOS_EXTRAS[paginaAtual] ?? sub.titulo
          return { titulo, trilha: [grupo.titulo, item.titulo] }
        }
      }
    }
  }
  return { titulo: TITULOS_EXTRAS[paginaAtual] ?? 'Painel', trilha: [] }
}

