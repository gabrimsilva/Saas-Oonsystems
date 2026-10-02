import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))

import {
  calcularAlertas,
  diasAte,
  ehPagante,
  proximaVigencia,
  testeExpirado,
  valorMensalDoCliente,
  type ClientePlataforma,
  type Plano,
} from './plataformaService'

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
