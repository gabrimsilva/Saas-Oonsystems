import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))

import { aplicarModulos, codigoDoServico, liberaFuncao, mesmoNomeDeServico } from './moduloService'
import type { Permissoes } from '@/hooks/usePermissoes'

describe('codigoDoServico', () => {
  it('gera o código a partir do nome, sem acentos nem símbolos', () => {
    expect(codigoDoServico('  Emissão de NF-e ', [])).toBe('emissao_de_nf_e')
  })

  it('não repete um código existente', () => {
    expect(codigoDoServico('Estoque', ['estoque'])).toBe('estoque_2')
    expect(codigoDoServico('Estoque', ['estoque', 'estoque_2'])).toBe('estoque_3')
  })

  it('usa um código padrão quando o nome só tem símbolos', () => {
    expect(codigoDoServico('***', [])).toBe('servico')
  })

  it('respeita o tamanho máximo, mesmo com sufixo', () => {
    const base = 'a'.repeat(50)
    expect(codigoDoServico(base, [])).toHaveLength(40)
    const comSufixo = codigoDoServico(base, ['a'.repeat(40)])
    expect(comSufixo).toHaveLength(40)
    expect(comSufixo.endsWith('_2')).toBe(true)
  })
})

describe('mesmoNomeDeServico', () => {
  it('ignora maiúsculas, acentos e espaços nas pontas', () => {
    expect(mesmoNomeDeServico(' Métricas ', 'metricas')).toBe(true)
    expect(mesmoNomeDeServico('Estoque', 'Produtos')).toBe(false)
  })
})

describe('liberaFuncao', () => {
  it('reconhece os serviços ligados a telas', () => {
    expect(liberaFuncao({ codigo: 'pdv', sistema: true })).toBe(true)
    expect(liberaFuncao({ codigo: 'funcionarios', sistema: false })).toBe(true)
    expect(liberaFuncao({ codigo: 'produto', sistema: false })).toBe(true)
    expect(liberaFuncao({ codigo: 'servico_novo', sistema: false })).toBe(false)
    expect(liberaFuncao({ codigo: 'constructor', sistema: false })).toBe(false)
  })
})

const TUDO: Permissoes = {
  funcao: null,
  podeAcessarDashboard: true,
  podeAcessarPedidos: true,
  podeAcessarHistorico: true,
  podeAcessarAguardandoPagamento: true,
  podeAcessarPDV: true,
  podeAcessarComandas: true,
  podeAcessarHistoricoComandas: true,
  podeAcessarProdutos: true,
  podeAcessarCategorias: true,
  podeAcessarSabores: true,
  podeAcessarAdicionais: true,
  podeAcessarEstoque: true,
  podeAcessarFuncionarios: true,
  podeAcessarUsuarios: true,
  podeAcessarEstabelecimentos: true,
  podeAcessarConfiguracoes: true,
  podeAcessarMetricas: true,
}

const TODOS_MODULOS = [
  'pdv',
  'comandas',
  'pedidos_online',
  'estoque',
  'metricas',
  'produto',
  'usuarios',
  'funcionarios',
  'estabelecimentos',
]

/** Permissões esperadas com todos os módulos: tudo, menos os recursos desativados */
const TUDO_MENOS_DESATIVADOS: Permissoes = { ...TUDO, podeAcessarSabores: false, podeAcessarAdicionais: false }

describe('aplicarModulos', () => {
  it('com todos os módulos ligados mantém as permissões (menos recursos desativados)', () => {
    expect(aplicarModulos(TUDO, TODOS_MODULOS)).toEqual(TUDO_MENOS_DESATIVADOS)
  })

  it('módulos desconhecidos (null) não restringem módulos', () => {
    expect(aplicarModulos(TUDO, null)).toEqual(TUDO_MENOS_DESATIVADOS)
  })

  it('sabores, bordas e adicionais ficam sempre desligados', () => {
    const r = aplicarModulos(TUDO, [...TODOS_MODULOS, 'sabores_adicionais'])
    expect(r.podeAcessarSabores).toBe(false)
    expect(r.podeAcessarAdicionais).toBe(false)
  })

  it('desligar Comandas corta comandas e histórico de comandas', () => {
    const r = aplicarModulos(TUDO, TODOS_MODULOS.filter((m) => m !== 'comandas'))
    expect(r.podeAcessarComandas).toBe(false)
    expect(r.podeAcessarHistoricoComandas).toBe(false)
    expect(r.podeAcessarPDV).toBe(true)
  })

  it('desligar Pedidos online corta pedidos, histórico e aguardando pagamento', () => {
    const r = aplicarModulos(TUDO, TODOS_MODULOS.filter((m) => m !== 'pedidos_online'))
    expect(r.podeAcessarPedidos).toBe(false)
    expect(r.podeAcessarHistorico).toBe(false)
    expect(r.podeAcessarAguardandoPagamento).toBe(false)
  })

  it('cada serviço cadastrado controla a sua tela', () => {
    const semServico = (modulo: string) => aplicarModulos(TUDO, TODOS_MODULOS.filter((m) => m !== modulo))
    expect(semServico('funcionarios').podeAcessarFuncionarios).toBe(false)
    expect(semServico('usuarios').podeAcessarUsuarios).toBe(false)
    expect(semServico('estabelecimentos').podeAcessarEstabelecimentos).toBe(false)
    expect(semServico('produto').podeAcessarProdutos).toBe(false)
    expect(semServico('produto').podeAcessarCategorias).toBe(false)
    expect(semServico('produto').podeAcessarFuncionarios).toBe(true)
  })

  it('o serviço no plano não libera tela que o perfil não permite', () => {
    const adminEstabelecimento = { ...TUDO, podeAcessarEstabelecimentos: false }
    expect(aplicarModulos(adminEstabelecimento, TODOS_MODULOS).podeAcessarEstabelecimentos).toBe(false)
  })

  it('sem nenhum módulo sobra só a base (dashboard, configurações...)', () => {
    const r = aplicarModulos(TUDO, [])
    expect(r.podeAcessarDashboard).toBe(true)
    expect(r.podeAcessarConfiguracoes).toBe(true)
    expect(r.podeAcessarProdutos).toBe(false)
    expect(r.podeAcessarCategorias).toBe(false)
    expect(r.podeAcessarUsuarios).toBe(false)
    expect(r.podeAcessarEstabelecimentos).toBe(false)
    expect(r.podeAcessarFuncionarios).toBe(false)
    expect(r.podeAcessarPDV).toBe(false)
    expect(r.podeAcessarEstoque).toBe(false)
    expect(r.podeAcessarSabores).toBe(false)
    expect(r.podeAcessarMetricas).toBe(false)
  })

  it('não libera o que o perfil já não permitia (garçom continua sem PDV)', () => {
    const garcom = { ...TUDO, podeAcessarPDV: false }
    expect(aplicarModulos(garcom, TODOS_MODULOS).podeAcessarPDV).toBe(false)
  })

  it('não altera o objeto original', () => {
    const copia = { ...TUDO }
    aplicarModulos(copia, [])
    expect(copia).toEqual(TUDO)
  })
})
