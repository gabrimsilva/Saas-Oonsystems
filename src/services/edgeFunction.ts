/**
 * Utilitários para chamadas de Edge Functions.
 *
 * @module services/edgeFunction
 */

/**
 * Extrai a mensagem de erro devolvida por uma Edge Function.
 *
 * Em respostas não-2xx, `supabase.functions.invoke` devolve um erro genérico
 * ("Edge Function returned a non-2xx status code"); a mensagem real fica no
 * corpo da resposta, em `error.context`.
 */
export async function mensagemErroEdgeFunction(error: unknown, padrao: string): Promise<string> {
  const contexto = (error as { context?: Response } | null)?.context
  if (contexto && typeof contexto.json === 'function') {
    try {
      const corpo = await contexto.json()
      if (typeof corpo?.error === 'string' && corpo.error) return corpo.error
    } catch {
      // corpo não é JSON — usa a mensagem padrão
    }
  }
  return padrao
}
