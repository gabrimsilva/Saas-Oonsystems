import { assertEquals, assertThrows } from 'jsr:@std/assert@1'
import { ErroCliente, formasAceitas, formatarTelefone, precoCatalogo, validarEntradaCriar } from './regras.ts'

const ESTAB = '11111111-1111-4111-8111-111111111111'
const PROD = '22222222-2222-4222-8222-222222222222'
const VAR = '33333333-3333-4333-8333-333333333333'

const base = () => ({
  estabelecimento_id: ESTAB,
  forma_pagamento: 'pix',
  cliente: { nome: '  Maria   da Silva ', telefone: '(41) 99999-8888' },
  itens: [{ produto_id: PROD, quantidade: 2 }],
})

Deno.test('normaliza nome e telefone', () => {
  const e = validarEntradaCriar(base())
  assertEquals(e.nome, 'Maria da Silva')
  assertEquals(e.telefone, '41999998888')
  assertEquals(e.estabelecimentoId, ESTAB)
})

Deno.test('agrupa itens repetidos do mesmo produto e variante', () => {
  const e = validarEntradaCriar({
    ...base(),
    itens: [
      { produto_id: PROD, variante_id: VAR, quantidade: 1 },
      { produto_id: PROD, variante_id: VAR, quantidade: 3 },
      { produto_id: PROD, quantidade: 1 },
    ],
  })
  assertEquals(e.itens, [
    { produto_id: PROD, variante_id: VAR, quantidade: 4 },
    { produto_id: PROD, variante_id: null, quantidade: 1 },
  ])
})

Deno.test('recusa entrada inválida', () => {
  assertThrows(() => validarEntradaCriar({ ...base(), estabelecimento_id: 'x' }), ErroCliente, 'Loja inválida')
  assertThrows(() => validarEntradaCriar({ ...base(), forma_pagamento: 'boleto' }), ErroCliente, 'Forma de pagamento')
  assertThrows(() => validarEntradaCriar({ ...base(), itens: [] }), ErroCliente, 'vazio')
  assertThrows(() => validarEntradaCriar({ ...base(), itens: [{ produto_id: PROD, quantidade: 0 }] }), ErroCliente, 'Quantidade')
  assertThrows(() => validarEntradaCriar({ ...base(), itens: [{ produto_id: PROD, quantidade: 1.5 }] }), ErroCliente, 'Quantidade')
  assertThrows(() => validarEntradaCriar({ ...base(), itens: [{ produto_id: 'abc', quantidade: 1 }] }), ErroCliente, 'Item inválido')
  assertThrows(() => validarEntradaCriar({ ...base(), cliente: { nome: 'Jo', telefone: '41999998888' } }), ErroCliente, 'nome')
  assertThrows(() => validarEntradaCriar({ ...base(), cliente: { nome: 'Maria', telefone: '123' } }), ErroCliente, 'Telefone')
  assertThrows(
    () => validarEntradaCriar({ ...base(), cliente: { nome: 'Maria', telefone: '41999998888', email: 'x@' } }),
    ErroCliente,
    'E-mail',
  )
})

Deno.test('preço do catálogo usa o promocional quando houver', () => {
  assertEquals(precoCatalogo({ preco: 50, preco_promocional: 39.9 }), 39.9)
  assertEquals(precoCatalogo({ preco: '50.00', preco_promocional: '0' }), 50)
  assertEquals(precoCatalogo({ preco: 50, preco_promocional: null }), 50)
  assertEquals(precoCatalogo({ preco: null, preco_promocional: null }), 0)
})

Deno.test('preço online vale no varejo e o de atacado no modo atacado', () => {
  const p = { preco: 50, preco_promocional: 45, preco_online: 48, preco_atacado: 30 }
  assertEquals(precoCatalogo(p, 'varejo'), 48)
  assertEquals(precoCatalogo(p, 'atacado'), 30)
  // Sem preço de atacado, o atacado usa o preço de varejo do catálogo
  assertEquals(precoCatalogo({ ...p, preco_atacado: null }, 'atacado'), 48)
  assertEquals(precoCatalogo({ preco: 50, preco_promocional: 45 }, 'atacado'), 45)
})

Deno.test('tipo de venda: só "atacado" explícito vira atacado', () => {
  assertEquals(validarEntradaCriar({ ...base(), tipo_venda: 'atacado' }).tipoVenda, 'atacado')
  assertEquals(validarEntradaCriar({ ...base(), tipo_venda: 'x' }).tipoVenda, 'varejo')
  assertEquals(validarEntradaCriar(base()).tipoVenda, 'varejo')
})

const cfg = (parcial: Record<string, unknown>) => ({
  pedidos_ativos: true,
  pagamento_online: false,
  pix: true,
  credito: true,
  debito: true,
  max_parcelas: 1,
  atacado_ativo: false,
  atacado_pedido_minimo: 0,
  ...parcial,
})

Deno.test('com cobrança online valem só as formas online ligadas (sem dinheiro)', () => {
  assertEquals(formasAceitas(cfg({ pagamento_online: true, debito: false }), null), ['pix', 'cartao_credito'])
})

Deno.test('sem cobrança online valem as formas de Configurações > Pagamento', () => {
  assertEquals(formasAceitas(cfg({}), '["dinheiro","pix","cartao_vr"]'), ['pix', 'dinheiro'])
  // Sem configuração (ou inválida) aceita todas
  assertEquals(formasAceitas(cfg({}), null), ['pix', 'dinheiro', 'cartao_debito', 'cartao_credito'])
  assertEquals(formasAceitas(cfg({}), 'lixo'), ['pix', 'dinheiro', 'cartao_debito', 'cartao_credito'])
})

Deno.test('formata telefone', () => {
  assertEquals(formatarTelefone('41999998888'), '(41) 99999-8888')
  assertEquals(formatarTelefone('4133334444'), '(41) 3333-4444')
  assertEquals(formatarTelefone('5541999998888'), '(41) 99999-8888')
})
