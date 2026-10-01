import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Lê uma chave de `configuracoes` de UM estabelecimento.
 *
 * Toda leitura de configuração com service_role precisa passar por aqui:
 * sem o filtro por estabelecimento, a consulta devolve a configuração de
 * qualquer cliente do SaaS.
 */
export async function lerConfig(
  supabase: SupabaseClient,
  estabelecimentoId: string,
  chave: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('configuracoes')
    .select('valor')
    .eq('estabelecimento_id', estabelecimentoId)
    .eq('chave', chave)
    .maybeSingle()

  if (error) {
    console.error(`Erro ao ler configuração "${chave}":`, error)
    return null
  }
  return data?.valor || null
}

export interface CredenciaisMercadoPago {
  accessToken: string | null
  webhookSecret: string | null
  ambiente: 'teste' | 'producao'
}

/**
 * Credenciais do Mercado Pago de UM estabelecimento (tabela
 * `config_loja_online`, cujas colunas secretas só o service_role lê).
 */
export async function lerCredenciaisMercadoPago(
  supabase: SupabaseClient,
  estabelecimentoId: string,
): Promise<CredenciaisMercadoPago> {
  const { data, error } = await supabase
    .from('config_loja_online')
    .select('access_token, webhook_secret, ambiente')
    .eq('estabelecimento_id', estabelecimentoId)
    .maybeSingle()

  if (error) {
    console.error('Erro ao ler credenciais do Mercado Pago:', error)
  }
  return {
    accessToken: data?.access_token || null,
    webhookSecret: data?.webhook_secret || null,
    ambiente: data?.ambiente === 'teste' ? 'teste' : 'producao',
  }
}
