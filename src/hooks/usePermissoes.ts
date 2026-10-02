/**
 * Hook para gerenciar permissões de acesso baseadas em função
 * 
 * Define os níveis de acesso:
 * - Administrador (profile): Acesso total ao sistema
 * - Entregador: Sem acesso à área administrativa
 * - Garçom: Acesso apenas a Comandas (sem histórico)
 * - Atendente: Acesso a Comandas, Pedidos e PDV (e suas subpáginas)
 * 
 * @module hooks/usePermissoes
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { PerfilUsuario } from '@/types/estabelecimento'
import { aplicarModulos, moduloService } from '@/services/moduloService'

export type Funcao = 'atendente' | 'garcom' | 'entregador' | null

export interface Permissoes {
  funcao: Funcao
  podeAcessarDashboard: boolean
  podeAcessarPedidos: boolean
  podeAcessarHistorico: boolean
  podeAcessarAguardandoPagamento: boolean
  podeAcessarPDV: boolean
  podeAcessarComandas: boolean
  podeAcessarHistoricoComandas: boolean
  podeAcessarProdutos: boolean
  podeAcessarCategorias: boolean
  podeAcessarSabores: boolean
  podeAcessarAdicionais: boolean
  podeAcessarEstoque: boolean
  podeAcessarFuncionarios: boolean
  podeAcessarConfiguracoes: boolean
  podeAcessarMetricas: boolean
}

/**
 * Define as permissões baseadas na função do usuário
 */
const getPermissoesPorFuncao = (funcao: Funcao): Permissoes => {
  const permissoesBase: Permissoes = {
    funcao,
    podeAcessarDashboard: false,
    podeAcessarPedidos: false,
    podeAcessarHistorico: false,
    podeAcessarAguardandoPagamento: false,
    podeAcessarPDV: false,
    podeAcessarComandas: false,
    podeAcessarHistoricoComandas: false,
    podeAcessarProdutos: false,
    podeAcessarCategorias: false,
    podeAcessarSabores: false,
    podeAcessarAdicionais: false,
    podeAcessarEstoque: false,
    podeAcessarFuncionarios: false,
    podeAcessarConfiguracoes: false,
    podeAcessarMetricas: false,
  }

  switch (funcao) {
    case 'entregador':
      // Entregador: Sem acesso à área administrativa
      return permissoesBase

    case 'garcom':
      // Garçom: Acesso apenas a Comandas (sem histórico)
      return {
        ...permissoesBase,
        podeAcessarComandas: true,
      }

    case 'atendente':
      // Atendente: Acesso a Comandas, Pedidos e PDV (e suas subpáginas)
      return {
        ...permissoesBase,
        podeAcessarPedidos: true,
        podeAcessarHistorico: true,
        podeAcessarAguardandoPagamento: true,
        podeAcessarPDV: true,
        podeAcessarComandas: true,
        podeAcessarHistoricoComandas: true,
      }

    default:
      // Sem função definida = sem permissões
      return permissoesBase
  }
}

/**
 * Define as permissões com base no PERFIL multi-estabelecimento (Req 2).
 * Esta é a fonte de verdade quando o usuário possui vínculo em
 * usuarios_estabelecimento. Substitui o modelo antigo (profile/funcionarios).
 */
const getPermissoesPorPerfil = (perfil: PerfilUsuario): Permissoes => {
  // Operador: todos os menus operacionais
  const operador: Permissoes = {
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
    podeAcessarFuncionarios: false,
    podeAcessarConfiguracoes: false,
    podeAcessarMetricas: true,
  }

  if (perfil === 'operador') {
    return operador
  }

  // Administrador do Estabelecimento e Administrador Geral:
  // operacional + funcionários, configurações, métricas
  return {
    ...operador,
    podeAcessarFuncionarios: true,
    podeAcessarConfiguracoes: true,
    podeAcessarMetricas: true,
  }
}

/**
 * Hook para obter e gerenciar permissões do usuário logado
 */
export function usePermissoes() {
  // Permissões do perfil/função; os módulos do cliente são aplicados por cima (abaixo)
  const [permissoesBase, setPermissoes] = useState<Permissoes>(getPermissoesPorFuncao(null))
  // Módulos ligados do cliente (null = ainda não carregados / sem restrição)
  const [modulos, setModulos] = useState<string[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  // Multi-estabelecimento: perfil e vínculo do usuário (Req 2, 6.4)
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null)
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null)
  const currentUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    const carregarPermissoes = async (forceReload = false) => {
      try {
        // Não mostrar loading após a primeira carga, a menos que seja forçado
        if (!isInitialized || forceReload) {
          setIsLoading(true)
        }
        setError(null)

        // Obter usuário autenticado
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError) {
          throw authError
        }

        if (!user) {
          setPermissoes(getPermissoesPorFuncao(null))
          setModulos(null)
          currentUserIdRef.current = null
          return
        }

        // Salvar ID do usuário atual
        currentUserIdRef.current = user.id

        // Módulos ligados do cliente (menu e rotas de módulos desligados somem)
        setModulos(await moduloService.meusModulos())

        // Multi-estabelecimento: carregar perfil e vínculo (com fallback) — Req 6.4
        try {
          const { data: ue } = await supabase
            .from('usuarios_estabelecimento')
            .select('perfil, estabelecimento_id')
            .eq('user_id', user.id)
            .eq('ativo', true)
            .maybeSingle()
          if (ue) {
            setPerfil(ue.perfil as PerfilUsuario)
            setEstabelecimentoId(ue.estabelecimento_id ?? null)
            // O perfil multi-estabelecimento é a fonte de verdade das permissões.
            // Operador cadastrado como funcionário (garçom/atendente/entregador)
            // fica restrito aos menus da sua função.
            if (ue.perfil === 'operador') {
              const { data: func } = await supabase
                .from('funcionarios')
                .select('funcao')
                .eq('user_id', user.id)
                .maybeSingle()
              if (func?.funcao) {
                setPermissoes(getPermissoesPorFuncao(func.funcao as Funcao))
                return
              }
            }
            setPermissoes(getPermissoesPorPerfil(ue.perfil as PerfilUsuario))
            return
          } else {
            setPerfil(null)
            setEstabelecimentoId(null)
          }
        } catch {
          // Tabela pode não existir ainda em ambientes não migrados — ignora e usa modelo antigo
          setPerfil(null)
          setEstabelecimentoId(null)
        }

        // Primeiro, verificar se é um administrador
        const { data: profile, error: profileError } = await supabase
          .from('profile')
          .select('ativo')
          .eq('user_id', user.id)
          .eq('ativo', true)
          .maybeSingle()

        // Se for administrador, dar acesso total
        if (profile && !profileError) {
          console.log('✅ Usuário identificado como ADMINISTRADOR')
          setPermissoes({
            funcao: null, // Administrador não tem função específica
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
          })
          return
        }

        console.log('ℹ️ Não é administrador, buscando função de funcionário...')

        // Se não for administrador, buscar funcionário pelo user_id
        const { data: funcionario, error: funcError } = await supabase
          .from('funcionarios')
          .select('funcao')
          .eq('user_id', user.id)
          .maybeSingle()

        if (funcError) {
          console.error('Erro ao buscar função do funcionário:', funcError)
          throw funcError
        }

        // Definir permissões baseadas na função
        const funcao = funcionario?.funcao as Funcao
        console.log('👤 Função do funcionário:', funcao)
        setPermissoes(getPermissoesPorFuncao(funcao))
      } catch (err) {
        console.error('Erro ao carregar permissões:', err)
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
        setPermissoes(getPermissoesPorFuncao(null))
      } finally {
        setIsLoading(false)
        setIsInitialized(true)
      }
    }

    carregarPermissoes(false)

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Para SIGNED_OUT, sempre recarregar
      if (event === 'SIGNED_OUT') {
        setIsInitialized(false)
        carregarPermissoes(true)
        return
      }

      // Para SIGNED_IN, verificar se o usuário mudou
      if (event === 'SIGNED_IN') {
        const newUserId = session?.user?.id

        if (newUserId && newUserId !== currentUserIdRef.current) {
          setIsInitialized(false)
          carregarPermissoes(true)
        }
        return
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Permissões efetivas = perfil/função ∩ módulos ligados do cliente
  const permissoes = useMemo(
    () => aplicarModulos(permissoesBase, modulos),
    [permissoesBase, modulos]
  )

  /**
   * Verifica se o usuário pode acessar uma página específica
   */
  const podeAcessarPagina = useCallback((pagina: string): boolean => {
    // Páginas que sempre podem ser acessadas (se autenticado)
    const paginasPublicas = ['dashboard']

    if (paginasPublicas.includes(pagina)) {
      return true
    }

    // Verificar permissões específicas
    if (pagina === 'pedidos') {
      return permissoes.podeAcessarPedidos
    }
    if (pagina === 'historico') {
      return permissoes.podeAcessarHistorico
    }
    if (pagina === 'aguardando-pagamento') {
      return permissoes.podeAcessarAguardandoPagamento
    }
    if (pagina === 'pdv') {
      return permissoes.podeAcessarPDV
    }
    if (pagina === 'historico-vendas') {
      return permissoes.podeAcessarPDV // Mesma permissão do PDV
    }
    if (pagina === 'comandas') {
      return permissoes.podeAcessarComandas
    }
    if (pagina === 'historico-comandas') {
      return permissoes.podeAcessarHistoricoComandas
    }
    if (pagina === 'produtos' || pagina === 'novo-produto' || pagina === 'editar-produto' || pagina === 'novo-combo' || pagina === 'editar-combo') {
      return permissoes.podeAcessarProdutos
    }
    if (pagina === 'categorias' || pagina === 'nova-categoria' || pagina === 'editar-categoria') {
      return permissoes.podeAcessarCategorias
    }
    if (pagina === 'sabores' || pagina === 'novo-sabor' || pagina === 'editar-sabor') {
      return permissoes.podeAcessarSabores
    }
    if (pagina === 'sabores-borda' || pagina === 'novo-sabor-borda' || pagina === 'editar-sabor-borda') {
      return permissoes.podeAcessarSabores
    }
    if (pagina === 'adicionais' || pagina === 'novo-adicional' || pagina === 'editar-adicional') {
      return permissoes.podeAcessarAdicionais
    }
    if (pagina === 'estoque' || pagina === 'estoque-produtos' || pagina === 'novo-item-estoque' || pagina === 'editar-item-estoque') {
      return permissoes.podeAcessarEstoque
    }
    if (pagina === 'historico-movimentacoes') {
      return permissoes.podeAcessarEstoque // Mesma permissão do Estoque
    }
    if (pagina === 'funcionarios' || pagina === 'novo-funcionario' || pagina === 'editar-funcionario') {
      return permissoes.podeAcessarFuncionarios
    }
    if (pagina === 'configuracoes' || pagina.startsWith('configuracoes-')) {
      return permissoes.podeAcessarConfiguracoes
    }
    if (pagina === 'metricas') {
      return permissoes.podeAcessarMetricas
    }
    // Multi-estabelecimento
    if (pagina === 'estabelecimentos') {
      return perfil === 'administrador_geral'
    }
    if (pagina === 'usuarios') {
      return perfil === 'administrador_geral' || perfil === 'administrador_estabelecimento'
    }
    if (pagina === 'auditoria') {
      return perfil === 'administrador_geral' || perfil === 'administrador_estabelecimento'
    }

    // Por padrão, negar acesso
    return false
  }, [
    permissoes.podeAcessarPedidos,
    permissoes.podeAcessarHistorico,
    permissoes.podeAcessarAguardandoPagamento,
    permissoes.podeAcessarPDV,
    permissoes.podeAcessarComandas,
    permissoes.podeAcessarHistoricoComandas,
    permissoes.podeAcessarProdutos,
    permissoes.podeAcessarCategorias,
    permissoes.podeAcessarSabores,
    permissoes.podeAcessarAdicionais,
    permissoes.podeAcessarEstoque,
    permissoes.podeAcessarFuncionarios,
    permissoes.podeAcessarConfiguracoes,
    permissoes.podeAcessarMetricas,
    perfil,
  ])

  return {
    permissoes,
    isLoading,
    error,
    podeAcessarPagina,
    isAdmin: permissoes.podeAcessarConfiguracoes && permissoes.podeAcessarFuncionarios && permissoes.podeAcessarMetricas,
    // Multi-estabelecimento (Req 6.4)
    perfil,
    estabelecimentoId,
    podeGerenciarEstabelecimentos: perfil === 'administrador_geral',
    podeCadastrarEstabelecimentos: perfil === 'administrador_geral',
    podeGerenciarUsuarios: perfil === 'administrador_geral' || perfil === 'administrador_estabelecimento',
    podeTrocarEstabelecimento: perfil === 'administrador_geral',
    podeVerAuditoria: perfil === 'administrador_geral' || perfil === 'administrador_estabelecimento',
  }
}
