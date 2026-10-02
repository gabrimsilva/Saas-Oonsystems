import { Button } from "@/components/ui/button"
import { MessageCircle } from "lucide-react"
import { type PedidoSupabase } from "@/services"
import { createWhatsAppUrl, openWhatsApp } from "@/lib/whatsapp"
import toast from "react-hot-toast"

interface NotificarClienteWhatsAppProps {
  pedido: PedidoSupabase
  compact?: boolean
}

export default function NotificarClienteWhatsApp({ 
  pedido, 
  compact = false 
}: NotificarClienteWhatsAppProps) {
  const handleNotificar = () => {
    try {
      // Extrai ID curto do pedido
      const idCurto = pedido.codigo_pedido || 
                      pedido.pedido_id.split('-').pop()?.slice(-4) || 
                      pedido.pedido_id.slice(-4)

      // Monta a mensagem baseada no tipo de entrega
      let mensagem = `Olá ${pedido.cliente_nome}! 👋\n\n`
      mensagem += `Seu pedido *#${idCurto}* está pronto! 🎉\n\n`

      if (pedido.entrega_domicilio) {
        // Mensagem para entrega
        mensagem += `🛵 *Saiu para entrega!*\n\n`
        mensagem += `Nosso entregador já está a caminho do seu endereço:\n`
        mensagem += `📍 ${pedido.cliente_endereco}, ${pedido.cliente_numero}`
        
        if (pedido.cliente_complemento) {
          mensagem += ` - ${pedido.cliente_complemento}`
        }
        
        mensagem += `\n${pedido.cliente_bairro} - ${pedido.cliente_cidade}/${pedido.cliente_estado}\n\n`
        
        if (pedido.previsao_entrega) {
          mensagem += `⏰ Previsão de chegada: ${pedido.previsao_entrega}\n\n`
        }
        
        mensagem += `Aguarde na porta, por favor! 😊`
      } else {
        // Mensagem para retirada
        mensagem += `🏪 *Pronto para retirada!*\n\n`
        mensagem += `Seu pedido está prontinho e te esperando aqui! 😊\n\n`
        mensagem += `Pode vir buscar quando quiser!\n\n`
        mensagem += `Até já! 👋`
      }

      // Adiciona informações de pagamento se necessário
      if (pedido.forma_pagamento === 'dinheiro' && pedido.precisa_troco && pedido.valor_troco) {
        mensagem += `\n\n💰 *Lembre-se:* Troco para R$ ${pedido.valor_troco.toFixed(2).replace('.', ',')}`
      }

      // Cria URL do WhatsApp e abre
      const url = createWhatsAppUrl(pedido.cliente_telefone, mensagem)
      openWhatsApp(url)

      toast.success("WhatsApp aberto! Mensagem pronta para enviar ao cliente")
    } catch (error) {
      console.error('Erro ao abrir WhatsApp:', error)
      toast.error("Erro ao abrir WhatsApp. Verifique se o número do cliente está correto")
    }
  }

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleNotificar}
        className="h-6 w-6 p-0 hover:bg-success/10 hover:text-success flex-shrink-0"
        title="Notificar cliente via WhatsApp"
      >
        <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleNotificar}
      className="flex items-center gap-1.5 sm:gap-2 hover:bg-success/10 hover:text-success hover:border-success h-7 sm:h-8 text-xs sm:text-sm"
    >
      <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      <span className="hidden sm:inline">Notificar Cliente</span>
      <span className="sm:hidden">WhatsApp</span>
    </Button>
  )
}
