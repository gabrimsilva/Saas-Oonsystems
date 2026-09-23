/**
 * Testes para EstabelecimentoProvider (src/contexts/EstabelecimentoContext.tsx)
 *
 * Valida Requirements 3.3, 4.3, 4.4, 4.5, 4.6 (Seleção, Troca, Persistência)
 * Valida Properties:
 * - Property 5: Coerência de perfil (admin_geral vs admin_estabelecimento vs operador)
 * - Property 6: Troca restrita (somente admin_geral pode trocar)
 * - Property 7: Consistência de contexto (estabelecimento_id sincronizado)
 * - Property 8: Tema reflete o atual
 *
 * @module contexts/EstabelecimentoContext.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { EstabelecimentoProvider, useEstabelecimento } from './EstabelecimentoContext'
import * as tenantService from '@/services/tenant'
import type { Estabelecimento, UsuarioEstabelecimento } from '@/types/estabelecimento'

// Mocks de serviços
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn(),
  },
}))

vi.mock('@/services', () => ({
  estabelecimentoService: {
    buscarAtivos: vi.fn(),
  },
  usuarioService: {
    buscarPorUserId: vi.fn(),
  },
  auditoriaService: {
    registrar: vi.fn(),
  },
  setEstabelecimentoAtivo: vi.fn(),
}))

import { supabase } from '@/lib/supabase'
import {
  estabelecimentoService,
  usuarioService,
  auditoriaService,
  setEstabelecimentoAtivo,
} from '@/services'

// Dados de teste
const MOCK_ESTAB_1: Estabelecimento = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  nome: 'Prédio CIC',
  descricao: 'Filial CIC',
  cor_tema: '#2563EB',
  ativo: true,
  criado_em: '2024-01-01T00:00:00Z',
}

const MOCK_ESTAB_2: Estabelecimento = {
  id: '223e4567-e89b-12d3-a456-426614174000',
  nome: 'Prédio Boqueirão',
  descricao: 'Filial Boqueirão',
  cor_tema: '#DC2626',
  ativo: true,
  criado_em: '2024-01-01T00:00:00Z',
}

const MOCK_ESTAB_INACTIVE: Estabelecimento = {
  id: '323e4567-e89b-12d3-a456-426614174000',
  nome: 'Prédio Inativo',
  descricao: 'Filial inativa',
  cor_tema: '#6B7280',
  ativo: false,
  criado_em: '2024-01-01T00:00:00Z',
}

const MOCK_ADMIN_GERAL: UsuarioEstabelecimento = {
  id: 'usuario-1',
  user_id: 'auth-user-1',
  nome: 'Admin Geral',
  email: 'admin@test.com',
  perfil: 'administrador_geral',
  estabelecimento_id: null,
  ativo: true,
  ultimo_estabelecimento_id: null,
  criado_em: '2024-01-01T00:00:00Z',
}

const MOCK_ADMIN_ESTAB: UsuarioEstabelecimento = {
  id: 'usuario-2',
  user_id: 'auth-user-2',
  nome: 'Admin Estabelecimento',
  email: 'admin-estab@test.com',
  perfil: 'administrador_estabelecimento',
  estabelecimento_id: MOCK_ESTAB_1.id,
  ativo: true,
  ultimo_estabelecimento_id: null,
  criado_em: '2024-01-01T00:00:00Z',
}

const MOCK_OPERADOR: UsuarioEstabelecimento = {
  id: 'usuario-3',
  user_id: 'auth-user-3',
  nome: 'Operador',
  email: 'operador@test.com',
  perfil: 'operador',
  estabelecimento_id: MOCK_ESTAB_1.id,
  ativo: true,
  ultimo_estabelecimento_id: null,
  criado_em: '2024-01-01T00:00:00Z',
}

const renderWithProvider = (component: ReactNode) => {
  return render(
    <EstabelecimentoProvider>
      {component}
    </EstabelecimentoProvider>
  )
}

const renderHookWithProvider = (hook: () => any) => {
  return renderHook(hook, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <EstabelecimentoProvider>{children}</EstabelecimentoProvider>
    ),
  })
}

describe('EstabelecimentoProvider - Initial Load by Profile (Req 3.3, 4.3, 4.4, 4.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    try { localStorage.clear() } catch { /* ignore */ }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Admin Geral profile', () => {
    it('deve carregar todos os estabelecimentos ativos para admin_geral', async () => {
      const mockUser = { id: MOCK_ADMIN_GERAL.user_id }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      })
      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } as any },
      } as any)
      vi.mocked(usuarioService.buscarPorUserId).mockResolvedValue(MOCK_ADMIN_GERAL)
      vi.mocked(estabelecimentoService.buscarAtivos).mockResolvedValue([
        MOCK_ESTAB_1,
        MOCK_ESTAB_2,
      ])

      const { result } = renderHookWithProvider(useEstabelecimento)

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.estabelecimentosAutorizados).toHaveLength(2)
      expect(result.current.perfil).toBe('administrador_geral')
      expect(result.current.podeTrocar).toBe(true)
    })

    it('deve selecionar primeiro estabelecimento quando nenhum último foi salvo (Req 4.4)', async () => {
      const mockUser = { id: MOCK_ADMIN_GERAL.user_id }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      })
      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } as any },
      } as any)
      vi.mocked(usuarioService.buscarPorUserId).mockResolvedValue(MOCK_ADMIN_GERAL)
      vi.mocked(estabelecimentoService.buscarAtivos).mockResolvedValue([
        MOCK_ESTAB_1,
        MOCK_ESTAB_2,
      ])

      const { result } = renderHookWithProvider(useEstabelecimento)

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.estabelecimentoAtual?.id).toBe(MOCK_ESTAB_1.id)
      expect(setEstabelecimentoAtivo).toHaveBeenCalledWith(MOCK_ESTAB_1.id)
    })

    it('deve restaurar último estabelecimento usado quando ativo (Req 4.3)', async () => {
      const mockUser = { id: MOCK_ADMIN_GERAL.user_id }
      const usuarioComUltimo: UsuarioEstabelecimento = {
        ...MOCK_ADMIN_GERAL,
        ultimo_estabelecimento_id: MOCK_ESTAB_2.id,
      }

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      })
      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } as any },
      } as any)
      vi.mocked(usuarioService.buscarPorUserId).mockResolvedValue(usuarioComUltimo)
      vi.mocked(estabelecimentoService.buscarAtivos).mockResolvedValue([
        MOCK_ESTAB_1,
        MOCK_ESTAB_2,
      ])

      const { result } = renderHookWithProvider(useEstabelecimento)

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.estabelecimentoAtual?.id).toBe(MOCK_ESTAB_2.id)
    })

    it('deve exibir erro quando nenhum estabelecimento ativo disponível (Req 4.6)', async () => {
      const mockUser = { id: MOCK_ADMIN_GERAL.user_id }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      })
      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } as any },
      } as any)
      vi.mocked(usuarioService.buscarPorUserId).mockResolvedValue(MOCK_ADMIN_GERAL)
      vi.mocked(estabelecimentoService.buscarAtivos).mockResolvedValue([])

      const { result } = renderHookWithProvider(useEstabelecimento)

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.erro).toContain('Nenhum estabelecimento ativo')
      expect(result.current.estabelecimentoAtual).toBeNull()
    })
  })

  describe('Admin Estabelecimento profile', () => {
    it('deve ver apenas estabelecimento vinculado e não poder trocar (Req 3.3, 4.5)', async () => {
      const mockUser = { id: MOCK_ADMIN_ESTAB.user_id }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      })
      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } as any },
      } as any)
      vi.mocked(usuarioService.buscarPorUserId).mockResolvedValue(MOCK_ADMIN_ESTAB)
      // RLS retorna apenas o estabelecimento autorizado
      vi.mocked(estabelecimentoService.buscarAtivos).mockResolvedValue([MOCK_ESTAB_1])

      const { result } = renderHookWithProvider(useEstabelecimento)

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.estabelecimentosAutorizados).toHaveLength(1)
      expect(result.current.estabelecimentosAutorizados[0].id).toBe(MOCK_ESTAB_1.id)
      expect(result.current.estabelecimentoAtual?.id).toBe(MOCK_ESTAB_1.id)
      expect(result.current.podeTrocar).toBe(false)
    })

    it('deve selecionar automaticamente o estabelecimento vinculado (Req 4.5)', async () => {
      const mockUser = { id: MOCK_ADMIN_ESTAB.user_id }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      })
      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } as any },
      } as any)
      vi.mocked(usuarioService.buscarPorUserId).mockResolvedValue(MOCK_ADMIN_ESTAB)
      vi.mocked(estabelecimentoService.buscarAtivos).mockResolvedValue([MOCK_ESTAB_1])

      const { result } = renderHookWithProvider(useEstabelecimento)

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.estabelecimentoAtual?.id).toBe(MOCK_ESTAB_1.id)
    })
  })

  describe('Operador profile', () => {
    it('deve ver apenas estabelecimento vinculado e não poder trocar', async () => {
      const mockUser = { id: MOCK_OPERADOR.user_id }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      })
      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } as any },
      } as any)
      vi.mocked(usuarioService.buscarPorUserId).mockResolvedValue(MOCK_OPERADOR)
      vi.mocked(estabelecimentoService.buscarAtivos).mockResolvedValue([MOCK_ESTAB_1])

      const { result } = renderHookWithProvider(useEstabelecimento)

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.estabelecimentoAtual?.id).toBe(MOCK_ESTAB_1.id)
      expect(result.current.podeTrocar).toBe(false)
    })
  })

  describe('No establishment linked (Req 4.6)', () => {
    it('deve bloquear acesso quando usuário não tem estabelecimento ativo vinculado', async () => {
      const mockUser = { id: MOCK_ADMIN_ESTAB.user_id }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      })
      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } as any },
      } as any)
      vi.mocked(usuarioService.buscarPorUserId).mockResolvedValue(MOCK_ADMIN_ESTAB)
      vi.mocked(estabelecimentoService.buscarAtivos).mockResolvedValue([])

      const { result } = renderHookWithProvider(useEstabelecimento)

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.erro).toBeDefined()
      expect(result.current.estabelecimentoAtual).toBeNull()
    })
  })
})


describe('EstabelecimentoProvider - Switching Establishments (Req 3.4, 3.8)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    try { localStorage.clear() } catch { /* ignore */ }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('deve permitir admin_geral trocar entre estabelecimentos (Req 3.4)', async () => {
    const mockUser = { id: MOCK_ADMIN_GERAL.user_id }
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    })
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } as any },
    } as any)
    vi.mocked(usuarioService.buscarPorUserId).mockResolvedValue(MOCK_ADMIN_GERAL)
    vi.mocked(estabelecimentoService.buscarAtivos).mockResolvedValue([
      MOCK_ESTAB_1,
      MOCK_ESTAB_2,
    ])
    
    // Mock do supabase.from para update
    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    } as any)

    const { result } = renderHookWithProvider(useEstabelecimento)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.estabelecimentoAtual?.id).toBe(MOCK_ESTAB_1.id)

    // Trocar para segundo estabelecimento
    await act(async () => {
      await result.current.trocarEstabelecimento(MOCK_ESTAB_2.id)
    })

    expect(result.current.estabelecimentoAtual?.id).toBe(MOCK_ESTAB_2.id)
    expect(setEstabelecimentoAtivo).toHaveBeenCalledWith(MOCK_ESTAB_2.id)
  })

  it('deve registrar auditoria ao trocar de estabelecimento (Req 9.2)', async () => {
    const mockUser = { id: MOCK_ADMIN_GERAL.user_id }
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    })
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } as any },
    } as any)
    vi.mocked(usuarioService.buscarPorUserId).mockResolvedValue(MOCK_ADMIN_GERAL)
    vi.mocked(estabelecimentoService.buscarAtivos).mockResolvedValue([
      MOCK_ESTAB_1,
      MOCK_ESTAB_2,
    ])

    const { result } = renderHookWithProvider(useEstabelecimento)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await result.current.trocarEstabelecimento(MOCK_ESTAB_2.id)

    expect(auditoriaService.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        acao: 'estabelecimento.trocar',
        estabelecimento_id: MOCK_ESTAB_2.id,
        metadata: expect.objectContaining({
          origem_id: MOCK_ESTAB_1.id,
          destino_id: MOCK_ESTAB_2.id,
        }),
      })
    )
  })

  it('deve impedir admin_de_estabelecimento de trocar', async () => {
    const mockUser = { id: MOCK_ADMIN_ESTAB.user_id }
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    })
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } as any },
    } as any)
    vi.mocked(usuarioService.buscarPorUserId).mockResolvedValue(MOCK_ADMIN_ESTAB)
    vi.mocked(estabelecimentoService.buscarAtivos).mockResolvedValue([MOCK_ESTAB_1])

    const { result } = renderHookWithProvider(useEstabelecimento)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.podeTrocar).toBe(false)
    await expect(
      result.current.trocarEstabelecimento(MOCK_ESTAB_2.id)
    ).rejects.toThrow('Seu perfil não permite trocar de estabelecimento')
  })

  it('deve impedir operador de trocar', async () => {
    const mockUser = { id: MOCK_OPERADOR.user_id }
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    })
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } as any },
    } as any)
    vi.mocked(usuarioService.buscarPorUserId).mockResolvedValue(MOCK_OPERADOR)
    vi.mocked(estabelecimentoService.buscarAtivos).mockResolvedValue([MOCK_ESTAB_1])

    const { result } = renderHookWithProvider(useEstabelecimento)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.podeTrocar).toBe(false)
    await expect(
      result.current.trocarEstabelecimento(MOCK_ESTAB_2.id)
    ).rejects.toThrow()
  })

  it('deve impedir trocar para estabelecimento não autorizado', async () => {
    const mockUser = { id: MOCK_ADMIN_GERAL.user_id }
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    })
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } as any },
    } as any)
    vi.mocked(usuarioService.buscarPorUserId).mockResolvedValue(MOCK_ADMIN_GERAL)
    vi.mocked(estabelecimentoService.buscarAtivos).mockResolvedValue([MOCK_ESTAB_1])

    const { result } = renderHookWithProvider(useEstabelecimento)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await expect(
      result.current.trocarEstabelecimento(MOCK_ESTAB_2.id)
    ).rejects.toThrow('Estabelecimento não disponível')
  })

  it('deve manter sessão autenticada ao trocar (Req 3.8)', async () => {
    const mockUser = { id: MOCK_ADMIN_GERAL.user_id }
    const subscriptionMock = { unsubscribe: vi.fn() }
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    })
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: subscriptionMock as any },
    } as any)
    vi.mocked(usuarioService.buscarPorUserId).mockResolvedValue(MOCK_ADMIN_GERAL)
    vi.mocked(estabelecimentoService.buscarAtivos).mockResolvedValue([
      MOCK_ESTAB_1,
      MOCK_ESTAB_2,
    ])

    const { result } = renderHookWithProvider(useEstabelecimento)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await result.current.trocarEstabelecimento(MOCK_ESTAB_2.id)

    // Verificar que o subscription não foi descartado
    expect(subscriptionMock.unsubscribe).not.toHaveBeenCalled()
  })
})


describe('EstabelecimentoProvider - Persistence (Req 4.1, 4.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    try { localStorage.clear() } catch { /* ignore */ }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('deve persistir último estabelecimento ao trocar (Req 4.1)', async () => {
    const mockUser = { id: MOCK_ADMIN_GERAL.user_id }
    const supabaseUpdateMock = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    })
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } as any },
    } as any)
    vi.mocked(usuarioService.buscarPorUserId).mockResolvedValue(MOCK_ADMIN_GERAL)
    vi.mocked(estabelecimentoService.buscarAtivos).mockResolvedValue([
      MOCK_ESTAB_1,
      MOCK_ESTAB_2,
    ])
    
    // Mock do supabase.from para update
    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    } as any)

    const { result } = renderHookWithProvider(useEstabelecimento)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await result.current.trocarEstabelecimento(MOCK_ESTAB_2.id)

    // Verificar que a chamada foi feita para atualizar ultimo_estabelecimento_id
    expect(supabase.from).toHaveBeenCalledWith('usuarios_estabelecimento')
  })

  it('deve restaurar último estabelecimento na próxima sessão (Req 4.3)', async () => {
    const usuarioComUltimo: UsuarioEstabelecimento = {
      ...MOCK_ADMIN_GERAL,
      ultimo_estabelecimento_id: MOCK_ESTAB_2.id,
    }

    const mockUser = { id: MOCK_ADMIN_GERAL.user_id }
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    })
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } as any },
    } as any)
    vi.mocked(usuarioService.buscarPorUserId).mockResolvedValue(usuarioComUltimo)
    vi.mocked(estabelecimentoService.buscarAtivos).mockResolvedValue([
      MOCK_ESTAB_1,
      MOCK_ESTAB_2,
    ])

    const { result } = renderHookWithProvider(useEstabelecimento)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.estabelecimentoAtual?.id).toBe(MOCK_ESTAB_2.id)
  })

  it('deve usar primeiro estabelecimento quando último foi desativado (Req 4.4)', async () => {
    const usuarioComUltimoInativo: UsuarioEstabelecimento = {
      ...MOCK_ADMIN_GERAL,
      ultimo_estabelecimento_id: MOCK_ESTAB_INACTIVE.id,
    }

    const mockUser = { id: MOCK_ADMIN_GERAL.user_id }
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    })
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } as any },
    } as any)
    vi.mocked(usuarioService.buscarPorUserId).mockResolvedValue(usuarioComUltimoInativo)
    vi.mocked(estabelecimentoService.buscarAtivos).mockResolvedValue([
      MOCK_ESTAB_1,
      MOCK_ESTAB_2,
    ])

    const { result } = renderHookWithProvider(useEstabelecimento)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Deve usar o primeiro disponível
    expect(result.current.estabelecimentoAtual?.id).toBe(MOCK_ESTAB_1.id)
  })

  it('deve tolerar falha ao persistir preferência (Req 4.2)', async () => {
    const mockUser = { id: MOCK_ADMIN_GERAL.user_id }
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    })
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } as any },
    } as any)
    vi.mocked(usuarioService.buscarPorUserId).mockResolvedValue(MOCK_ADMIN_GERAL)
    vi.mocked(estabelecimentoService.buscarAtivos).mockResolvedValue([
      MOCK_ESTAB_1,
      MOCK_ESTAB_2,
    ])
    
    // Mock do supabase.from para falhar
    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ 
          error: { message: 'Falha de conexão' } 
        }),
      }),
    } as any)

    const { result } = renderHookWithProvider(useEstabelecimento)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Deve não lançar erro, apenas fazer console.warn
    await act(async () => {
      await expect(
        result.current.trocarEstabelecimento(MOCK_ESTAB_2.id)
      ).resolves.not.toThrow()
    })

    // Mas deve ter mudado o contexto mesmo assim
    expect(result.current.estabelecimentoAtual?.id).toBe(MOCK_ESTAB_2.id)
  })
})


describe('EstabelecimentoProvider - State Management (Property 7)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    try { localStorage.clear() } catch { /* ignore */ }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('deve sincronizar setEstabelecimentoAtivo ao trocar (Property 7)', async () => {
    const mockUser = { id: MOCK_ADMIN_GERAL.user_id }
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    })
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } as any },
    } as any)
    vi.mocked(usuarioService.buscarPorUserId).mockResolvedValue(MOCK_ADMIN_GERAL)
    vi.mocked(estabelecimentoService.buscarAtivos).mockResolvedValue([
      MOCK_ESTAB_1,
      MOCK_ESTAB_2,
    ])

    const { result } = renderHookWithProvider(useEstabelecimento)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Ao inicializar
    expect(setEstabelecimentoAtivo).toHaveBeenCalledWith(MOCK_ESTAB_1.id)

    // Ao trocar
    vi.clearAllMocks()
    await result.current.trocarEstabelecimento(MOCK_ESTAB_2.id)
    expect(setEstabelecimentoAtivo).toHaveBeenCalledWith(MOCK_ESTAB_2.id)
  })

  it('deve manter estado de loading correto', async () => {
    const mockUser = { id: MOCK_ADMIN_GERAL.user_id }
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    })
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } as any },
    } as any)
    vi.mocked(usuarioService.buscarPorUserId).mockResolvedValue(MOCK_ADMIN_GERAL)
    vi.mocked(estabelecimentoService.buscarAtivos).mockResolvedValue([
      MOCK_ESTAB_1,
      MOCK_ESTAB_2,
    ])

    const { result } = renderHookWithProvider(useEstabelecimento)

    // Inicialmente loading
    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Após carregar
    expect(result.current.loading).toBe(false)
  })

  it('deve expor todos os campos corretos do contexto', async () => {
    const mockUser = { id: MOCK_ADMIN_GERAL.user_id }
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    })
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } as any },
    } as any)
    vi.mocked(usuarioService.buscarPorUserId).mockResolvedValue(MOCK_ADMIN_GERAL)
    vi.mocked(estabelecimentoService.buscarAtivos).mockResolvedValue([
      MOCK_ESTAB_1,
      MOCK_ESTAB_2,
    ])

    const { result } = renderHookWithProvider(useEstabelecimento)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current).toHaveProperty('estabelecimentoAtual')
    expect(result.current).toHaveProperty('estabelecimentosAutorizados')
    expect(result.current).toHaveProperty('perfil')
    expect(result.current).toHaveProperty('usuario')
    expect(result.current).toHaveProperty('podeTrocar')
    expect(result.current).toHaveProperty('loading')
    expect(result.current).toHaveProperty('erro')
    expect(result.current).toHaveProperty('trocarEstabelecimento')
    expect(result.current).toHaveProperty('recarregar')
  })
})

describe('EstabelecimentoProvider - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    try { localStorage.clear() } catch { /* ignore */ }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('deve lidar com erro ao carregar usuário', async () => {
    const mockUser = { id: 'auth-user-unknown' }
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    })
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } as any },
    } as any)
    vi.mocked(usuarioService.buscarPorUserId).mockRejectedValue(
      new Error('Usuário não encontrado')
    )

    const { result } = renderHookWithProvider(useEstabelecimento)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.erro).toBeDefined()
    expect(result.current.estabelecimentoAtual).toBeNull()
  })

  it('deve lidar com erro ao carregar estabelecimentos', async () => {
    const mockUser = { id: MOCK_ADMIN_GERAL.user_id }
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    })
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } as any },
    } as any)
    vi.mocked(usuarioService.buscarPorUserId).mockResolvedValue(MOCK_ADMIN_GERAL)
    vi.mocked(estabelecimentoService.buscarAtivos).mockRejectedValue(
      new Error('Erro ao buscar estabelecimentos')
    )

    const { result } = renderHookWithProvider(useEstabelecimento)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.erro).toContain('Erro ao')
    expect(result.current.estabelecimentoAtual).toBeNull()
  })

  it('deve lançar erro ao usar hook fora do provider', () => {
    // Suprimir erro de console para este teste
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      renderHook(() => useEstabelecimento())
    }).toThrow('useEstabelecimento deve ser usado dentro de EstabelecimentoProvider')

    spy.mockRestore()
  })

  it('deve fornecer função recarregar para retentar carregamento', async () => {
    const mockUser = { id: MOCK_ADMIN_GERAL.user_id }
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    })
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } as any },
    } as any)
    vi.mocked(usuarioService.buscarPorUserId).mockResolvedValue(MOCK_ADMIN_GERAL)
    vi.mocked(estabelecimentoService.buscarAtivos).mockResolvedValue([
      MOCK_ESTAB_1,
      MOCK_ESTAB_2,
    ])

    const { result } = renderHookWithProvider(useEstabelecimento)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.recarregar).toBeDefined()
    expect(typeof result.current.recarregar).toBe('function')

    // Deve ser possível chamar recarregar
    await result.current.recarregar()
    
    expect(result.current.loading).toBe(false)
  })
})

describe('EstabelecimentoProvider - Authentication State Changes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    try { localStorage.clear() } catch { /* ignore */ }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('deve recarregar ao fazer sign-in de um usuário diferente (SIGNED_IN event)', async () => {
    let authStateCallback: ((event: string, session?: any) => void) | null = null

    const mockUser = { id: MOCK_ADMIN_GERAL.user_id }
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    })
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation(
      (callback: any) => {
        authStateCallback = callback
        return { data: { subscription: { unsubscribe: vi.fn() } as any } } as any
      }
    )
    vi.mocked(usuarioService.buscarPorUserId).mockResolvedValue(MOCK_ADMIN_GERAL)
    vi.mocked(estabelecimentoService.buscarAtivos).mockResolvedValue([
      MOCK_ESTAB_1,
      MOCK_ESTAB_2,
    ])

    const { result } = renderHookWithProvider(useEstabelecimento)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const chamadasAntes = vi.mocked(usuarioService.buscarPorUserId).mock.calls.length

    // Simular sign-in de um usuário DIFERENTE do já carregado (troca real de conta)
    if (authStateCallback) {
      authStateCallback('SIGNED_IN', { user: { id: 'outro-usuario-id' } })
      await waitFor(() => {
        expect(usuarioService.buscarPorUserId).toHaveBeenCalledTimes(chamadasAntes + 1)
      })
    }
  })

  it('NÃO deve recarregar ao repetir SIGNED_IN para o mesmo usuário (evita perder o estado da página ao trocar de aba)', async () => {
    // Regressão: o supabase-js redispara SIGNED_IN ao readquirir foco na aba,
    // mesmo sem um login novo. Se o contexto recarregasse nesse caso, o
    // `loading` giraria de novo e desmontaria toda a árvore de rotas,
    // fazendo a página perder filtros/estado (relatado pelo usuário).
    let authStateCallback: ((event: string, session?: any) => void) | null = null

    const mockUser = { id: MOCK_ADMIN_GERAL.user_id }
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    })
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation(
      (callback: any) => {
        authStateCallback = callback
        return { data: { subscription: { unsubscribe: vi.fn() } as any } } as any
      }
    )
    vi.mocked(usuarioService.buscarPorUserId).mockResolvedValue(MOCK_ADMIN_GERAL)
    vi.mocked(estabelecimentoService.buscarAtivos).mockResolvedValue([
      MOCK_ESTAB_1,
      MOCK_ESTAB_2,
    ])

    const { result } = renderHookWithProvider(useEstabelecimento)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const chamadasAntes = vi.mocked(usuarioService.buscarPorUserId).mock.calls.length

    // Simular o re-disparo "fantasma" de SIGNED_IN para o MESMO usuário
    if (authStateCallback) {
      authStateCallback('SIGNED_IN', { user: { id: mockUser.id } })
    }

    // Nada deve recarregar, e o loading não deve voltar a ficar true
    expect(result.current.loading).toBe(false)
    expect(usuarioService.buscarPorUserId).toHaveBeenCalledTimes(chamadasAntes)
  })

  it('deve recarregar ao fazer sign-out (SIGNED_OUT event)', async () => {
    let authStateCallback: ((event: string) => void) | null = null

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    })
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation(
      (callback: any) => {
        authStateCallback = callback
        return { data: { subscription: { unsubscribe: vi.fn() } as any } } as any
      }
    )
    vi.mocked(usuarioService.buscarPorUserId).mockResolvedValue(MOCK_ADMIN_GERAL)
    vi.mocked(estabelecimentoService.buscarAtivos).mockResolvedValue([
      MOCK_ESTAB_1,
      MOCK_ESTAB_2,
    ])

    const { result } = renderHookWithProvider(useEstabelecimento)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Simular sign-out
    if (authStateCallback) {
      authStateCallback('SIGNED_OUT')
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    }
  })
})
