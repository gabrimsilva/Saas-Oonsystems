/**
 * Dados da plataforma OonSystems exibidos aos clientes.
 *
 * @module config/plataforma
 */

/** WhatsApp da OonSystems (com DDI), para assinatura e pagamento da mensalidade. */
export const WHATSAPP_OONSYSTEMS = '5541991440115'

/** Link do WhatsApp da OonSystems com a mensagem já escrita. */
export function linkWhatsAppOonSystems(mensagem: string): string {
  return `https://wa.me/${WHATSAPP_OONSYSTEMS}?text=${encodeURIComponent(mensagem)}`
}

/** Mensagem de quem quer pagar a mensalidade ou assinar. */
export function mensagemPagamento(opcoes: { empresa?: string | null; vencimento?: string | null; assinar?: boolean }): string {
  const quem = opcoes.empresa ? `Sou da ${opcoes.empresa} e quero` : 'Quero'
  if (opcoes.assinar) return `Olá! ${quem} assinar o OonSystems.`
  const quando = opcoes.vencimento ? ` (vencimento ${opcoes.vencimento})` : ''
  return `Olá! ${quem} pagar a mensalidade do OonSystems${quando}.`
}

/** Contato genérico (assinatura/pagamento) quando não há dados da empresa. */
export const CONTATO_ASSINATURA = linkWhatsAppOonSystems('Olá! Quero falar sobre a assinatura do OonSystems.')
