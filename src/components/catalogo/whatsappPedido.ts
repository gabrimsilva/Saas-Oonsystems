import { formatarReais } from "./precos"
import { chaveLocalDoEstabelecimento } from "@/services/tenant"

export const FORMA_PAGAMENTO_LABEL: Record<string, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  cartao_debito: "Cartão de débito",
  cartao_credito: "Cartão de crédito",
  saldo_mercado_pago: "Saldo Mercado Pago",
}

export interface ResumoPedidoWhatsApp {
  codigo_pedido: string
  cliente_nome?: string | null
  tipo_venda?: string
  forma_pagamento: string
  /** false = pagamento na retirada/entrega */
  pagamento_online: boolean
  total: number
  observacoes?: string | null
  itens: Array<{ nome: string; quantidade: number; subtotal: number }>
}

/** Mensagem com o resumo do pedido que o cliente envia para a loja */
export function montarMensagemPedido(pedido: ResumoPedidoWhatsApp): string {
  const forma = FORMA_PAGAMENTO_LABEL[pedido.forma_pagamento] ?? pedido.forma_pagamento
  const linhas = [
    `Olá! Acabei de fazer o *pedido #${pedido.codigo_pedido}* pelo catálogo${pedido.tipo_venda === "atacado" ? " (Atacado)" : ""}.`,
    "",
    ...(pedido.cliente_nome ? [`*Cliente:* ${pedido.cliente_nome}`, ""] : []),
    "*Itens:*",
    ...pedido.itens.map(i => `• ${i.quantidade}x ${i.nome} — ${formatarReais(i.subtotal)}`),
    "",
    `*Total:* ${formatarReais(pedido.total)}`,
    `*Pagamento:* ${forma}${pedido.pagamento_online ? " (pago online)" : " (na retirada/entrega)"}`,
    ...(pedido.observacoes ? [`*Observações:* ${pedido.observacoes}`] : []),
  ]
  return linhas.join("\n")
}

/** Guarda o WhatsApp da loja para a página de status (que não carrega as configurações) */
export function salvarTelefoneLoja(estabelecimentoId: string, telefone: string) {
  try {
    if (telefone.trim()) localStorage.setItem(chaveLocalDoEstabelecimento("estabelecimento_telefone", estabelecimentoId), telefone)
  } catch {
    /* sem storage */
  }
}

export function lerTelefoneLoja(estabelecimentoId: string): string {
  try {
    return localStorage.getItem(chaveLocalDoEstabelecimento("estabelecimento_telefone", estabelecimentoId)) || ""
  } catch {
    return ""
  }
}

/** Link wa.me para o WhatsApp da loja; null se o número não estiver configurado */
export function linkWhatsAppLoja(telefone: string, mensagem: string): string | null {
  let digitos = telefone.replace(/\D/g, "")
  if (digitos.startsWith("55") && digitos.length > 11) digitos = digitos.slice(2)
  if (digitos.length < 10) return null
  return `https://wa.me/55${digitos}?text=${encodeURIComponent(mensagem)}`
}
