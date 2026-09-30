/**
 * Edge Function: resetar-senha-usuario
 * 
 * Reseta a senha de um usuário usando a service role key do Supabase Auth.
 * Apenas Admin Geral ou Admin de Estabelecimento podem resetar senhas.
 * 
 * Body esperado:
 * {
 *   "user_id": "uuid-do-usuario-no-auth",
 *   "nova_senha": "senha-minimo-6-chars"
 * }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Criar cliente Supabase com service role (admin)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Verificar autenticação do usuário que está fazendo a requisição
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autenticado' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Buscar perfil do usuário autenticado
    const { data: perfilUsuario, error: perfilError } = await supabaseAdmin
      .from('usuarios_estabelecimento')
      .select('perfil, estabelecimento_id, tenant_id, tenants(status)')
      .eq('user_id', user.id)
      .eq('ativo', true)
      .single()

    const tenantAtivo = ['trial', 'ativo'].includes((perfilUsuario?.tenants as { status?: string } | null)?.status ?? '')

    if (perfilError || !perfilUsuario || !tenantAtivo) {
      return new Response(
        JSON.stringify({ error: 'Perfil de usuário não encontrado' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Verificar se tem permissão (apenas Admin Geral ou Admin de Estabelecimento)
    if (
      perfilUsuario.perfil !== 'administrador_geral' &&
      perfilUsuario.perfil !== 'administrador_estabelecimento'
    ) {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem resetar senhas' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Parse do body
    const { user_id, nova_senha } = await req.json()

    // Validações
    if (!user_id || !nova_senha) {
      return new Response(
        JSON.stringify({ error: 'user_id e nova_senha são obrigatórios' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (nova_senha.length < 6) {
      return new Response(
        JSON.stringify({ error: 'A senha deve ter no mínimo 6 caracteres' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Buscar o usuário alvo para validar permissões
    const { data: usuarioAlvo, error: usuarioAlvoError } = await supabaseAdmin
      .from('usuarios_estabelecimento')
      .select('perfil, estabelecimento_id, tenant_id')
      .eq('user_id', user_id)
      .single()

    // Usuário de outro cliente é tratado como inexistente (não revela que existe)
    if (usuarioAlvoError || !usuarioAlvo || usuarioAlvo.tenant_id !== perfilUsuario.tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Usuário alvo não encontrado' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Admin de Estabelecimento só pode resetar senha de usuários do próprio
    // estabelecimento, e nunca de um Admin Geral (seria tomar a conta dele)
    if (
      perfilUsuario.perfil === 'administrador_estabelecimento' &&
      (perfilUsuario.estabelecimento_id !== usuarioAlvo.estabelecimento_id ||
        usuarioAlvo.perfil === 'administrador_geral')
    ) {
      return new Response(
        JSON.stringify({ 
          error: 'Você só pode resetar senhas de usuários do seu estabelecimento' 
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Resetar senha usando Auth Admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { password: nova_senha }
    )

    if (updateError) {
      console.error('Erro ao resetar senha:', updateError)
      return new Response(
        JSON.stringify({ error: `Falha ao resetar senha: ${updateError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Senha resetada com sucesso' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Erro inesperado:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Erro interno do servidor' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
