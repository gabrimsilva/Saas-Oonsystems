/**
 * Serviço da administração da plataforma (OonSystems).
 *
 * Opera sobre os clientes (tenants), planos, usuários dos clientes e o
 * histórico (auditoria). O admin da plataforma não tem acesso aos dados
 * internos dos clientes: a listagem traz só totais agregados.
 *
 * @module services/plataformaService
 */

import { supabase } from '@/lib/supabase'
import { mensagemErroEdgeFunction } from './edgeFunction'

export type StatusCliente = 'trial' | 'ativo' | 'suspenso' | 'cancelado'
export type CicloCobranca = 'mensal' | 'anual'

export interface ClientePlataforma {
  id: string
  documento: string
  tipo_pessoa: 'PF' | 'PJ'
  razao_social: string
  nome_fantasia: string | null
  slug: string
  email: string | null
  telefone: string | null
  cidade: string | null
  uf: string | null
  status: StatusCliente
  motivo_bloqueio: string | null
  origem: 'plataforma' | 'site'
  trial_ate: string | null
  plano_id: string | null
  plano_nome: string | null
  ciclo: CicloCobranca
  vigencia_ate: string | null
  observacoes: string | null
  criado_em: string
  qtd_estabelecimentos: number
  qtd_usuarios: number
  qtd_produtos: number
  ultimo_acesso: string | null
}

export interface Plano {
  id: string
  nome: string
  descricao: string | null
  preco_mensal: number
  preco_anual: number
  max_estabelecimentos: number | null
  max_usuarios: number | null
  ativo: boolean
  ordem: number
  modulos: string[]
}

export type DadosPlano = Omit<Plano, 'id'>

export interface UsuarioCliente {
  user_id: string
  nome: string
  email: string
  perfil: 'administrador_geral' | 'administrador_estabelecimento' | 'operador'
  ativo: boolean
  estabelecimento_nome: string
  criado_em: string
  ultimo_acesso: string | null
  email_confirmado: boolean
}

export interface RegistroAuditoria {
  id: number
  criado_em: string
  autor_id: string | null
  autor_email: string | null
  tenant_id: string | null
  tenant_nome: string | null
  acao: string
  detalhes: Record<string, unknown>
}

export interface FiltroAuditoria {
  tenantId?: string
  acao?: string
  de?: string
  ate?: string
  limite?: number
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

export type DadosCadastraisCliente = Pick<
  ClientePlataforma,
  'razao_social' | 'nome_fantasia' | 'email' | 'telefone' | 'cidade' | 'uf' | 'observacoes'
>

const DIA_MS = 24 * 60 * 60 * 1000

// ---------------------------------------------------------------------------
// Regras de exibição (puras, testadas em plataformaService.test.ts)
// ---------------------------------------------------------------------------

/** Teste vencido: status trial com prazo já passado (o cliente perdeu o acesso). */
export function testeExpirado(c: Pick<ClientePlataforma, 'status' | 'trial_ate'>, agora = Date.now()): boolean {
  return c.status === 'trial' && !!c.trial_ate && new Date(c.trial_ate).getTime() <= agora
}

/** Dias inteiros até uma data (negativo = já passou). */
export function diasAte(data: string | null, agora = Date.now()): number | null {
  if (!data) return null
  return Math.ceil((new Date(data).getTime() - agora) / DIA_MS)
}

/** Data que vale para o cliente: fim do teste (em teste) ou fim da vigência do plano. */
export function vencimentoDoCliente(c: Pick<ClientePlataforma, 'status' | 'trial_ate' | 'vigencia_ate'>) {
  if (c.status === 'trial') return { tipo: 'teste' as const, data: c.trial_ate }
  return { tipo: 'vigencia' as const, data: c.vigencia_ate }
}

/** Valor mensal equivalente do plano do cliente (anual dividido por 12). */
export function valorMensalDoCliente(c: Pick<ClientePlataforma, 'ciclo' | 'plano_id'>, planos: Plano[]): number {
  const plano = planos.find((p) => p.id === c.plano_id)
  if (!plano) return 0
  return c.ciclo === 'anual' ? Number(plano.preco_anual) / 12 : Number(plano.preco_mensal)
}

/** Status pagante: ativo com plano. */
export const ehPagante = (c: Pick<ClientePlataforma, 'status' | 'plano_id'>) => c.status === 'ativo' && !!c.plano_id

export type GravidadeAlerta = 'critico' | 'atencao' | 'info'

export interface AlertaCliente {
  tipo: string
  gravidade: GravidadeAlerta
  cliente: ClientePlataforma
  mensagem: string
}

/** Alertas da carteira: prazos, limites do plano, falta de uso. */
export function calcularAlertas(clientes: ClientePlataforma[], planos: Plano[], agora = Date.now()): AlertaCliente[] {
  const alertas: AlertaCliente[] = []
  const add = (tipo: string, gravidade: GravidadeAlerta, cliente: ClientePlataforma, mensagem: string) =>
    alertas.push({ tipo, gravidade, cliente, mensagem })

  for (const c of clientes) {
    if (c.status === 'cancelado') continue

    if (c.status === 'trial') {
      const dias = diasAte(c.trial_ate, agora)
      if (dias !== null && dias <= 0) add('teste_expirado', 'critico', c, 'Período de teste expirado: o cliente está sem acesso.')
      else if (dias !== null && dias <= 3) add('teste_expirando', 'atencao', c, `Teste termina em ${dias} dia(s).`)
    }

    if (c.status === 'ativo') {
      const dias = diasAte(c.vigencia_ate, agora)
      if (!c.plano_id) add('sem_plano', 'info', c, 'Cliente ativo sem plano definido.')
      if (dias !== null && dias < 0) add('vigencia_vencida', 'critico', c, `Vigência venceu há ${-dias} dia(s).`)
      else if (dias !== null && dias <= 7) add('vigencia_vencendo', 'atencao', c, `Vigência vence em ${dias} dia(s).`)
    }

    if (c.status === 'suspenso') {
      add('bloqueado', 'info', c, c.motivo_bloqueio ? `Bloqueado: ${c.motivo_bloqueio}` : 'Cliente bloqueado.')
    }

    const plano = planos.find((p) => p.id === c.plano_id)
    if (plano?.max_usuarios && c.qtd_usuarios > plano.max_usuarios) {
      add('limite_usuarios', 'atencao', c, `${c.qtd_usuarios} usuários para limite de ${plano.max_usuarios} do plano ${plano.nome}.`)
    }
    if (plano?.max_estabelecimentos && c.qtd_estabelecimentos > plano.max_estabelecimentos) {
      add('limite_estabelecimentos', 'atencao', c,
        `${c.qtd_estabelecimentos} estabelecimentos para limite de ${plano.max_estabelecimentos} do plano ${plano.nome}.`)
    }

    if (c.status === 'ativo' || (c.status === 'trial' && !testeExpirado(c, agora))) {
      const semUso = c.ultimo_acesso ? -(diasAte(c.ultimo_acesso, agora) ?? 0) : null
      if (semUso === null) add('nunca_acessou', 'info', c, 'Nenhum usuário acessou o sistema ainda.')
      else if (semUso >= 15) add('sem_acesso', 'info', c, `Sem acesso há ${semUso} dias.`)
    }
  }

  const peso: Record<GravidadeAlerta, number> = { critico: 0, atencao: 1, info: 2 }
  return alertas.sort((a, b) => peso[a.gravidade] - peso[b.gravidade])
}

/** Nova data de vigência ao renovar: soma um ciclo a partir do fim atual (ou de hoje, se já venceu). */
export function proximaVigencia(vigenciaAtual: string | null, ciclo: CicloCobranca, agora = new Date()): Date {
  const base = vigenciaAtual && new Date(vigenciaAtual) > agora ? new Date(vigenciaAtual) : new Date(agora)
  const nova = new Date(base)
  if (ciclo === 'anual') nova.setFullYear(nova.getFullYear() + 1)
  else nova.setMonth(nova.getMonth() + 1)
  return nova
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

export const nomeDoCliente = (c: Pick<ClientePlataforma, 'nome_fantasia' | 'razao_social'>) =>
  c.nome_fantasia || c.razao_social

// ---------------------------------------------------------------------------
// Autocadastro
// ---------------------------------------------------------------------------

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

async function acaoPlataforma(body: Record<string, unknown>, padrao: string): Promise<void> {
  const { error } = await supabase.functions.invoke('plataforma-clientes', { body })
  if (error) {
    console.error(`Erro na ação ${String(body.action)}:`, error)
    throw new Error(await mensagemErroEdgeFunction(error, padrao))
  }
}

function falha(contexto: string, error: { message: string }): never {
  console.error(contexto, error)
  throw new Error(`${contexto}: ${error.message}`)
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

  // ------------------------------------------------------------- clientes
  async listarClientes(): Promise<ClientePlataforma[]> {
    const { data, error } = await supabase.rpc('plataforma_listar_clientes')
    if (error) falha('Falha ao listar clientes', error)
    return ((data ?? []) as ClientePlataforma[]).map((c) => ({
      ...c,
      qtd_estabelecimentos: Number(c.qtd_estabelecimentos) || 0,
      qtd_usuarios: Number(c.qtd_usuarios) || 0,
      qtd_produtos: Number(c.qtd_produtos) || 0,
    }))
  },

  /** Cadastra o cliente (com o 1º estabelecimento e o admin) e devolve o id. */
  async criarCliente(dados: NovoCliente): Promise<string> {
    const { data, error } = await supabase.functions.invoke('plataforma-criar-cliente', { body: dados })
    if (error) {
      console.error('Erro ao cadastrar cliente:', error)
      throw new Error(await mensagemErroEdgeFunction(error, 'Falha ao cadastrar o cliente'))
    }
    return String(data?.tenant_id ?? '')
  },

  async atualizarCliente(id: string, dados: Partial<DadosCadastraisCliente>): Promise<void> {
    // undefined = não altera; vazio = limpa o campo
    const limpar = (v: string | null | undefined, ajuste: (s: string) => string = (s) => s) =>
      v === undefined ? undefined : v?.trim() ? ajuste(v.trim()) : null
    const { error } = await supabase
      .from('tenants')
      .update({
        razao_social: dados.razao_social?.trim(),
        nome_fantasia: limpar(dados.nome_fantasia),
        email: limpar(dados.email, (s) => s.toLowerCase()),
        telefone: limpar(dados.telefone),
        cidade: limpar(dados.cidade),
        uf: limpar(dados.uf, (s) => s.toUpperCase()),
        observacoes: limpar(dados.observacoes),
      })
      .eq('id', id)
    if (error) falha('Falha ao salvar o cliente', error)
  },

  /** Estende o teste em `dias` a partir de hoje (ou do prazo atual, se ainda não venceu). */
  async estenderTeste(cliente: Pick<ClientePlataforma, 'id' | 'trial_ate'>, dias: number): Promise<void> {
    const base = Math.max(Date.now(), cliente.trial_ate ? new Date(cliente.trial_ate).getTime() : 0)
    const novoPrazo = new Date(base + dias * DIA_MS).toISOString()
    const { error } = await supabase
      .from('tenants')
      .update({ status: 'trial', trial_ate: novoPrazo })
      .eq('id', cliente.id)
    if (error) falha('Falha ao estender o teste', error)
  },

  /** Coloca o cliente em teste até a data informada. */
  async definirFimDoTeste(id: string, trialAte: string): Promise<void> {
    const { error } = await supabase.from('tenants').update({ status: 'trial', trial_ate: trialAte }).eq('id', id)
    if (error) falha('Falha ao alterar o teste', error)
  },

  async definirVigencia(id: string, vigenciaAte: string | null): Promise<void> {
    const { error } = await supabase.from('tenants').update({ vigencia_ate: vigenciaAte }).eq('id', id)
    if (error) falha('Falha ao alterar a vigência', error)
  },

  /** Troca plano/ciclo/vigência; com `aplicarModulos` os módulos do cliente passam a ser os do plano. */
  async definirPlano(
    id: string,
    planoId: string | null,
    ciclo: CicloCobranca,
    vigenciaAte: string | null,
    aplicarModulos = true,
  ): Promise<void> {
    const { error } = await supabase.rpc('plataforma_definir_plano', {
      p_tenant_id: id,
      p_plano_id: planoId,
      p_ciclo: ciclo,
      p_vigencia_ate: vigenciaAte,
      p_aplicar_modulos: aplicarModulos,
    })
    if (error) falha('Falha ao alterar o plano', error)
  },

  async definirStatus(id: string, status: StatusCliente, motivoBloqueio: string | null = null): Promise<void> {
    const { error } = await supabase
      .from('tenants')
      .update({ status, motivo_bloqueio: status === 'suspenso' ? motivoBloqueio : null })
      .eq('id', id)
    if (error) falha('Falha ao alterar status', error)
  },

  /** Exclui o cliente, todos os dados das lojas e os logins (irreversível). */
  async excluirCliente(id: string, confirmacao: string): Promise<void> {
    await acaoPlataforma({ action: 'excluir_cliente', tenant_id: id, confirmacao }, 'Falha ao excluir o cliente')
  },

  // ------------------------------------------------------------- usuários
  async listarUsuarios(tenantId: string): Promise<UsuarioCliente[]> {
    const { data, error } = await supabase.rpc('plataforma_listar_usuarios', { p_tenant_id: tenantId })
    if (error) falha('Falha ao listar usuários', error)
    return (data ?? []) as UsuarioCliente[]
  },

  async redefinirSenha(userId: string, novaSenha: string): Promise<void> {
    await acaoPlataforma({ action: 'redefinir_senha', user_id: userId, nova_senha: novaSenha }, 'Falha ao redefinir a senha')
  },

  async alterarAcessoUsuario(userId: string, ativo: boolean): Promise<void> {
    await acaoPlataforma({ action: 'alterar_acesso_usuario', user_id: userId, ativo }, 'Falha ao alterar o acesso')
  },

  // ---------------------------------------------------------------- planos
  async listarPlanos(): Promise<Plano[]> {
    const { data, error } = await supabase
      .from('planos')
      .select('*, plano_modulos(modulo)')
      .order('ordem')
      .order('nome')
    if (error) falha('Falha ao carregar planos', error)
    return (data ?? []).map(({ plano_modulos, ...p }: Record<string, unknown>) => ({
      ...(p as unknown as Plano),
      preco_mensal: Number(p.preco_mensal) || 0,
      preco_anual: Number(p.preco_anual) || 0,
      modulos: ((plano_modulos as Array<{ modulo: string }>) ?? []).map((m) => m.modulo),
    }))
  },

  async salvarPlano(dados: DadosPlano, id?: string): Promise<void> {
    const { modulos } = dados
    // Campos explícitos: o objeto da tela pode trazer id e relações carregadas
    const registro = {
      nome: dados.nome.trim(),
      descricao: dados.descricao?.trim() || null,
      preco_mensal: dados.preco_mensal,
      preco_anual: dados.preco_anual,
      max_estabelecimentos: dados.max_estabelecimentos,
      max_usuarios: dados.max_usuarios,
      ativo: dados.ativo,
      ordem: dados.ordem,
    }
    let planoId = id
    if (id) {
      const { error } = await supabase.from('planos').update(registro).eq('id', id)
      if (error) falha('Falha ao salvar o plano', error)
      const { error: errDel } = await supabase.from('plano_modulos').delete().eq('plano_id', id)
      if (errDel) falha('Falha ao salvar os módulos do plano', errDel)
    } else {
      const { data, error } = await supabase.from('planos').insert(registro).select('id').single()
      if (error) falha('Falha ao criar o plano', error)
      planoId = data.id
    }
    if (modulos.length > 0) {
      const { error } = await supabase
        .from('plano_modulos')
        .insert(modulos.map((modulo) => ({ plano_id: planoId, modulo })))
      if (error) falha('Falha ao salvar os módulos do plano', error)
    }
  },

  async excluirPlano(id: string): Promise<void> {
    const { error } = await supabase.from('planos').delete().eq('id', id)
    if (error) falha('Falha ao excluir o plano', error)
  },

  // ------------------------------------------------------------- auditoria
  async listarAuditoria(filtro: FiltroAuditoria = {}): Promise<RegistroAuditoria[]> {
    let query = supabase
      .from('plataforma_auditoria')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(filtro.limite ?? 300)
    if (filtro.tenantId) query = query.eq('tenant_id', filtro.tenantId)
    if (filtro.acao) query = query.eq('acao', filtro.acao)
    if (filtro.de) query = query.gte('criado_em', filtro.de)
    if (filtro.ate) query = query.lte('criado_em', filtro.ate)
    const { data, error } = await query
    if (error) falha('Falha ao carregar o histórico', error)
    return (data ?? []) as RegistroAuditoria[]
  },
}
