/**
 * Serviço de Usuários (multi-tenant)
 *
 * Gerencia os registros de `usuarios_estabelecimento` (vínculo perfil +
 * estabelecimento) e a criação da credencial no Supabase Auth.
 *
 * IMPORTANTE sobre criação de credencial:
 *   Criar um usuário no Supabase Auth exige a service role (admin API), que NÃO
 *   pode ser exposta no frontend. Por isso a criação é delegada a uma Edge
 *   Function `criar-usuario` (deve ser implantada com a service_role key). Se a
 *   função não estiver disponível, `criar` lança erro orientando o deploy.
 *   Isso atende Req 2.5, 2.11 (rollback em falha) mantendo a sessão do admin.
 *
 * @module services/usuarioService
 */

import { supabase } from '@/lib/supabase'
import type { PerfilUsuario, UsuarioEstabelecimento } from '@/types/estabelecimento'
import { mensagemErroEdgeFunction } from './edgeFunction'

export type NovoUsuario = {
  nome: string
  email: string
  senha: string
  perfil: PerfilUsuario
  estabelecimento_id: string | null
  ativo?: boolean
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Valida campos do usuário. Retorna mensagem de erro ou null. */
export function validarUsuario(dados: Partial<NovoUsuario>): string | null {
  const nome = (dados.nome ?? '').trim()
  if (nome.length < 1 || nome.length > 120) {
    return 'O nome é obrigatório e deve ter entre 1 e 120 caracteres.'
  }
  if (!dados.email || !EMAIL_REGEX.test(dados.email) || dados.email.length > 255) {
    return 'Informe um email válido.'
  }
  if (!dados.perfil) {
    return 'O perfil é obrigatório.'
  }
  // Perfis não-globais exigem estabelecimento vinculado (Req 2.3)
  if (dados.perfil !== 'administrador_geral' && !dados.estabelecimento_id) {
    return 'Perfis de Administrador de Estabelecimento e Operador exigem um estabelecimento vinculado.'
  }
  return null
}

export interface UsuarioService {
  listar(): Promise<UsuarioEstabelecimento[]>
  buscarPorUserId(userId: string): Promise<UsuarioEstabelecimento | null>
  criar(dados: NovoUsuario): Promise<UsuarioEstabelecimento>
  atualizar(id: string, dados: Partial<Omit<NovoUsuario, 'senha' | 'email'>>): Promise<UsuarioEstabelecimento>
  definirAtivo(id: string, ativo: boolean): Promise<void>
  excluir(id: string): Promise<void>
  resetarSenha(id: string, novaSenha: string): Promise<void>
}

export const usuarioService: UsuarioService = {
  async listar(): Promise<UsuarioEstabelecimento[]> {
    // A RLS restringe automaticamente ao escopo do usuário autenticado (Req 2.8).
    const { data, error } = await supabase
      .from('usuarios_estabelecimento')
      .select('*')
      .order('nome', { ascending: true })
    if (error) {
      console.error('Erro ao listar usuários:', error)
      throw new Error(`Falha ao listar usuários: ${error.message}`)
    }
    return data || []
  },

  async buscarPorUserId(userId: string): Promise<UsuarioEstabelecimento | null> {
    const { data, error } = await supabase
      .from('usuarios_estabelecimento')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) {
      console.error('Erro ao buscar usuário:', error)
      throw new Error(`Falha ao buscar usuário: ${error.message}`)
    }
    return data
  },

  async criar(dados: NovoUsuario): Promise<UsuarioEstabelecimento> {
    const erro = validarUsuario(dados)
    if (erro) throw new Error(erro)

    // Delegar criação da credencial + vínculo para a Edge Function (service role).
    // A função deve: criar o usuário no Auth, inserir em usuarios_estabelecimento
    // e fazer rollback do Auth caso a inserção falhe (Req 2.5, 2.6, 2.11).
    const { data, error } = await supabase.functions.invoke('criar-usuario', {
      body: {
        nome: dados.nome.trim(),
        email: dados.email.trim().toLowerCase(),
        senha: dados.senha,
        perfil: dados.perfil,
        estabelecimento_id: dados.perfil === 'administrador_geral' ? null : dados.estabelecimento_id,
        ativo: dados.ativo ?? true,
      },
    })

    if (error) {
      console.error('Erro ao criar usuário (Edge Function criar-usuario):', error)
      throw new Error(await mensagemErroEdgeFunction(error, 'Falha ao criar usuário. Tente novamente.'))
    }
    return data as UsuarioEstabelecimento
  },

  async atualizar(
    id: string,
    dados: Partial<Omit<NovoUsuario, 'senha' | 'email'>>
  ): Promise<UsuarioEstabelecimento> {
    if (dados.perfil && dados.perfil !== 'administrador_geral' && dados.estabelecimento_id === null) {
      throw new Error('Perfis não-globais exigem um estabelecimento vinculado.')
    }
    const payload: Record<string, unknown> = {}
    if (dados.nome !== undefined) payload.nome = dados.nome.trim()
    if (dados.perfil !== undefined) payload.perfil = dados.perfil
    if (dados.estabelecimento_id !== undefined) {
      payload.estabelecimento_id =
        dados.perfil === 'administrador_geral' ? null : dados.estabelecimento_id
    }
    if (dados.ativo !== undefined) payload.ativo = dados.ativo

    const { data, error } = await supabase
      .from('usuarios_estabelecimento')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar usuário:', error)
      throw new Error(`Falha ao atualizar usuário: ${error.message}`)
    }
    return data
  },

  async definirAtivo(id: string, ativo: boolean): Promise<void> {
    const { error } = await supabase
      .from('usuarios_estabelecimento')
      .update({ ativo })
      .eq('id', id)
    if (error) {
      console.error('Erro ao alterar status do usuário:', error)
      throw new Error(`Falha ao alterar status: ${error.message}`)
    }
  },

  async excluir(id: string): Promise<void> {
    // DELETE permanente - RLS garante que só pode excluir do próprio estabelecimento
    // A constraint ON DELETE CASCADE remove também a linha em auth.users
    const { error } = await supabase
      .from('usuarios_estabelecimento')
      .delete()
      .eq('id', id)
    if (error) {
      console.error('Erro ao excluir usuário:', error)
      throw new Error(`Falha ao excluir usuário: ${error.message}`)
    }
  },

  async resetarSenha(id: string, novaSenha: string): Promise<void> {
    // Validação de senha
    if (!novaSenha || novaSenha.length < 6) {
      throw new Error('A senha deve ter no mínimo 6 caracteres')
    }

    // Primeiro busca o user_id do usuário para resetar a senha no Auth
    const { data: usuario, error: erroUsuario } = await supabase
      .from('usuarios_estabelecimento')
      .select('user_id')
      .eq('id', id)
      .single()

    if (erroUsuario || !usuario) {
      console.error('Erro ao buscar usuário:', erroUsuario)
      throw new Error('Usuário não encontrado')
    }

    // Delegar reset de senha para Edge Function (service role)
    // A função deve usar updateUserById do Auth Admin API
    const { error } = await supabase.functions.invoke('resetar-senha-usuario', {
      body: {
        user_id: usuario.user_id,
        nova_senha: novaSenha,
      },
    })

    if (error) {
      console.error('Erro ao resetar senha (Edge Function resetar-senha-usuario):', error)
      throw new Error(
        'Falha ao resetar senha. Verifique se a Edge Function "resetar-senha-usuario" está implantada com a service role.'
      )
    }
  },
}

export default usuarioService
