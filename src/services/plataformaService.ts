/**
 * Serviço da administração da plataforma (OonSystems).
 *
 * Opera sobre os clientes (tenants). O admin da plataforma não tem acesso aos
 * dados internos dos clientes: a listagem traz só totais agregados.
 *
 * @module services/plataformaService
 */

import { supabase } from '@/lib/supabase'
import { mensagemErroEdgeFunction } from './edgeFunction'

export type StatusCliente = 'trial' | 'ativo' | 'suspenso' | 'cancelado'

export interface ClientePlataforma {
  id: string
  documento: string
  tipo_pessoa: 'PF' | 'PJ'
  razao_social: string
  nome_fantasia: string | null
  slug: string
  email: string | null
  status: StatusCliente
  criado_em: string
  qtd_estabelecimentos: number
  qtd_usuarios: number
}

export interface NovoCliente {
  documento: string
  razao_social: string
  nome_fantasia?: string
  slug?: string
  estabelecimento_nome?: string
  admin_nome: string
  admin_email: string
  admin_senha: string
  status?: 'trial' | 'ativo'
}

/** Formata CPF (000.000.000-00) ou CNPJ, inclusive alfanumérico (XX.XXX.XXX/XXXX-00). */
export function formatarDocumento(documento: string): string {
  if (documento.length === 11) {
    return documento.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
  }
  if (documento.length === 14) {
    return documento.replace(/^(.{2})(.{3})(.{3})(.{4})(.{2})$/, '$1.$2.$3/$4-$5')
  }
  return documento
}

export const plataformaService = {
  /** Indica se o usuário logado administra a plataforma. */
  async ehAdminPlataforma(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { data } = await supabase
      .from('plataforma_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
    return !!data
  },

  async listarClientes(): Promise<ClientePlataforma[]> {
    const { data, error } = await supabase.rpc('plataforma_listar_clientes')
    if (error) {
      console.error('Erro ao listar clientes:', error)
      throw new Error(`Falha ao listar clientes: ${error.message}`)
    }
    return (data ?? []) as ClientePlataforma[]
  },

  async criarCliente(dados: NovoCliente): Promise<void> {
    const { error } = await supabase.functions.invoke('plataforma-criar-cliente', { body: dados })
    if (error) {
      console.error('Erro ao cadastrar cliente:', error)
      throw new Error(await mensagemErroEdgeFunction(error, 'Falha ao cadastrar o cliente'))
    }
  },

  async definirStatus(id: string, status: StatusCliente): Promise<void> {
    const { error } = await supabase.from('tenants').update({ status }).eq('id', id)
    if (error) {
      console.error('Erro ao alterar status do cliente:', error)
      throw new Error(`Falha ao alterar status: ${error.message}`)
    }
  },
}
