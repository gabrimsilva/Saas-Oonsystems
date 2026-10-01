// Regras puras do checkout do catálogo (sem rede nem banco): testáveis isoladamente.

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Formas cobradas online pelo Mercado Pago */
export type FormaOnline = 'pix' | 'cartao_credito' | 'cartao_debito'
/** Mesmos valores de `metodos_pagamento` (Configurações > Pagamento) */
export type FormaPedido = FormaOnline | 'dinheiro'
const FORMAS_PEDIDO: FormaPedido[] = ['pix', 'dinheiro', 'cartao_debito', 'cartao_credito']
export type TipoVenda = 'varejo' | 'atacado'

export interface ConfigPublica {
  pedidos_ativos: boolean
  pagamento_online: boolean
  pix: boolean
  credito: boolean
  debito: boolean
  max_parcelas: number
  atacado_ativo: boolean
  atacado_pedido_minimo: number
}

export class ErroCliente extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}

export const centavos = (v: number) => Math.round(v * 100) / 100

interface ItemEntrada {
  produto_id: string
  variante_id: string | null
  quantidade: number
}

export function validarEntradaCriar(body: any) {
  const estabelecimentoId = String(body?.estabelecimento_id ?? '')
  if (!UUID_RE.test(estabelecimentoId)) throw new ErroCliente('Loja inválida.')
  const tipoVenda: TipoVenda = body?.tipo_venda === 'atacado' ? 'atacado' : 'varejo'

  const forma = body?.forma_pagamento as FormaPedido
  if (!FORMAS_PEDIDO.includes(forma)) throw new ErroCliente('Forma de pagamento inválida.')

  const nome = String(body?.cliente?.nome ?? '').trim().replace(/\s+/g, ' ')
  const telefone = String(body?.cliente?.telefone ?? '').replace(/\D/g, '')
  const email = String(body?.cliente?.email ?? '').trim().toLowerCase()
  if (nome.length < 3 || nome.length > 100) throw new ErroCliente('Informe seu nome completo.')
  if (telefone.length < 10 || telefone.length > 13) throw new ErroCliente('Telefone inválido.')
  // Obrigatório só com pagamento online (checado em criarPedido): o Mercado Pago exige o e-mail do pagador
  if (email && (!EMAIL_RE.test(email) || email.length > 120)) throw new ErroCliente('E-mail inválido.')

  const observacoes = String(body?.observacoes ?? '').trim().slice(0, 500) || null

  const itensBrutos = Array.isArray(body?.itens) ? body.itens : []
  if (itensBrutos.length === 0) throw new ErroCliente('O carrinho está vazio.')
  if (itensBrutos.length > 100) throw new ErroCliente('Pedido com itens demais.')

  // Agrupa itens repetidos (mesmo produto + mesma variante)
  const agrupados = new Map<string, ItemEntrada>()
  for (const i of itensBrutos) {
    const produtoId = String(i?.produto_id ?? '')
    const varianteId = i?.variante_id ? String(i.variante_id) : null
    const qtd = Number(i?.quantidade)
    if (!UUID_RE.test(produtoId) || (varianteId && !UUID_RE.test(varianteId))) {
      throw new ErroCliente('Item inválido no carrinho.')
    }
    if (!Number.isInteger(qtd) || qtd < 1 || qtd > 10000) throw new ErroCliente('Quantidade inválida.')
    const chave = `${produtoId}:${varianteId ?? ''}`
    const atual = agrupados.get(chave)
    agrupados.set(chave, {
      produto_id: produtoId,
      variante_id: varianteId,
      quantidade: (atual?.quantidade ?? 0) + qtd,
    })
  }

  return { estabelecimentoId, tipoVenda, forma, nome, telefone, email, observacoes, itens: [...agrupados.values()] }
}

type Num = number | string | null | undefined

/**
 * Preço no catálogo (mesma regra de src/components/catalogo/precos.ts):
 * - varejo: preço online do produto; sem ele, o promocional ou o preço do PDV
 * - atacado: preço de atacado; sem ele, o preço de varejo do catálogo
 */
export function precoCatalogo(
  p: { preco: Num; preco_promocional: Num; preco_online?: Num; preco_atacado?: Num },
  tipoVenda: TipoVenda = 'varejo',
) {
  if (tipoVenda === 'atacado' && Number(p.preco_atacado) > 0) return Number(p.preco_atacado)
  if (Number(p.preco_online) > 0) return Number(p.preco_online)
  const promocional = Number(p.preco_promocional)
  return promocional > 0 ? promocional : Number(p.preco) || 0
}

/** Formas aceitas no pedido. Sem cobrança online valem as formas de Configurações > Pagamento */
export function formasAceitas(config: ConfigPublica, metodosPagamento: string | null): FormaPedido[] {
  if (config.pagamento_online) {
    return [
      ...(config.pix ? ['pix' as const] : []),
      ...(config.credito ? ['cartao_credito' as const] : []),
      ...(config.debito ? ['cartao_debito' as const] : []),
    ]
  }
  try {
    const lista = JSON.parse(metodosPagamento ?? '')
    if (Array.isArray(lista)) {
      const aceitas = FORMAS_PEDIDO.filter(f => lista.includes(f))
      if (aceitas.length > 0) return aceitas
    }
  } catch {
    /* sem configuração: todas */
  }
  return [...FORMAS_PEDIDO]
}

export function formatarTelefone(digitos: string) {
  const d = digitos.startsWith('55') && digitos.length > 11 ? digitos.slice(2) : digitos
  return d.length === 11
    ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
    : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
}
