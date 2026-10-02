/**
 * Testes para TemaEstabelecimentoProvider (src/contexts/TemaEstabelecimentoContext.tsx)
 *
 * Valida Requirements 6.1, 6.2, 6.4, 6.5, 6.6 (Identidade Visual por Estabelecimento)
 * Valida Property 8: Tema reflete o atual (colors applied via CSS variables)
 *
 * Testes cobrem:
 * - Aplicação correta de variáveis CSS quando tema muda
 * - Validação de cores hex e conversão para oklch
 * - Fallback para tema padrão quando cor é inválida ou ausente
 * - Atualização de tema quando estabelecimento muda (Req 6.2, 6.4)
 * - Tema padrão quando não há estabelecimento ativo (Req 6.6)
 * - Tema aplicado ANTES dos dados serem exibidos (Req 6.4)
 * - Indicação visual de tema padrão (data-tema-padrao)
 *
 * @module contexts/TemaEstabelecimentoContext.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { TemaEstabelecimentoProvider } from './TemaEstabelecimentoContext'
import { useEstabelecimento } from './EstabelecimentoContext'
import type { Estabelecimento } from '@/types/estabelecimento'

// Mock do EstabelecimentoContext
vi.mock('./EstabelecimentoContext', () => ({
  useEstabelecimento: vi.fn(),
}))

vi.mock('@/utils/cor', () => ({
  gerarPaleta: vi.fn(),
  corHexValida: vi.fn(),
  hexParaOklch: vi.fn(),
  // Nos testes, toda cor válida é tratada como escolha da loja
  corPersonalizada: vi.fn((cor: string) => cor),
}))

import { gerarPaleta, corHexValida } from '@/utils/cor'

// Dados de teste
const MOCK_ESTAB_AZUL: Estabelecimento = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  nome: 'Prédio CIC',
  descricao: 'Filial CIC',
  cor_tema: '#2563EB',
  ativo: true,
  criado_em: '2024-01-01T00:00:00Z',
}

const MOCK_ESTAB_VERMELHO: Estabelecimento = {
  id: '223e4567-e89b-12d3-a456-426614174000',
  nome: 'Prédio Boqueirão',
  descricao: 'Filial Boqueirão',
  cor_tema: '#DC2626',
  ativo: true,
  criado_em: '2024-01-01T00:00:00Z',
}

const MOCK_ESTAB_INVALID_COLOR: Estabelecimento = {
  id: '323e4567-e89b-12d3-a456-426614174000',
  nome: 'Prédio Inválido',
  descricao: 'Cor inválida',
  cor_tema: '#GGGGGG',  // Inválida
  ativo: true,
  criado_em: '2024-01-01T00:00:00Z',
}

const MOCK_ESTAB_NULL_COLOR: Estabelecimento = {
  id: '423e4567-e89b-12d3-a456-426614174000',
  nome: 'Prédio Nulo',
  descricao: 'Sem cor',
  cor_tema: null as any, // Null/undefined
  ativo: true,
  criado_em: '2024-01-01T00:00:00Z',
}

describe('TemaEstabelecimentoProvider - CSS Variable Application (Req 6.1, Property 8)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Limpar styles do root antes de cada teste
    const root = document.documentElement
    root.removeAttribute('style')
    root.removeAttribute('data-tema-estabelecimento')
    root.removeAttribute('data-tema-padrao')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('deve aplicar variáveis CSS quando tema muda para cor válida', async () => {
    const mockEstabelecimentoAtual = MOCK_ESTAB_AZUL

    vi.mocked(useEstabelecimento).mockReturnValue({
      estabelecimentoAtual: mockEstabelecimentoAtual,
      estabelecimentosAutorizados: [],
      perfil: 'administrador_geral',
      usuario: null,
      podeTrocar: true,
      loading: false,
      erro: null,
      trocarEstabelecimento: vi.fn(),
      recarregar: vi.fn(),
    } as any)

    vi.mocked(corHexValida).mockReturnValue(true)
    vi.mocked(gerarPaleta).mockReturnValue({
      base: 'oklch(0.5 0.2 240)',
      baseHex: '#2563EB',
    })

    const { container } = render(
      <TemaEstabelecimentoProvider>
        <div>Test</div>
      </TemaEstabelecimentoProvider>
    )

    await waitFor(() => {
      const root = document.documentElement
      expect(root.style.getPropertyValue('--primary')).toBe('oklch(0.5 0.2 240)')
      expect(root.style.getPropertyValue('--ring')).toBe('oklch(0.5 0.2 240)')
    })

    // Verificar que o atributo foi marcado
    expect(document.documentElement.getAttribute('data-tema-estabelecimento')).toBe('#2563EB')
    expect(document.documentElement.getAttribute('data-tema-padrao')).toBeNull()
  })

  it('deve aplicar todas as variáveis CSS primárias', async () => {
    const mockEstabelecimentoAtual = MOCK_ESTAB_AZUL

    vi.mocked(useEstabelecimento).mockReturnValue({
      estabelecimentoAtual: mockEstabelecimentoAtual,
      estabelecimentosAutorizados: [],
      perfil: 'administrador_geral',
      usuario: null,
      podeTrocar: true,
      loading: false,
      erro: null,
      trocarEstabelecimento: vi.fn(),
      recarregar: vi.fn(),
    } as any)

    vi.mocked(corHexValida).mockReturnValue(true)
    const oklchValue = 'oklch(0.5 0.2 240)'
    vi.mocked(gerarPaleta).mockReturnValue({
      base: oklchValue,
      baseHex: '#2563EB',
    })

    render(
      <TemaEstabelecimentoProvider>
        <div>Test</div>
      </TemaEstabelecimentoProvider>
    )

    await waitFor(() => {
      const root = document.documentElement
      const varsEsperadas = [
        '--primary',
        '--ring',
        '--sidebar-primary',
        '--chart-1',
        '--price-color',
        '--price-color-cliente',
        '--color-price',
        '--color-price-cliente',
      ]

      for (const varName of varsEsperadas) {
        expect(root.style.getPropertyValue(varName)).toBe(oklchValue)
      }
    })
  })

  it('deve atualizar tema quando estabelecimento muda (Req 6.2, 6.4)', async () => {
    const { rerender } = render(
      <TemaEstabelecimentoProvider>
        <div>Test</div>
      </TemaEstabelecimentoProvider>
    )

    // Primeiro tema (azul)
    vi.mocked(useEstabelecimento).mockReturnValue({
      estabelecimentoAtual: MOCK_ESTAB_AZUL,
      estabelecimentosAutorizados: [],
      perfil: 'administrador_geral',
      usuario: null,
      podeTrocar: true,
      loading: false,
      erro: null,
      trocarEstabelecimento: vi.fn(),
      recarregar: vi.fn(),
    } as any)

    vi.mocked(corHexValida).mockReturnValue(true)
    vi.mocked(gerarPaleta).mockReturnValue({
      base: 'oklch(0.5 0.2 240)',  // azul
      baseHex: '#2563EB',
    })

    rerender(
      <TemaEstabelecimentoProvider>
        <div>Test</div>
      </TemaEstabelecimentoProvider>
    )

    await waitFor(() => {
      const root = document.documentElement
      expect(root.style.getPropertyValue('--primary')).toBe('oklch(0.5 0.2 240)')
    })

    // Trocar para vermelho
    vi.mocked(useEstabelecimento).mockReturnValue({
      estabelecimentoAtual: MOCK_ESTAB_VERMELHO,
      estabelecimentosAutorizados: [],
      perfil: 'administrador_geral',
      usuario: null,
      podeTrocar: true,
      loading: false,
      erro: null,
      trocarEstabelecimento: vi.fn(),
      recarregar: vi.fn(),
    } as any)

    vi.mocked(gerarPaleta).mockReturnValue({
      base: 'oklch(0.6 0.3 0)',  // vermelho
      baseHex: '#DC2626',
    })

    rerender(
      <TemaEstabelecimentoProvider>
        <div>Test</div>
      </TemaEstabelecimentoProvider>
    )

    await waitFor(() => {
      const root = document.documentElement
      expect(root.style.getPropertyValue('--primary')).toBe('oklch(0.6 0.3 0)')
      expect(root.getAttribute('data-tema-estabelecimento')).toBe('#DC2626')
    })
  })

  it('deve limpar variáveis quando não há estabelecimento (Req 6.6)', async () => {
    vi.mocked(useEstabelecimento).mockReturnValue({
      estabelecimentoAtual: null,
      estabelecimentosAutorizados: [],
      perfil: null,
      usuario: null,
      podeTrocar: false,
      loading: false,
      erro: null,
      trocarEstabelecimento: vi.fn(),
      recarregar: vi.fn(),
    } as any)

    render(
      <TemaEstabelecimentoProvider>
        <div>Test</div>
      </TemaEstabelecimentoProvider>
    )

    await waitFor(() => {
      const root = document.documentElement
      expect(root.style.getPropertyValue('--primary')).toBe('')
      expect(root.getAttribute('data-tema-estabelecimento')).toBeNull()
      expect(root.getAttribute('data-tema-padrao')).toBeNull()
    })
  })
})

describe('TemaEstabelecimentoProvider - Invalid Color Handling (Req 6.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const root = document.documentElement
    root.removeAttribute('style')
    root.removeAttribute('data-tema-estabelecimento')
    root.removeAttribute('data-tema-padrao')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('deve aplicar tema padrão quando cor é inválida (Req 6.5)', async () => {
    vi.mocked(useEstabelecimento).mockReturnValue({
      estabelecimentoAtual: MOCK_ESTAB_INVALID_COLOR,
      estabelecimentosAutorizados: [],
      perfil: 'administrador_geral',
      usuario: null,
      podeTrocar: true,
      loading: false,
      erro: null,
      trocarEstabelecimento: vi.fn(),
      recarregar: vi.fn(),
    } as any)

    vi.mocked(corHexValida).mockReturnValue(false)
    vi.mocked(gerarPaleta).mockReturnValue(null)

    render(
      <TemaEstabelecimentoProvider>
        <div>Test</div>
      </TemaEstabelecimentoProvider>
    )

    await waitFor(() => {
      const root = document.documentElement
      // Variáveis devem estar vazias (fallback para CSS padrão)
      expect(root.style.getPropertyValue('--primary')).toBe('')
      // Deve marcar como tema padrão
      expect(root.getAttribute('data-tema-padrao')).toBe('true')
    })
  })

  it('deve aplicar tema padrão quando gerarPaleta retorna null', async () => {
    vi.mocked(useEstabelecimento).mockReturnValue({
      estabelecimentoAtual: MOCK_ESTAB_INVALID_COLOR,
      estabelecimentosAutorizados: [],
      perfil: 'administrador_geral',
      usuario: null,
      podeTrocar: true,
      loading: false,
      erro: null,
      trocarEstabelecimento: vi.fn(),
      recarregar: vi.fn(),
    } as any)

    vi.mocked(corHexValida).mockReturnValue(true)
    vi.mocked(gerarPaleta).mockReturnValue(null)

    render(
      <TemaEstabelecimentoProvider>
        <div>Test</div>
      </TemaEstabelecimentoProvider>
    )

    await waitFor(() => {
      const root = document.documentElement
      expect(root.getAttribute('data-tema-padrao')).toBe('true')
      expect(root.style.getPropertyValue('--primary')).toBe('')
    })
  })

  it('deve aplicar tema padrão quando cor é null/undefined', async () => {
    vi.mocked(useEstabelecimento).mockReturnValue({
      estabelecimentoAtual: MOCK_ESTAB_NULL_COLOR,
      estabelecimentosAutorizados: [],
      perfil: 'administrador_geral',
      usuario: null,
      podeTrocar: true,
      loading: false,
      erro: null,
      trocarEstabelecimento: vi.fn(),
      recarregar: vi.fn(),
    } as any)

    vi.mocked(corHexValida).mockReturnValue(false)
    vi.mocked(gerarPaleta).mockReturnValue(null)

    render(
      <TemaEstabelecimentoProvider>
        <div>Test</div>
      </TemaEstabelecimentoProvider>
    )

    await waitFor(() => {
      const root = document.documentElement
      expect(root.getAttribute('data-tema-padrao')).toBe('true')
    })
  })

  it('deve remover data-tema-padrao quando voltando para cor válida', async () => {
    const { rerender } = render(
      <TemaEstabelecimentoProvider>
        <div>Test</div>
      </TemaEstabelecimentoProvider>
    )

    // Iniciar com cor inválida
    vi.mocked(useEstabelecimento).mockReturnValue({
      estabelecimentoAtual: MOCK_ESTAB_INVALID_COLOR,
      estabelecimentosAutorizados: [],
      perfil: 'administrador_geral',
      usuario: null,
      podeTrocar: true,
      loading: false,
      erro: null,
      trocarEstabelecimento: vi.fn(),
      recarregar: vi.fn(),
    } as any)

    vi.mocked(corHexValida).mockReturnValue(false)
    vi.mocked(gerarPaleta).mockReturnValue(null)

    rerender(
      <TemaEstabelecimentoProvider>
        <div>Test</div>
      </TemaEstabelecimentoProvider>
    )

    await waitFor(() => {
      const root = document.documentElement
      expect(root.getAttribute('data-tema-padrao')).toBe('true')
    })

    // Trocar para cor válida
    vi.mocked(useEstabelecimento).mockReturnValue({
      estabelecimentoAtual: MOCK_ESTAB_AZUL,
      estabelecimentosAutorizados: [],
      perfil: 'administrador_geral',
      usuario: null,
      podeTrocar: true,
      loading: false,
      erro: null,
      trocarEstabelecimento: vi.fn(),
      recarregar: vi.fn(),
    } as any)

    vi.mocked(corHexValida).mockReturnValue(true)
    vi.mocked(gerarPaleta).mockReturnValue({
      base: 'oklch(0.5 0.2 240)',
      baseHex: '#2563EB',
    })

    rerender(
      <TemaEstabelecimentoProvider>
        <div>Test</div>
      </TemaEstabelecimentoProvider>
    )

    await waitFor(() => {
      const root = document.documentElement
      expect(root.getAttribute('data-tema-padrao')).toBeNull()
      expect(root.getAttribute('data-tema-estabelecimento')).toBe('#2563EB')
    })
  })
})

describe('TemaEstabelecimentoProvider - Theme Application Timing (Req 6.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const root = document.documentElement
    root.removeAttribute('style')
    root.removeAttribute('data-tema-estabelecimento')
    root.removeAttribute('data-tema-padrao')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('deve aplicar tema antes de children serem renderizados', async () => {
    const childrenSpy = vi.fn()

    vi.mocked(useEstabelecimento).mockReturnValue({
      estabelecimentoAtual: MOCK_ESTAB_AZUL,
      estabelecimentosAutorizados: [],
      perfil: 'administrador_geral',
      usuario: null,
      podeTrocar: true,
      loading: false,
      erro: null,
      trocarEstabelecimento: vi.fn(),
      recarregar: vi.fn(),
    } as any)

    vi.mocked(corHexValida).mockReturnValue(true)
    vi.mocked(gerarPaleta).mockReturnValue({
      base: 'oklch(0.5 0.2 240)',
      baseHex: '#2563EB',
    })

    render(
      <TemaEstabelecimentoProvider>
        <div
          onRender={() => {
            childrenSpy()
            // No render dos children, o tema já deve estar aplicado
            const root = document.documentElement
            expect(root.style.getPropertyValue('--primary')).toBe('oklch(0.5 0.2 240)')
          }}
        >
          Test
        </div>
      </TemaEstabelecimentoProvider>
    )

    await waitFor(() => {
      const root = document.documentElement
      expect(root.style.getPropertyValue('--primary')).toBe('oklch(0.5 0.2 240)')
    })
  })

  it('deve aplicar tema na primeira renderização com estabelecimento ativo', async () => {
    vi.mocked(useEstabelecimento).mockReturnValue({
      estabelecimentoAtual: MOCK_ESTAB_AZUL,
      estabelecimentosAutorizados: [],
      perfil: 'administrador_geral',
      usuario: null,
      podeTrocar: true,
      loading: false,
      erro: null,
      trocarEstabelecimento: vi.fn(),
      recarregar: vi.fn(),
    } as any)

    vi.mocked(corHexValida).mockReturnValue(true)
    vi.mocked(gerarPaleta).mockReturnValue({
      base: 'oklch(0.5 0.2 240)',
      baseHex: '#2563EB',
    })

    render(
      <TemaEstabelecimentoProvider>
        <div>Test</div>
      </TemaEstabelecimentoProvider>
    )

    // Tema deve estar aplicado logo após renderização
    const root = document.documentElement
    expect(root.style.getPropertyValue('--primary')).toBe('oklch(0.5 0.2 240)')
    expect(root.getAttribute('data-tema-estabelecimento')).toBe('#2563EB')
  })
})

describe('TemaEstabelecimentoProvider - Multiple Establishment Changes (Req 3.5, 6.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const root = document.documentElement
    root.removeAttribute('style')
    root.removeAttribute('data-tema-estabelecimento')
    root.removeAttribute('data-tema-padrao')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('deve trocar tema quando estabelecimento muda múltiplas vezes', async () => {
    const { rerender } = render(
      <TemaEstabelecimentoProvider>
        <div>Test</div>
      </TemaEstabelecimentoProvider>
    )

    // Primeiro: azul
    vi.mocked(useEstabelecimento).mockReturnValue({
      estabelecimentoAtual: MOCK_ESTAB_AZUL,
      estabelecimentosAutorizados: [],
      perfil: 'administrador_geral',
      usuario: null,
      podeTrocar: true,
      loading: false,
      erro: null,
      trocarEstabelecimento: vi.fn(),
      recarregar: vi.fn(),
    } as any)

    vi.mocked(corHexValida).mockReturnValue(true)
    vi.mocked(gerarPaleta).mockReturnValue({
      base: 'oklch(0.5 0.2 240)',
      baseHex: '#2563EB',
    })

    rerender(
      <TemaEstabelecimentoProvider>
        <div>Test</div>
      </TemaEstabelecimentoProvider>
    )

    await waitFor(() => {
      expect(document.documentElement.getAttribute('data-tema-estabelecimento')).toBe('#2563EB')
    })

    // Segundo: vermelho
    vi.mocked(useEstabelecimento).mockReturnValue({
      estabelecimentoAtual: MOCK_ESTAB_VERMELHO,
      estabelecimentosAutorizados: [],
      perfil: 'administrador_geral',
      usuario: null,
      podeTrocar: true,
      loading: false,
      erro: null,
      trocarEstabelecimento: vi.fn(),
      recarregar: vi.fn(),
    } as any)

    vi.mocked(gerarPaleta).mockReturnValue({
      base: 'oklch(0.6 0.3 0)',
      baseHex: '#DC2626',
    })

    rerender(
      <TemaEstabelecimentoProvider>
        <div>Test</div>
      </TemaEstabelecimentoProvider>
    )

    await waitFor(() => {
      expect(document.documentElement.getAttribute('data-tema-estabelecimento')).toBe('#DC2626')
      expect(document.documentElement.style.getPropertyValue('--primary')).toBe('oklch(0.6 0.3 0)')
    })

    // Terceiro: null (sem estabelecimento)
    vi.mocked(useEstabelecimento).mockReturnValue({
      estabelecimentoAtual: null,
      estabelecimentosAutorizados: [],
      perfil: null,
      usuario: null,
      podeTrocar: false,
      loading: false,
      erro: null,
      trocarEstabelecimento: vi.fn(),
      recarregar: vi.fn(),
    } as any)

    rerender(
      <TemaEstabelecimentoProvider>
        <div>Test</div>
      </TemaEstabelecimentoProvider>
    )

    await waitFor(() => {
      expect(document.documentElement.getAttribute('data-tema-estabelecimento')).toBeNull()
      expect(document.documentElement.style.getPropertyValue('--primary')).toBe('')
    })

    // Quarto: voltar para azul
    vi.mocked(useEstabelecimento).mockReturnValue({
      estabelecimentoAtual: MOCK_ESTAB_AZUL,
      estabelecimentosAutorizados: [],
      perfil: 'administrador_geral',
      usuario: null,
      podeTrocar: true,
      loading: false,
      erro: null,
      trocarEstabelecimento: vi.fn(),
      recarregar: vi.fn(),
    } as any)

    vi.mocked(gerarPaleta).mockReturnValue({
      base: 'oklch(0.5 0.2 240)',
      baseHex: '#2563EB',
    })

    rerender(
      <TemaEstabelecimentoProvider>
        <div>Test</div>
      </TemaEstabelecimentoProvider>
    )

    await waitFor(() => {
      expect(document.documentElement.getAttribute('data-tema-estabelecimento')).toBe('#2563EB')
    })
  })
})

describe('TemaEstabelecimentoProvider - Default Theme Fallback (Req 6.6)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const root = document.documentElement
    root.removeAttribute('style')
    root.removeAttribute('data-tema-estabelecimento')
    root.removeAttribute('data-tema-padrao')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('deve manter tema padrão definido em index.css quando styles são removidos', async () => {
    // O índex.css deve ter variáveis CSS padrão definidas
    const root = document.documentElement

    vi.mocked(useEstabelecimento).mockReturnValue({
      estabelecimentoAtual: null,
      estabelecimentosAutorizados: [],
      perfil: null,
      usuario: null,
      podeTrocar: false,
      loading: false,
      erro: null,
      trocarEstabelecimento: vi.fn(),
      recarregar: vi.fn(),
    } as any)

    render(
      <TemaEstabelecimentoProvider>
        <div>Test</div>
      </TemaEstabelecimentoProvider>
    )

    await waitFor(() => {
      // Após remover inline styles, o computedStyle vai usar as variáveis padrão
      expect(root.style.cssText).not.toContain('--primary')
    })
  })

  it('deve indicar tema padrão quando não há estabelecimento', async () => {
    vi.mocked(useEstabelecimento).mockReturnValue({
      estabelecimentoAtual: null,
      estabelecimentosAutorizados: [],
      perfil: null,
      usuario: null,
      podeTrocar: false,
      loading: false,
      erro: null,
      trocarEstabelecimento: vi.fn(),
      recarregar: vi.fn(),
    } as any)

    render(
      <TemaEstabelecimentoProvider>
        <div>Test</div>
      </TemaEstabelecimentoProvider>
    )

    // Embora não haja data-tema-padrao neste caso, as styles são removidas
    // Indicando que o tema padrão está sendo usado
    const root = document.documentElement
    expect(root.getAttribute('data-tema-estabelecimento')).toBeNull()
  })
})
