// Edge function: assina os pedidos do QZ Tray (impressão direta na impressora).
//
// POST { dado: string } → { assinatura: base64 }
//
// O QZ Tray só imprime sem perguntar quando o pedido vem assinado pela chave do
// certificado que o computador confia. A chave privada fica só aqui, no secret
// QZ_PRIVATE_KEY (PEM PKCS#8); o certificado público vai no painel.
// Exige usuário logado (verify_jwt padrão do Supabase) e confere o usuário.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

let chaveCache: CryptoKey | null = null

async function chavePrivada(): Promise<CryptoKey> {
  if (chaveCache) return chaveCache
  const pem = Deno.env.get('QZ_PRIVATE_KEY') ?? ''
  const base64 = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '')
  if (!base64) throw new Error('QZ_PRIVATE_KEY não configurada')
  const der = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  chaveCache = await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-512' },
    false,
    ['sign'],
  )
  return chaveCache
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

  try {
    // O gateway já exige um JWT; aqui conferimos que é de um usuário de verdade
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      auth: { persistSession: false },
    })
    const { data: { user } } = await db.auth.getUser(token)
    if (!user) return json({ error: 'Não autenticado' }, 401)

    const body = await req.json().catch(() => null)
    const dado = typeof body?.dado === 'string' ? body.dado : ''
    if (!dado || dado.length > 20000) return json({ error: 'Dado inválido' }, 400)

    const assinatura = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', await chavePrivada(), new TextEncoder().encode(dado))
    const base64 = btoa(String.fromCharCode(...new Uint8Array(assinatura)))
    return json({ assinatura: base64 })
  } catch (e) {
    console.error('Erro ao assinar', e)
    return json({ error: 'Não foi possível assinar a impressão' }, 500)
  }
})
