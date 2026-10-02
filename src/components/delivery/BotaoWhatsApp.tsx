import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { configuracaoService } from "@/services"

/**
 * Props do componente BotaoWhatsApp
 */
interface BotaoWhatsAppProps {
  /** Se o botão de voltar ao topo está visível */
  botaoTopoVisivel?: boolean
  /** Distância de scroll (em pixels) para mostrar o botão */
  limiteScroll?: number
}

/**
 * Botão flutuante para contato via WhatsApp
 * Posiciona-se dinamicamente baseado na visibilidade do botão de voltar ao topo
 * 
 * @example
 * <BotaoWhatsApp botaoTopoVisivel={false} />
 */
export default function BotaoWhatsApp({ botaoTopoVisivel = false, limiteScroll = 300 }: BotaoWhatsAppProps) {
  const [whatsappNumero, setWhatsappNumero] = useState<string>('')
  const [mostrar, setMostrar] = useState(false)

  useEffect(() => {
    carregarWhatsApp()
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      setMostrar(scrollTop > limiteScroll)
    }

    window.addEventListener('scroll', handleScroll)
    // Verificar posição inicial
    handleScroll()
    
    return () => window.removeEventListener('scroll', handleScroll)
  }, [limiteScroll])

  const carregarWhatsApp = async () => {
    try {
      const config = await configuracaoService.buscarPorChave('whatsapp_loja')
      if (config?.valor) {
        // Remover formatação e manter apenas números
        const numeroLimpo = config.valor.replace(/\D/g, '')
        setWhatsappNumero(numeroLimpo)
      }
    } catch (error) {
      console.error('Erro ao carregar WhatsApp:', error)
    }
  }

  const abrirWhatsApp = () => {
    if (!whatsappNumero) {
      toast.error('WhatsApp não configurado')
      return
    }

    const mensagem = encodeURIComponent('Olá! Gostaria de fazer um pedido.')
    const url = `https://wa.me/${whatsappNumero}?text=${mensagem}`
    window.open(url, '_blank')
  }

  // Não mostrar se não tiver WhatsApp configurado
  if (!whatsappNumero) {
    return null
  }

  return (
    <Button
      onClick={abrirWhatsApp}
      className={`
        fixed z-50 rounded-full w-12 h-12 p-0 shadow-lg 
        bg-success hover:bg-success/90
        transition-all duration-300
        ${botaoTopoVisivel && mostrar
          ? 'bottom-20 right-2 md:bottom-4 md:right-16' // Mobile: acima do botão | Desktop: ao lado
          : 'bottom-4 right-2' // Posição padrão quando botão de topo não está visível
        }
      `}
      aria-label="Contato via WhatsApp"
      title="Fale conosco no WhatsApp"
    >
      <img 
        src="/whatsapp.svg" 
        alt="WhatsApp" 
        className="h-7 w-7 brightness-0 invert"
      />
    </Button>
  )
}
