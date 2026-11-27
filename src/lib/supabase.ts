import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variáveis de ambiente do Supabase não encontradas')
}

/**
 * Cliente Supabase configurado
 * Use este cliente para operações diretas ao banco de dados
 *
 * @example
 * ```ts
 * import { supabase } from '@/lib/supabase'
 * const { data } = await supabase.from('tabela').select('*')
 * ```
 */
const clientePainel = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Conexão sem login, usada pelas páginas públicas da loja (/:slug).
 * Quem está logado no painel de uma loja só enxerga os dados do próprio
 * cliente; sem isso, o catálogo de outra loja aparecia como "não encontrado".
 */
const clientePublico = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'sb-oonsystems-publico' },
})

let acessoPublico = false

/** Liga/desliga o acesso como visitante (chamado pelo EstabelecimentoPublicoProvider). */
export function usarAcessoPublico(ativo: boolean) {
  acessoPublico = ativo
}

// Login e tempo real ficam sempre na conexão do painel (os canais são criados e removidos nela).
const SEMPRE_PAINEL = new Set<PropertyKey>(['auth', 'realtime', 'channel', 'getChannels', 'removeChannel', 'removeAllChannels'])

export const supabase = new Proxy(clientePainel, {
  get(painel, prop) {
    const alvo = acessoPublico && !SEMPRE_PAINEL.has(prop) ? clientePublico : painel
    const valor = Reflect.get(alvo, prop, alvo)
    return typeof valor === 'function' ? valor.bind(alvo) : valor
  },
})

/**
 * IMPORTANTE: Todos os services foram migrados para @/services
 *
 * Para usar os services, importe de @/services:
 * ```ts
 * import { pedidoService, clienteService, etc } from '@/services'
 * ```
 *
 * Não importe services deste arquivo.
 */

// Re-exportar tipos do arquivo centralizado para compatibilidade
export type {
  UsuarioSupabase,
  ConfiguracaoSupabase,
  CategoriaSupabase,
  EstoqueSupabase,
  FuncionarioSupabase,
  SaborSupabase,
  AdicionalSupabase,
  ComandaSupabase,
  HistoricoComandaSupabase,
  ProdutoSupabase,
  ComboSupabase,
  TamanhoSupabase,
  ProdutoSaborSupabase,
  ComboProdutoSupabase,
  HistoricoPedidoSupabase,
  PedidoSupabase
} from '@/types/supabase'

// Re-exportar clienteService do arquivo antigo (deprecado, migrar para @/services)
export { clienteService } from './clienteService'
