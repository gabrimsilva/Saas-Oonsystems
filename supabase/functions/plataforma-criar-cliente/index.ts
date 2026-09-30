import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { criarCliente } from '../_shared/onboarding.ts'

/**
 * Onboarding de um novo cliente pela administração da plataforma.
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

  const resultado = await criarCliente(supabaseAdmin, {
    documento: String(body.documento ?? '').trim(),
    razaoSocial: String(body.razao_social ?? '').trim(),
    nomeFantasia: String(body.nome_fantasia ?? '').trim() || null,
    slug: String(body.slug ?? '').trim() || undefined,
    estabelecimentoNome: String(body.estabelecimento_nome ?? '').trim() || undefined,
    adminNome: String(body.admin_nome ?? '').trim(),
    adminEmail: String(body.admin_email ?? '').trim().toLowerCase(),
    adminSenha: String(body.admin_senha ?? ''),
    status: body.status === 'ativo' ? 'ativo' : 'trial',
    origem: 'plataforma',
  })

  if (!resultado.ok) {
    return jsonResponse({ error: resultado.erro }, resultado.status)
  }
  return jsonResponse({
    tenant_id: resultado.tenantId,
    slug: resultado.slug,
    estabelecimento_slug: resultado.estabelecimentoSlug,
  }, 200)
})
