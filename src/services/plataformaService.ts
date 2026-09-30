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
  origem: 'plataforma' | 'site'
  trial_ate: string | null
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

/** Teste vencido: status trial com prazo já passado (o cliente perdeu o acesso). */
export function testeExpirado(c: Pick<ClientePlataforma, 'status' | 'trial_ate'>): boolean {
  return c.status === 'trial' && !!c.trial_ate && new Date(c.trial_ate).getTime() <= Date.now()
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

export interface AutoCadastro {
  documento: string
  razao_social: string
  nome_fantasia?: string
  admin_nome: string
  admin_email: string
  admin_senha: string
  /** Campo-isca contra robôs: deve ficar vazio */
  site?: string
}

/** Autocadastro pelo site: cria o cliente em teste com a primeira loja. */
export async function cadastrarClientePeloSite(dados: AutoCadastro): Promise<void> {
  const { error } = await supabase.functions.invoke('cadastro-cliente', { body: dados })
  if (error) {
    console.error('Erro no autocadastro:', error)
    throw new Error(await mensagemErroEdgeFunction(error, 'Não foi possível concluir o cadastro. Tente novamente.'))
  }
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

  /** Estende o teste em `dias` a partir de hoje (ou do prazo atual, se ainda não venceu). */
  async estenderTeste(cliente: Pick<ClientePlataforma, 'id' | 'trial_ate'>, dias: number): Promise<void> {
    const base = Math.max(Date.now(), cliente.trial_ate ? new Date(cliente.trial_ate).getTime() : 0)
    const novoPrazo = new Date(base + dias * 24 * 60 * 60 * 1000).toISOString()
    const { error } = await supabase
      .from('tenants')
      .update({ status: 'trial', trial_ate: novoPrazo })
      .eq('id', cliente.id)
    if (error) {
      console.error('Erro ao estender teste:', error)
      throw new Error(`Falha ao estender o teste: ${error.message}`)
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
