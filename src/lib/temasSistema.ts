/**
 * Temas do painel (escolhidos por cliente em Configurações > Tema do sistema).
 *
 * Cada tema troca a cor primária, a secundária (segunda série dos gráficos) e o
 * tom do menu/realces, no claro e no escuro. As cores de status (sucesso, aviso,
 * erro, informação) nunca mudam: por isso não há temas vermelhos, verdes ou
 * âmbar. As variáveis ficam em src/index.css (`:root[data-tema="..."]`); os
 * valores abaixo são os mesmos, usados nas prévias da tela de escolha.
 */

export type IdTema = 'azul' | 'marinho' | 'petroleo' | 'grafite' | 'ameixa'

export interface TemaSistema {
  id: IdTema
  nome: string
  descricao: string
  /** Prévia (tema claro): mesmas cores do src/index.css */
  primaria: string
  secundaria: string
  /** Fundo do menu lateral */
  menu: string
  /** Menu escuro (texto claro) */
  menuEscuro: boolean
  /** Cor do item ativo no menu */
  ativo: string
  /** Fundo das páginas */
  fundo: string
}

export const TEMA_PADRAO: IdTema = 'azul'

export const TEMAS_SISTEMA: TemaSistema[] = [
  {
    id: 'azul',
    nome: 'Azul OonSystems',
    descricao: 'O padrão: menu claro, azul com ardósia.',
    primaria: 'oklch(0.50 0.15 258)',
    secundaria: 'oklch(0.62 0.09 200)',
    menu: 'oklch(1 0 0)',
    menuEscuro: false,
    ativo: 'oklch(0.50 0.15 258)',
    fundo: 'oklch(0.982 0.002 250)',
  },
  {
    id: 'marinho',
    nome: 'Marinho',
    descricao: 'Menu azul-marinho, com cinza-azulado.',
    primaria: 'oklch(0.40 0.12 264)',
    secundaria: 'oklch(0.62 0.05 230)',
    menu: 'oklch(0.270 0.065 264)',
    menuEscuro: true,
    ativo: 'oklch(0.860 0.070 264)',
    fundo: 'oklch(0.975 0.010 264)',
  },
  {
    id: 'petroleo',
    nome: 'Petróleo',
    descricao: 'Menu verde-azulado escuro, com tons de areia.',
    primaria: 'oklch(0.46 0.085 200)',
    secundaria: 'oklch(0.66 0.07 75)',
    menu: 'oklch(0.300 0.050 205)',
    menuEscuro: true,
    ativo: 'oklch(0.870 0.060 205)',
    fundo: 'oklch(0.975 0.010 205)',
  },
  {
    id: 'grafite',
    nome: 'Grafite',
    descricao: 'Menu grafite neutro, com azul-acinzentado.',
    primaria: 'oklch(0.36 0.015 260)',
    secundaria: 'oklch(0.62 0.07 245)',
    menu: 'oklch(0.260 0.012 260)',
    menuEscuro: true,
    ativo: 'oklch(0.900 0.020 260)',
    fundo: 'oklch(0.975 0.004 260)',
  },
  {
    id: 'ameixa',
    nome: 'Ameixa',
    descricao: 'Menu roxo acinzentado, com lilás suave.',
    primaria: 'oklch(0.44 0.10 325)',
    secundaria: 'oklch(0.62 0.07 300)',
    menu: 'oklch(0.280 0.060 325)',
    menuEscuro: true,
    ativo: 'oklch(0.870 0.060 325)',
    fundo: 'oklch(0.975 0.010 325)',
  },
]

export const temaValido = (id: unknown): id is IdTema =>
  typeof id === 'string' && TEMAS_SISTEMA.some((t) => t.id === id)

/** Aplica o tema no <html> (o padrão não precisa de atributo). */
export function aplicarTemaSistema(id: IdTema | null) {
  const raiz = document.documentElement
  if (!id || id === TEMA_PADRAO) raiz.removeAttribute('data-tema')
  else raiz.setAttribute('data-tema', id)
}
