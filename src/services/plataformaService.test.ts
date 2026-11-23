import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))

import {
  bloqueadoPorAtraso,
  calcularAlertas,
  diasAte,
  ehPagante,
  mensagemCobranca,
  proximaVigencia,
  situacaoMensalidade,
  valorDoCiclo,
  vencimentoAposPagamento,
  vencimentoDaAdesao,
  testeExpirado,
  valorMensalDoCliente,
  calcularAlertasContas,
  diasParaVencer,
  pagoPorMes,
  resumoContas,
  situacaoConta,
  type ClientePlataforma,
  type ContaPagar,
  type Plano,
} from './plataformaService'

describe('vencimentoDaAdesao', () => {
  it('soma um ciclo à data de adesão', () => {
    expect(vencimentoDaAdesao('2026-11-01', 'mensal')).toBe('2026-12-01')
    expect(vencimentoDaAdesao('2026-11-01', 'anual')).toBe('2027-11-01')
  })

  it('usa o último dia quando o mês seguinte é mais curto', () => {
    expect(vencimentoDaAdesao('2027-01-31', 'mensal')).toBe('2027-02-28')
  })

  it('vira o ano no mensal de dezembro', () => {
    expect(vencimentoDaAdesao('2026-12-15', 'mensal')).toBe('2027-01-15')
  })
})

const AGORA = new Date('2026-10-01T12:00:00Z').getTime()
const emDias = (d: number) => new Date(AGORA + d * 24 * 60 * 60 * 1000).toISOString()

const plano: Plano = {
  id: 'p1',
  nome: 'Essencial',
  descricao: null,
  preco_mensal: 100,
  preco_anual: 960,
  max_estabelecimentos: 1,
  max_usuarios: 3,
  ativo: true,
  ordem: 0,
  modulos: [],
}

const cliente = (parcial: Partial<ClientePlataforma>): ClientePlataforma => ({
  id: 'c1',
  documento: '04252011000110',
  tipo_pessoa: 'PJ',
  razao_social: 'Cliente',
  nome_fantasia: null,
  slug: 'cliente',
  email: null,
  telefone: null,
  cidade: null,
  uf: null,
  status: 'ativo',
  motivo_bloqueio: null,
  origem: 'plataforma',
  trial_ate: null,
  plano_id: 'p1',
  plano_nome: 'Essencial',
  ciclo: 'mensal',
  plano_inicio: '2026-01-01',
  vigencia_ate: emDias(60),
  observacoes: null,
  criado_em: emDias(-100),
  qtd_estabelecimentos: 1,
  qtd_usuarios: 1,
  qtd_produtos: 0,
  ultimo_acesso: emDias(-1),
  ...parcial,
})

const tipos = (c: ClientePlataforma) => calcularAlertas([c], [plano], AGORA).map((a) => a.tipo)

describe('prazos', () => {
  it('teste expirado só quando o prazo passou', () => {
    expect(testeExpirado({ status: 'trial', trial_ate: emDias(-1) }, AGORA)).toBe(true)
    expect(testeExpirado({ status: 'trial', trial_ate: emDias(2) }, AGORA)).toBe(false)
    expect(testeExpirado({ status: 'ativo', trial_ate: emDias(-1) }, AGORA)).toBe(false)
  })

  it('dias até uma data', () => {
    expect(diasAte(emDias(3), AGORA)).toBe(3)
    expect(diasAte(emDias(-2), AGORA)).toBe(-2)
    expect(diasAte(null, AGORA)).toBeNull()
  })

  it('renovação soma um ciclo ao fim atual ou a hoje, se já venceu', () => {
    const agora = new Date('2026-10-01T12:00:00Z')
    expect(proximaVigencia('2026-12-10T12:00:00Z', 'mensal', agora).toISOString()).toBe('2027-01-10T12:00:00.000Z')
    expect(proximaVigencia('2026-09-01T12:00:00Z', 'mensal', agora).toISOString()).toBe('2026-11-01T12:00:00.000Z')
    expect(proximaVigencia(null, 'anual', agora).toISOString()).toBe('2027-10-01T12:00:00.000Z')
  })
})

describe('receita', () => {
  it('valor mensal equivalente: anual dividido por 12', () => {
    expect(valorMensalDoCliente({ plano_id: 'p1', ciclo: 'mensal' }, [plano])).toBe(100)
    expect(valorMensalDoCliente({ plano_id: 'p1', ciclo: 'anual' }, [plano])).toBe(80)
    expect(valorMensalDoCliente({ plano_id: null, ciclo: 'mensal' }, [plano])).toBe(0)
  })

  it('pagante = ativo com plano', () => {
    expect(ehPagante({ status: 'ativo', plano_id: 'p1' })).toBe(true)
    expect(ehPagante({ status: 'trial', plano_id: 'p1' })).toBe(false)
    expect(ehPagante({ status: 'ativo', plano_id: null })).toBe(false)
  })
})

describe('alertas', () => {
  it('cliente em dia não gera alerta', () => {
    expect(tipos(cliente({}))).toEqual([])
  })

  it('teste expirando e expirado', () => {
    expect(tipos(cliente({ status: 'trial', plano_id: null, trial_ate: emDias(2) }))).toContain('teste_expirando')
    expect(tipos(cliente({ status: 'trial', plano_id: null, trial_ate: emDias(-1) }))).toContain('teste_expirado')
  })

  it('vigência vencendo, vencida e ativo sem plano', () => {
    expect(tipos(cliente({ vigencia_ate: emDias(5) }))).toContain('vigencia_vencendo')
    expect(tipos(cliente({ vigencia_ate: emDias(-3) }))).toContain('vigencia_vencida')
    expect(tipos(cliente({ plano_id: null }))).toContain('sem_plano')
  })

  it('mensalidade vencida avisa a suspensão e, passada a tolerância, o bloqueio', () => {
    const [dentro] = calcularAlertas([cliente({ vigencia_ate: emDias(-3) })], [plano], AGORA)
    expect(dentro.mensagem).toContain('será suspenso em 2 dia(s)')
    const [fora] = calcularAlertas([cliente({ vigencia_ate: emDias(-6) })], [plano], AGORA)
    expect(fora.mensagem).toContain('acesso suspenso por atraso')
  })

  it('acima dos limites do plano', () => {
    const t = tipos(cliente({ qtd_usuarios: 5, qtd_estabelecimentos: 2 }))
    expect(t).toContain('limite_usuarios')
    expect(t).toContain('limite_estabelecimentos')
  })

  it('sem uso: nunca acessou ou sem acesso há 15+ dias', () => {
    expect(tipos(cliente({ ultimo_acesso: null }))).toContain('nunca_acessou')
    expect(tipos(cliente({ ultimo_acesso: emDias(-20) }))).toContain('sem_acesso')
  })

  it('inativo não gera alerta; bloqueado gera aviso com o motivo', () => {
    expect(tipos(cliente({ status: 'cancelado', vigencia_ate: emDias(-10) }))).toEqual([])
    const [alerta] = calcularAlertas([cliente({ status: 'suspenso', motivo_bloqueio: 'Inadimplente' })], [plano], AGORA)
    expect(alerta.tipo).toBe('bloqueado')
    expect(alerta.mensagem).toContain('Inadimplente')
  })

  it('críticos primeiro', () => {
    const lista = calcularAlertas(
      [cliente({ id: 'a', ultimo_acesso: null }), cliente({ id: 'b', vigencia_ate: emDias(-1) })],
      [plano],
      AGORA,
    )
    expect(lista[0].gravidade).toBe('critico')
  })
})

describe('mensalidades', () => {
  it('classifica a situação do vencimento', () => {
    expect(situacaoMensalidade(null, AGORA)).toBe('sem_data')
    expect(situacaoMensalidade(emDias(-2), AGORA)).toBe('vencida')
    expect(situacaoMensalidade(emDias(0), AGORA)).toBe('hoje')
    expect(situacaoMensalidade(emDias(5), AGORA)).toBe('semana')
    expect(situacaoMensalidade(emDias(20), AGORA)).toBe('mes')
    expect(situacaoMensalidade(emDias(45), AGORA)).toBe('em_dia')
  })

  it('valor do ciclo usa o preço mensal ou anual do plano', () => {
    expect(valorDoCiclo({ ciclo: 'mensal', plano_id: 'p1' }, [plano])).toBe(100)
    expect(valorDoCiclo({ ciclo: 'anual', plano_id: 'p1' }, [plano])).toBe(960)
    expect(valorDoCiclo({ ciclo: 'mensal', plano_id: null }, [plano])).toBe(0)
  })

  it('próximo vencimento mantém o dia mesmo pagando atrasado', () => {
    const atual = new Date(2026, 8, 10, 23, 59, 59).toISOString()
    const novo = vencimentoAposPagamento(atual, 'mensal', 1, new Date(2026, 9, 2))
    expect([novo.getFullYear(), novo.getMonth(), novo.getDate()]).toEqual([2026, 9, 10])
  })

  it('não pula o mês no fim do mês e soma vários períodos', () => {
    const fimJan = new Date(2027, 0, 31, 23, 59, 59).toISOString()
    const fev = vencimentoAposPagamento(fimJan, 'mensal', 1, new Date(2027, 0, 31))
    expect([fev.getMonth(), fev.getDate()]).toEqual([1, 28])
    const tres = vencimentoAposPagamento(fimJan, 'mensal', 3, new Date(2027, 0, 31))
    expect([tres.getMonth(), tres.getDate()]).toEqual([3, 30])
    const anual = vencimentoAposPagamento(fimJan, 'anual', 1, new Date(2027, 0, 31))
    expect([anual.getFullYear(), anual.getMonth(), anual.getDate()]).toEqual([2028, 0, 31])
  })

  it('sem vencimento conta a partir do pagamento (fim do dia)', () => {
    const novo = vencimentoAposPagamento(null, 'mensal', 1, new Date(2026, 9, 2))
    expect([novo.getMonth(), novo.getDate(), novo.getHours()]).toEqual([10, 2, 23])
  })

  it('mensagem de cobrança cita valor e situação', () => {
    const c = { nome_fantasia: 'Pizzaria X', razao_social: 'X Ltda', plano_nome: 'Essencial', ciclo: 'mensal' as const }
    expect(mensagemCobranca(c, 100, emDias(-3), AGORA)).toContain('venceu em')
    expect(mensagemCobranca(c, 100, emDias(0), AGORA)).toContain('vence hoje')
    expect(mensagemCobranca(c, 100, emDias(5), AGORA)).toMatch(/Pizzaria X.*mensalidade do plano Essencial.*R\$\s?100,00/)
  })

  it('bloqueio por atraso só depois da tolerância e só para ativos', () => {
    expect(bloqueadoPorAtraso({ status: 'ativo', vigencia_ate: emDias(-4) }, AGORA)).toBe(false)
    expect(bloqueadoPorAtraso({ status: 'ativo', vigencia_ate: emDias(-6) }, AGORA)).toBe(true)
    expect(bloqueadoPorAtraso({ status: 'ativo', vigencia_ate: null }, AGORA)).toBe(false)
    expect(bloqueadoPorAtraso({ status: 'trial', vigencia_ate: emDias(-30) }, AGORA)).toBe(false)
  })
})

describe('contas a pagar', () => {
  const hoje = new Date(2026, 10, 16) // 16/11/2026
  const conta = (dados: Partial<ContaPagar>): ContaPagar => ({
    id: Math.random().toString(36),
    descricao: 'Conta',
    categoria: 'infraestrutura',
    fornecedor: null,
    valor: 100,
    vencimento: '2026-11-20',
    recorrencia: 'unica',
    pago_em: null,
    valor_pago: null,
    forma: null,
    observacao: null,
    conta_anterior_id: null,
    criado_em: '2026-11-01T00:00:00Z',
    ...dados,
  })

  it('conta os dias pela data local', () => {
    expect(diasParaVencer('2026-11-16', hoje)).toBe(0)
    expect(diasParaVencer('2026-11-17', hoje)).toBe(1)
    expect(diasParaVencer('2026-11-10', hoje)).toBe(-6)
  })

  it('classifica a situação', () => {
    expect(situacaoConta(conta({ pago_em: '2026-11-01', valor_pago: 100 }), hoje)).toBe('paga')
    expect(situacaoConta(conta({ vencimento: '2026-11-15' }), hoje)).toBe('vencida')
    expect(situacaoConta(conta({ vencimento: '2026-11-16' }), hoje)).toBe('hoje')
    expect(situacaoConta(conta({ vencimento: '2026-12-01' }), hoje)).toBe('a_vencer')
  })

  it('resume o mês: pago pelo valor pago, vencidas, próximos 30 dias e custo fixo', () => {
    const contas = [
      conta({ pago_em: '2026-11-05', valor_pago: 95, valor: 100 }),
      conta({ pago_em: '2026-10-30', valor_pago: 50 }),
      conta({ vencimento: '2026-11-10', valor: 30 }),
      conta({ vencimento: '2026-11-25', valor: 40, recorrencia: 'mensal' }),
      conta({ vencimento: '2027-03-01', valor: 120, recorrencia: 'anual' }),
    ]
    const r = resumoContas(contas, '2026-11', hoje)
    expect(r.pagoNoMes).toBe(95)
    expect(r.qtdPagoNoMes).toBe(1)
    expect(r.vencidas).toEqual({ qtd: 1, valor: 30 })
    expect(r.aPagar30).toEqual({ qtd: 1, valor: 40 })
    expect(r.custoFixoMensal).toBe(50) // 40 mensal + 120/12
  })

  it('alertas: vencida crítico, hoje/até 3 dias atenção, até 7 dias info; ignora pagas e distantes', () => {
    const contas = [
      conta({ descricao: 'Longe', vencimento: '2026-12-10' }),
      conta({ descricao: 'Semana', vencimento: '2026-11-21' }),
      conta({ descricao: 'Hoje', vencimento: '2026-11-16' }),
      conta({ descricao: 'Vencida', vencimento: '2026-11-14' }),
      conta({ descricao: 'Logo', vencimento: '2026-11-19' }),
      conta({ descricao: 'Paga', vencimento: '2026-11-10', pago_em: '2026-11-10', valor_pago: 100 }),
    ]
    const r = calcularAlertasContas(contas, hoje)
    expect(r.map((a) => [a.conta.descricao, a.gravidade, a.dias])).toEqual([
      ['Vencida', 'critico', -2],
      ['Hoje', 'atencao', 0],
      ['Logo', 'atencao', 3],
      ['Semana', 'info', 5],
    ])
    expect(r[0].mensagem).toContain('venceu há 2 dia(s)')
  })

  it('soma o pago por mês', () => {
    const contas = [
      conta({ pago_em: '2026-10-02', valor_pago: 10 }),
      conta({ pago_em: '2026-11-03', valor_pago: 20 }),
      conta({ pago_em: '2026-11-04', valor_pago: 5 }),
    ]
    expect(pagoPorMes(contas, ['2026-09', '2026-10', '2026-11'])).toEqual([0, 10, 25])
  })
})
