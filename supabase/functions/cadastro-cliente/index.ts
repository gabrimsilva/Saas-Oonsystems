import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { criarCliente } from '../_shared/onboarding.ts'

/**
 * Autocadastro pelo site (/cadastro): cria o cliente em período de teste,
 * a primeira loja e o login do administrador.
 *
 * Endpoint público (chamado com a chave anon). Proteções atuais: CPF/CNPJ
 * válido e único (garantido no banco), email único no Auth e campo-isca
 * contra robôs simples. Captcha e confirmação de email ficam para quando
 * houver SMTP próprio configurado.
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
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido' }, 405)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Body inválido' }, 400)
  }

  // Campo-isca: invisível para pessoas, preenchido por robôs de formulário
  if (String(body.site ?? '').trim()) {
    return jsonResponse({ error: 'Cadastro não permitido' }, 400)
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const resultado = await criarCliente(supabaseAdmin, {
    documento: String(body.documento ?? '').trim(),
    razaoSocial: String(body.razao_social ?? '').trim(),
    nomeFantasia: String(body.nome_fantasia ?? '').trim() || null,
    adminNome: String(body.admin_nome ?? '').trim(),
    adminEmail: String(body.admin_email ?? '').trim().toLowerCase(),
    adminSenha: String(body.admin_senha ?? ''),
    // Autocadastro sempre entra em teste; slug e loja derivam do nome
    status: 'trial',
    origem: 'site',
  })

  if (!resultado.ok) {
    return jsonResponse({ error: resultado.erro }, resultado.status)
  }
  return jsonResponse({ slug: resultado.slug }, 200)
})
