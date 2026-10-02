/**
 * Utilitários para formatação e exibição de status de pedidos
 * 
 * Nota: A função getStatusIcon está no componente StatusTimeline.tsx
 * pois requer JSX/React imports
 */

/**
 * Converte status genérico para status exibição
 * Ex: "Liberado" → "Saiu para entrega" (se delivery)
 */
export function getStatusExibicao(status: string, entregaDomicilio?: boolean): string {
  if (status === 'Liberado') {
    return entregaDomicilio !== false ? 'Saiu para entrega' : 'Pronto para retirada'
  }
  if (status === 'Finalizado') {
    return entregaDomicilio !== false ? 'Entregue' : 'Retirado'
  }
  return status
}

/**
 * Retorna cor do badge de status (classe Tailwind)
 */
export function getStatusColor(status: string, entregaDomicilio?: boolean): string {
  const statusExibicao = getStatusExibicao(status, entregaDomicilio)
  const statusLower = statusExibicao.toLowerCase()
  
  if (statusLower.includes('criado') || statusLower.includes('recebido')) return 'bg-primary'
  if (statusLower.includes('preparando') || statusLower.includes('cozinha')) return 'bg-warning'
  if (statusLower.includes('pronto') && statusLower.includes('retirada')) return 'bg-success'
  if (statusLower.includes('liberado')) return 'bg-success'
  if (statusLower.includes('entrega') || statusLower.includes('saiu')) return 'bg-teal-600'
  if (statusLower.includes('finalizado') || statusLower.includes('entregue') || statusLower.includes('retirado') || statusLower.includes('concluído')) return 'bg-success'
  if (statusLower.includes('cancelado')) return 'bg-destructive'
  
  return 'bg-gray-500'
}

/**
 * Formata data ISO para HH:mm
 */
export function formatarHora(dataISO: string): string {
  return new Date(dataISO).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Formata data ISO para dd/MM/yyyy
 */
export function formatarData(dataISO: string): string {
  return new Date(dataISO).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Formata forma de pagamento para exibição
 */
export function formatarFormaPagamento(forma: string): string {
  const formas: { [key: string]: string } = {
    'dinheiro': 'Dinheiro',
    'cartao_credito': 'Cartão de Crédito',
    'cartao_debito': 'Cartão de Débito',
    'cartaoCredito': 'Cartão de Crédito',
    'cartaoDebito': 'Cartão de Débito',
    'pix': 'PIX',
    'pixEntrega': 'PIX na Entrega',
    'pix_entrega': 'PIX na Entrega',
    'cartaoVR': 'Cartão VR',
    'cartao_vr': 'Cartão VR',
    'cartaoVA': 'Cartão VA',
    'cartao_va': 'Cartão VA',
    'ticketPromo': 'Ticket Promocional',
    'ticket_promo': 'Ticket Promocional'
  }
  return formas[forma] || forma
}
