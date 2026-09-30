import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Onboarding de cliente: cria o login do administrador no Auth e chama
 * plataforma_criar_cliente (tenant + 1º estabelecimento + vínculo) numa
 * operação só — se o cadastro no banco falhar, o login criado é removido.
 *
 * Usado pelo cadastro feito pela plataforma e pelo autocadastro do site.
 */

export interface DadosOnboarding {
  documento: string
  razaoSocial: string
  nomeFantasia: string | null
  slug?: string
  estabelecimentoNome?: string
  adminNome: string
  adminEmail: string
  adminSenha: string
  status: 'trial' | 'ativo'
  origem: 'plataforma' | 'site'
}

export type ResultadoOnboarding =
  | { ok: true; tenantId: string; slug: string; estabelecimentoSlug: string }
  | { ok: false; status: number; erro: string }

// Restrições do banco -> mensagens para a tela
const ERROS_CONHECIDOS: Array<[RegExp, string]> = [
  [/tenants_documento_valido/, 'CPF/CNPJ inválido.'],
  [/tenants_documento_unico/, 'Já existe um cadastro com este CPF/CNPJ.'],
  [/tenants_slug/, 'Já existe um cliente com este nome. Informe um nome fantasia diferente.'],
  [/estabelecimentos_slug_unico/, 'Já existe uma loja com este nome. Informe um nome fantasia diferente.'],
  [/já está vinculado/, 'Este email já está vinculado a um cliente.'],
]

export const gerarSlug = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

/** Validação dos campos obrigatórios; devolve a mensagem de erro ou null. */
export function validarOnboarding(d: DadosOnboarding): string | null {
  if (!d.documento || !d.razaoSocial || !d.adminNome || !d.adminEmail) {
    return 'Informe CPF/CNPJ, razão social, nome e email do administrador'
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.adminEmail)) {
    return 'Email inválido'
  }
  if (d.adminSenha.length < 8) {
    return 'A senha deve ter no mínimo 8 caracteres'
  }
  return null
}

export async function criarCliente(
  supabaseAdmin: SupabaseClient,
  d: DadosOnboarding,
): Promise<ResultadoOnboarding> {
  const erroValidacao = validarOnboarding(d)
  if (erroValidacao) return { ok: false, status: 400, erro: erroValidacao }

  const slug = gerarSlug(d.slug || d.nomeFantasia || d.razaoSocial)
  if (!slug) return { ok: false, status: 400, erro: 'Informe um nome válido para o cliente' }
  const estabelecimentoSlug = slug

  // 1. Login do administrador do cliente
  const { data: criado, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: d.adminEmail,
    password: d.adminSenha,
    email_confirm: true,
    user_metadata: { nome: d.adminNome },
  })
  if (authError || !criado.user) {
    const jaExiste = /already|registered|exists/i.test(authError?.message ?? '')
    return {
      ok: false,
      status: jaExiste ? 409 : 500,
      erro: jaExiste ? 'Já existe um login com este email.' : 'Falha ao criar o login do administrador',
    }
  }

  // 2. Tenant + estabelecimento + vínculo (transação única no banco)
  const { data: tenantId, error: rpcError } = await supabaseAdmin.rpc('plataforma_criar_cliente', {
    p_documento: d.documento,
    p_razao_social: d.razaoSocial,
    p_slug: slug,
    p_admin_email: d.adminEmail,
    p_admin_nome: d.adminNome,
    p_estabelecimento_nome: d.estabelecimentoNome || 'Matriz',
    p_estabelecimento_slug: estabelecimentoSlug,
    p_nome_fantasia: d.nomeFantasia,
    p_status: d.status,
    p_origem: d.origem,
  })

  if (rpcError || !tenantId) {
    await supabaseAdmin.auth.admin.deleteUser(criado.user.id)
    const detalhe = `${rpcError?.message ?? ''} ${rpcError?.details ?? ''}`
    const conhecido = ERROS_CONHECIDOS.find(([padrao]) => padrao.test(detalhe))
    console.error('Erro no onboarding do cliente:', rpcError)
    return {
      ok: false,
      status: conhecido ? 409 : 500,
      erro: conhecido?.[1] ?? 'Falha ao cadastrar o cliente',
    }
  }

  return { ok: true, tenantId: tenantId as string, slug, estabelecimentoSlug }
}
