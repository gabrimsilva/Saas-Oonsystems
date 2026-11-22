/**
 * Nível de autenticação da sessão ("aal1" só senha, "aal2" senha + código do
 * app autenticador), lido do JWT. Use depois de validar o token com
 * auth.getUser: aqui só se lê a claim, sem conferir assinatura.
 */
export function nivelDaSessao(token: string): string {
  try {
    const parte = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(parte.padEnd(parte.length + ((4 - (parte.length % 4)) % 4), '=')))
    return String(payload.aal ?? '')
  } catch {
    return ''
  }
}

export const MENSAGEM_EXIGE_MFA = 'Confirme o código do app autenticador para acessar a administração da plataforma.'
