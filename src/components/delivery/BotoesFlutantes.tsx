import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { ChevronUp } from 'lucide-react'
import { configuracaoService } from "@/services"

/**
 * Props do componente BotoesFlutantes
 */
interface BotoesFlutantesProps {
  /** Distância de scroll (em pixels) para mostrar os botões */
  limiteScroll?: number
}

/**
 * Componente que gerencia os botões flutuantes (Voltar ao Topo e WhatsApp)
 * Posiciona os botões dinamicamente baseado no scroll da página
 * 
 * @example
 * <BotoesFlutantes limiteScroll={300} />
 */
export default function BotoesFlutantes({ limiteScroll = 300 }: BotoesFlutantesProps) {
  const [mostrarBotaoTopo, setMostrarBotaoTopo] = useState(false)
  const [whatsappNumero, setWhatsappNumero] = useState<string>('')

  useEffect(() => {
    carregarWhatsApp()
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      setMostrarBotaoTopo(scrollTop > limiteScroll)
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

  const voltarAoTopo = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
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

  return (
    <>
      {/* Botão WhatsApp */}
      {whatsappNumero && (
        <Button
          onClick={abrirWhatsApp}
          className={`
            fixed z-50 rounded-full w-12 h-12 p-0 shadow-lg 
            bg-success hover:bg-success/90
            transition-all duration-300
            ${mostrarBotaoTopo
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
      )}

      {/* Botão Voltar ao Topo */}
      {mostrarBotaoTopo && (
        <Button
          onClick={voltarAoTopo}
          className="fixed bottom-4 right-2 z-50 rounded-full w-12 h-12 p-0 shadow-lg bg-primary hover:bg-primary-hover md:bottom-4"
          aria-label="Voltar ao topo"
          title="Voltar ao topo"
        >
          <ChevronUp className="h-5 w-5" />
        </Button>
      )}
    </>
  )
}
