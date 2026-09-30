import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Cria um usuário do sistema: credencial no Auth + vínculo em
 * usuarios_estabelecimento (+ registro em funcionarios, quando informado).
 *
 * Substitui o signUp feito no navegador do admin (que trocava a sessão e
 * deixava o usuário sem vínculo, portanto sem acesso a nenhum dado).
 *
 * Regras:
 *  - quem chama: administrador ativo de um tenant ativo;
 *  - administrador_geral só é criado por administrador_geral;
 *  - administrador_estabelecimento só cria usuários no próprio estabelecimento;
 *  - o estabelecimento precisa ser do mesmo tenant de quem chama;
 *  - qualquer falha desfaz a credencial criada no Auth.
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

const PERFIS = ['administrador_geral', 'administrador_estabelecimento', 'operador']
const FUNCOES: Record<string, string> = {
  atendente: 'Atendente',
  garcom: 'Garçom',
  entregador: 'Entregador',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  // ---------------------------------------------------------------------------
  // Quem está chamando
  // ---------------------------------------------------------------------------
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  const { data: { user: chamador } } = await supabaseAdmin.auth.getUser(token)
  if (!chamador) {
    return jsonResponse({ error: 'Não autenticado' }, 401)
  }

  const { data: vinculoChamador } = await supabaseAdmin
    .from('usuarios_estabelecimento')
    .select('perfil, estabelecimento_id, tenant_id, tenants(status)')
    .eq('user_id', chamador.id)
    .eq('ativo', true)
    .maybeSingle()

  const tenantAtivo = ['trial', 'ativo'].includes(
    (vinculoChamador?.tenants as { status?: string } | null)?.status ?? '',
  )
  if (
    !vinculoChamador || !tenantAtivo ||
    !['administrador_geral', 'administrador_estabelecimento'].includes(vinculoChamador.perfil)
  ) {
    return jsonResponse({ error: 'Apenas administradores podem criar usuários' }, 403)
  }

  // ---------------------------------------------------------------------------
  // Dados do novo usuário
  // ---------------------------------------------------------------------------
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Body inválido' }, 400)
  }

  const nome = String(body.nome ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()
  const senha = String(body.senha ?? '')
  const perfil = String(body.perfil ?? '')
  const ativo = body.ativo !== false
  const estabelecimentoId = perfil === 'administrador_geral'
    ? null
    : (body.estabelecimento_id ? String(body.estabelecimento_id) : null)
  const funcionario = body.funcionario as { funcao?: string; telefone?: string } | undefined

  if (!nome || !email || senha.length < 6 || !PERFIS.includes(perfil)) {
    return jsonResponse({ error: 'Informe nome, email, senha (mín. 6 caracteres) e um perfil válido' }, 400)
  }
  if (perfil !== 'administrador_geral' && !estabelecimentoId) {
    return jsonResponse({ error: 'Perfis não-globais exigem um estabelecimento vinculado' }, 400)
  }
  if (funcionario && (!funcionario.funcao || !FUNCOES[funcionario.funcao] || !funcionario.telefone)) {
    return jsonResponse({ error: 'Funcionário exige função (atendente, garcom, entregador) e telefone' }, 400)
  }

  // ---------------------------------------------------------------------------
  // Autorização sobre o que está sendo criado
  // ---------------------------------------------------------------------------
  if (perfil === 'administrador_geral' && vinculoChamador.perfil !== 'administrador_geral') {
    return jsonResponse({ error: 'Apenas o administrador geral pode criar outro administrador geral' }, 403)
  }
  if (
    vinculoChamador.perfil === 'administrador_estabelecimento' &&
    estabelecimentoId !== vinculoChamador.estabelecimento_id
  ) {
    return jsonResponse({ error: 'Você só pode criar usuários no seu estabelecimento' }, 403)
  }
  if (estabelecimentoId) {
    const { data: estab } = await supabaseAdmin
      .from('estabelecimentos')
      .select('id')
      .eq('id', estabelecimentoId)
      .eq('tenant_id', vinculoChamador.tenant_id)
      .maybeSingle()
    if (!estab) {
      return jsonResponse({ error: 'Estabelecimento não encontrado' }, 404)
    }
  }

  // ---------------------------------------------------------------------------
  // Criação (com desfazer em caso de falha)
  // ---------------------------------------------------------------------------
  const { data: criado, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
  })
  if (authError || !criado.user) {
    const jaExiste = /already|registered|exists/i.test(authError?.message ?? '')
    return jsonResponse(
      { error: jaExiste ? 'Já existe um usuário com este email.' : 'Falha ao criar a credencial de acesso' },
      jaExiste ? 409 : 500,
    )
  }
  const novoUserId = criado.user.id

  const desfazer = async () => {
    await supabaseAdmin.from('funcionarios').delete().eq('user_id', novoUserId)
    // usuarios_estabelecimento cai junto (ON DELETE CASCADE em user_id)
    await supabaseAdmin.auth.admin.deleteUser(novoUserId)
  }

  const { data: vinculo, error: vinculoError } = await supabaseAdmin
    .from('usuarios_estabelecimento')
    .insert({
      user_id: novoUserId,
      tenant_id: vinculoChamador.tenant_id,
      nome,
      email,
      perfil,
      estabelecimento_id: estabelecimentoId,
      ativo,
    })
    .select()
    .single()

  if (vinculoError || !vinculo) {
    console.error('Erro ao vincular usuário:', vinculoError)
    await desfazer()
    return jsonResponse({ error: 'Falha ao vincular o usuário ao estabelecimento' }, 500)
  }

  if (funcionario) {
    const { error: funcError } = await supabaseAdmin
      .from('funcionarios')
      .insert({
        nome,
        funcao: funcionario.funcao,
        cargo: FUNCOES[funcionario.funcao!],
        telefone: funcionario.telefone,
        email,
        user_id: novoUserId,
        ativo,
        estabelecimento_id: estabelecimentoId,
      })

    if (funcError) {
      console.error('Erro ao criar funcionário:', funcError)
      await desfazer()
      const duplicado = funcError.code === '23505'
      return jsonResponse(
        { error: duplicado ? 'Já existe um funcionário com este email neste estabelecimento.' : 'Falha ao criar o funcionário' },
        duplicado ? 409 : 500,
      )
    }
  }

  return jsonResponse(vinculo, 200)
})
