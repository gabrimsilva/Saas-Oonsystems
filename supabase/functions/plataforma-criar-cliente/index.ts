import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Onboarding de um novo cliente pela administração da plataforma.
 *
 * Cria o login do administrador do cliente no Auth e chama
 * plataforma_criar_cliente (tenant + 1º estabelecimento + vínculo), numa
 * operação só: se o cadastro no banco falhar, o login criado é removido.
 * Só pode ser chamada por um usuário presente em plataforma_admins.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const jsonResponse = (payload: unknown, status: number) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

// Restrições do banco -> mensagens para a tela
const ERROS_CONHECIDOS: Array<[RegExp, string]> = [
  [/tenants_documento_valido/, 'CPF/CNPJ inválido.'],
  [/tenants_documento_unico/, 'Já existe um cliente com este CPF/CNPJ.'],
  [/tenants_slug/, 'Identificador (slug) do cliente já está em uso ou é inválido.'],
  [/estabelecimentos_slug_unico/, 'Identificador (slug) do estabelecimento já está em uso.'],
  [/já está vinculado/, 'Este email já está vinculado a um cliente.'],
]

const gerarSlug = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  // Quem chama precisa ser admin da plataforma
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  const { data: { user: chamador } } = await supabaseAdmin.auth.getUser(token)
  if (!chamador) {
    return jsonResponse({ error: 'Não autenticado' }, 401)
  }
  const { data: adminPlataforma } = await supabaseAdmin
    .from('plataforma_admins')
    .select('user_id')
    .eq('user_id', chamador.id)
    .maybeSingle()
  if (!adminPlataforma) {
    return jsonResponse({ error: 'Acesso restrito à administração da plataforma' }, 403)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Body inválido' }, 400)
  }

  const documento = String(body.documento ?? '').trim()
  const razaoSocial = String(body.razao_social ?? '').trim()
  const nomeFantasia = String(body.nome_fantasia ?? '').trim() || null
  const slug = gerarSlug(String(body.slug ?? '') || nomeFantasia || razaoSocial)
  const estabelecimentoNome = String(body.estabelecimento_nome ?? '').trim() || 'Matriz'
  const estabelecimentoSlug = gerarSlug(String(body.estabelecimento_slug ?? '')) || slug
  const adminNome = String(body.admin_nome ?? '').trim()
  const adminEmail = String(body.admin_email ?? '').trim().toLowerCase()
  const adminSenha = String(body.admin_senha ?? '')
  const status = body.status === 'ativo' ? 'ativo' : 'trial'

  if (!documento || !razaoSocial || !slug || !adminNome || !adminEmail || adminSenha.length < 8) {
    return jsonResponse({
      error: 'Informe CPF/CNPJ, razão social, nome e email do administrador e uma senha com no mínimo 8 caracteres',
    }, 400)
  }

  // 1. Login do administrador do cliente
  const { data: criado, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: adminEmail,
    password: adminSenha,
    email_confirm: true,
    user_metadata: { nome: adminNome },
  })
  if (authError || !criado.user) {
    const jaExiste = /already|registered|exists/i.test(authError?.message ?? '')
    return jsonResponse(
      { error: jaExiste ? 'Já existe um login com este email.' : 'Falha ao criar o login do administrador' },
      jaExiste ? 409 : 500,
    )
  }

  // 2. Tenant + estabelecimento + vínculo (transação única no banco)
  const { data: tenantId, error: rpcError } = await supabaseAdmin.rpc('plataforma_criar_cliente', {
    p_documento: documento,
    p_razao_social: razaoSocial,
    p_slug: slug,
    p_admin_email: adminEmail,
    p_admin_nome: adminNome,
    p_estabelecimento_nome: estabelecimentoNome,
    p_estabelecimento_slug: estabelecimentoSlug,
    p_nome_fantasia: nomeFantasia,
    p_status: status,
  })

  if (rpcError || !tenantId) {
    await supabaseAdmin.auth.admin.deleteUser(criado.user.id)
    const detalhe = `${rpcError?.message ?? ''} ${rpcError?.details ?? ''}`
    const conhecido = ERROS_CONHECIDOS.find(([padrao]) => padrao.test(detalhe))
    console.error('Erro no onboarding do cliente:', rpcError)
    return jsonResponse({ error: conhecido?.[1] ?? 'Falha ao cadastrar o cliente' }, conhecido ? 409 : 500)
  }

  return jsonResponse({ tenant_id: tenantId, slug, estabelecimento_slug: estabelecimentoSlug }, 200)
})
