import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Ações da administração da plataforma que exigem service_role.
 * Só pode ser chamada por um usuário presente em plataforma_admins.
 *
 * POST { action: 'excluir_cliente', tenant_id, confirmacao }
 *   Apaga o cliente, todos os dados das lojas e os logins dos usuários dele.
 *   `confirmacao` precisa ser igual ao slug do cliente.
 * POST { action: 'redefinir_senha', user_id, nova_senha }
 * POST { action: 'alterar_acesso_usuario', user_id, ativo }
 *
 * Tudo fica registrado em plataforma_auditoria.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

class ErroRequisicao extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}

async function auditar(db: SupabaseClient, autorId: string, tenantId: string | null, acao: string, detalhes: Record<string, unknown>) {
  const { error } = await db.rpc('plataforma_registrar_auditoria', {
    p_autor_id: autorId,
    p_tenant_id: tenantId,
    p_acao: acao,
    p_detalhes: detalhes,
  })
  if (error) console.error('Falha ao registrar auditoria', acao, error)
}

/** Vínculo do usuário com um cliente (admins da plataforma não são gerenciados aqui) */
async function vinculoDoUsuario(db: SupabaseClient, userId: string) {
  if (!UUID_RE.test(userId)) throw new ErroRequisicao('Usuário inválido.')
  const { data, error } = await db
    .from('usuarios_estabelecimento')
    .select('user_id, tenant_id, nome, email')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new ErroRequisicao('Usuário não pertence a nenhum cliente.', 404)
  return data
}

async function excluirCliente(db: SupabaseClient, autorId: string, body: Record<string, unknown>) {
  const tenantId = String(body.tenant_id ?? '')
  if (!UUID_RE.test(tenantId)) throw new ErroRequisicao('Cliente inválido.')

  const { data: tenant, error } = await db.from('tenants').select('id, slug').eq('id', tenantId).maybeSingle()
  if (error) throw error
  if (!tenant) throw new ErroRequisicao('Cliente não encontrado.', 404)
  if (String(body.confirmacao ?? '').trim().toLowerCase() !== tenant.slug) {
    throw new ErroRequisicao('Confirmação não confere com o identificador do cliente.')
  }

  // Logins do cliente (apagados depois que os dados saírem do banco)
  const { data: vinculos, error: errVinculos } = await db
    .from('usuarios_estabelecimento')
    .select('user_id')
    .eq('tenant_id', tenantId)
  if (errVinculos) throw errVinculos

  const { error: errExcluir } = await db.rpc('plataforma_excluir_cliente', {
    p_tenant_id: tenantId,
    p_autor_id: autorId,
  })
  if (errExcluir) throw errExcluir

  const falhas: string[] = []
  for (const { user_id } of vinculos ?? []) {
    const { error: errAuth } = await db.auth.admin.deleteUser(user_id)
    if (errAuth) {
      console.error('Falha ao remover login', user_id, errAuth)
      falhas.push(user_id)
    }
  }
  if (falhas.length > 0) {
    await auditar(db, autorId, tenantId, 'logins_nao_removidos', { user_ids: falhas })
  }
  return jsonResponse({ ok: true, logins_removidos: (vinculos?.length ?? 0) - falhas.length, falhas: falhas.length })
}

async function redefinirSenha(db: SupabaseClient, autorId: string, body: Record<string, unknown>) {
  const vinculo = await vinculoDoUsuario(db, String(body.user_id ?? ''))
  const novaSenha = String(body.nova_senha ?? '')
  if (novaSenha.length < 8 || novaSenha.length > 72) {
    throw new ErroRequisicao('A senha deve ter entre 8 e 72 caracteres.')
  }
  const { error } = await db.auth.admin.updateUserById(vinculo.user_id, { password: novaSenha })
  if (error) throw new ErroRequisicao(`Não foi possível alterar a senha: ${error.message}`)
  await auditar(db, autorId, vinculo.tenant_id, 'senha_redefinida', { usuario: vinculo.email, nome: vinculo.nome })
  return jsonResponse({ ok: true })
}

async function alterarAcessoUsuario(db: SupabaseClient, autorId: string, body: Record<string, unknown>) {
  const vinculo = await vinculoDoUsuario(db, String(body.user_id ?? ''))
  const ativo = body.ativo === true
  const { error } = await db.from('usuarios_estabelecimento').update({ ativo }).eq('user_id', vinculo.user_id)
  // Sessões abertas perdem o acesso na hora: a RLS só aceita vínculo ativo
  if (error) throw error
  await auditar(db, autorId, vinculo.tenant_id, ativo ? 'usuario_liberado' : 'usuario_bloqueado', {
    usuario: vinculo.email,
    nome: vinculo.nome,
  })
  return jsonResponse({ ok: true })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') return jsonResponse({ error: 'Método não permitido' }, 405)

  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  // Quem chama precisa ser admin da plataforma
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  const { data: { user: chamador } } = await db.auth.getUser(token)
  if (!chamador) return jsonResponse({ error: 'Não autenticado' }, 401)
  const { data: adminPlataforma } = await db
    .from('plataforma_admins')
    .select('user_id')
    .eq('user_id', chamador.id)
    .maybeSingle()
  if (!adminPlataforma) return jsonResponse({ error: 'Acesso restrito à administração da plataforma' }, 403)

  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    switch (body.action) {
      case 'excluir_cliente':
        return await excluirCliente(db, chamador.id, body)
      case 'redefinir_senha':
        return await redefinirSenha(db, chamador.id, body)
      case 'alterar_acesso_usuario':
        return await alterarAcessoUsuario(db, chamador.id, body)
      default:
        return jsonResponse({ error: 'Ação inválida' }, 400)
    }
  } catch (e) {
    if (e instanceof ErroRequisicao) return jsonResponse({ error: e.message }, e.status)
    console.error('Erro inesperado', e)
    return jsonResponse({ error: 'Não foi possível concluir a ação. Tente novamente.' }, 500)
  }
})
