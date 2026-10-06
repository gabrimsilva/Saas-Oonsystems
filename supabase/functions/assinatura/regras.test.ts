import { assertEquals } from 'jsr:@std/assert@1'
import {
  acessoSuspenso,
  escolherPlano,
  formaDoPagamento,
  origemValida,
  podePagarOnline,
  type PlanoAssinatura,
  type TenantAssinatura,
} from './regras.ts'

const AGORA = new Date('2026-10-06T12:00:00Z').getTime()
const emDias = (d: number) => new Date(AGORA + d * 86_400_000).toISOString()

const ESSENCIAL: PlanoAssinatura = { id: 'p1', nome: 'Essencial', preco_mensal: 99, preco_anual: 990, ativo: true }
const PRO: PlanoAssinatura = { id: 'p2', nome: 'Pro', preco_mensal: 199, preco_anual: 1990, ativo: true }
const GRATIS: PlanoAssinatura = { id: 'p0', nome: 'Grátis', preco_mensal: 0, preco_anual: 0, ativo: true }
const ANTIGO: PlanoAssinatura = { id: 'p9', nome: 'Antigo', preco_mensal: 50, preco_anual: 500, ativo: false }

const tenant = (t: Partial<TenantAssinatura>): TenantAssinatura => ({
  status: 'ativo',
  plano_id: 'p1',
  ciclo: 'mensal',
  vigencia_ate: emDias(10),
  trial_ate: null,
  ...t,
})

Deno.test('acesso suspenso segue a regra do banco (tolerância de 5 dias)', () => {
  assertEquals(acessoSuspenso(tenant({ vigencia_ate: emDias(-4) }), AGORA), false)
  assertEquals(acessoSuspenso(tenant({ vigencia_ate: emDias(-6) }), AGORA), true)
  assertEquals(acessoSuspenso(tenant({ vigencia_ate: null }), AGORA), false)
  assertEquals(acessoSuspenso(tenant({ status: 'trial', trial_ate: emDias(-1) }), AGORA), true)
  assertEquals(acessoSuspenso(tenant({ status: 'suspenso' }), AGORA), true)
})

Deno.test('só teste e ativo pagam online', () => {
  assertEquals(podePagarOnline(tenant({ status: 'trial' })), true)
  assertEquals(podePagarOnline(tenant({})), true)
  assertEquals(podePagarOnline(tenant({ status: 'suspenso' })), false)
  assertEquals(podePagarOnline(tenant({ status: 'cancelado' })), false)
})

Deno.test('cliente ativo com plano paga o próprio plano e ciclo, ignorando o pedido', () => {
  const r = escolherPlano(tenant({ ciclo: 'anual' }), [ESSENCIAL, PRO], { planoId: 'p2', ciclo: 'mensal' })
  assertEquals('erro' in r ? r.erro : [r.plano.id, r.ciclo], ['p1', 'anual'])
})

Deno.test('cliente ativo continua pagando plano que saiu de venda', () => {
  const r = escolherPlano(tenant({ plano_id: 'p9' }), [ESSENCIAL, ANTIGO], {})
  assertEquals('erro' in r ? r.erro : r.plano.id, 'p9')
})

Deno.test('em teste escolhe plano e ciclo; sem pedido usa o primeiro plano pago', () => {
  const t = tenant({ status: 'trial', plano_id: null, vigencia_ate: null })
  const escolhido = escolherPlano(t, [GRATIS, ESSENCIAL, PRO], { planoId: 'p2', ciclo: 'anual' })
  assertEquals('erro' in escolhido ? escolhido.erro : [escolhido.plano.id, escolhido.ciclo], ['p2', 'anual'])
  const padrao = escolherPlano(t, [GRATIS, ESSENCIAL, PRO], {})
  assertEquals('erro' in padrao ? padrao.erro : padrao.plano.id, 'p1')
})

Deno.test('recusa plano inativo, inexistente ou sem valor', () => {
  const t = tenant({ status: 'trial', plano_id: null })
  assertEquals('erro' in escolherPlano(t, [ESSENCIAL, ANTIGO], { planoId: 'p9' }), true)
  assertEquals('erro' in escolherPlano(t, [ESSENCIAL], { planoId: 'xx' }), true)
  assertEquals('erro' in escolherPlano(t, [GRATIS], { planoId: 'p0' }), true)
})

Deno.test('forma do pagamento a partir do tipo do Mercado Pago', () => {
  assertEquals(formaDoPagamento('bank_transfer'), 'pix')
  assertEquals(formaDoPagamento('credit_card'), 'cartao')
  assertEquals(formaDoPagamento('ticket'), 'boleto')
  assertEquals(formaDoPagamento('account_money'), 'outro')
})

Deno.test('origem de retorno aceita só http(s) e descarta o caminho', () => {
  assertEquals(origemValida('https://app.oonsystems.tech/qualquer'), 'https://app.oonsystems.tech')
  assertEquals(origemValida('javascript:alert(1)'), null)
  assertEquals(origemValida(null), null)
})
