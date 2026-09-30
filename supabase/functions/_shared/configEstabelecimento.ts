import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Lê uma chave de `configuracoes` de UM estabelecimento.
 *
 * Toda leitura de configuração com service_role precisa passar por aqui:
 * sem o filtro por estabelecimento, a consulta devolve a configuração de
 * qualquer cliente do SaaS (ex.: o token do Mercado Pago de outro cliente).
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
