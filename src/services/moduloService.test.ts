import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))

import { aplicarModulos } from './moduloService'
import type { Permissoes } from '@/hooks/usePermissoes'

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
  podeAcessarConfiguracoes: true,
  podeAcessarMetricas: true,
  podeAcessarAnalytics: true,
}

const TODOS_MODULOS = ['pdv', 'comandas', 'pedidos_online', 'estoque', 'metricas']

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

  it('sem nenhum módulo sobra só a base (dashboard, produtos, configurações...)', () => {
    const r = aplicarModulos(TUDO, [])
    expect(r.podeAcessarDashboard).toBe(true)
    expect(r.podeAcessarProdutos).toBe(true)
    expect(r.podeAcessarCategorias).toBe(true)
    expect(r.podeAcessarConfiguracoes).toBe(true)
    expect(r.podeAcessarFuncionarios).toBe(true)
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
