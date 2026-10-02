import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronUp } from 'lucide-react'

/**
 * Props do componente BotaoVoltarTopo
 */
interface BotaoVoltarTopoProps {
  /** Distância de scroll (em pixels) para mostrar o botão */
  limiteScroll?: number
}

/**
 * Botão flutuante para voltar ao topo da página
 * Aparece automaticamente após o usuário rolar a página
 * 
 * @example
 * <BotaoVoltarTopo limiteScroll={300} />
 */
export default function BotaoVoltarTopo({ limiteScroll = 300 }: BotaoVoltarTopoProps) {
  const [mostrar, setMostrar] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      setMostrar(scrollTop > limiteScroll)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [limiteScroll])

  const voltarAoTopo = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  if (!mostrar) {
    return null
  }

  return (
    <Button
      onClick={voltarAoTopo}
      className="fixed bottom-4  right-2 z-50 rounded-full w-10 h-10 p-0 shadow-lg bg-primary hover:bg-primary-hover md:bottom-4"
      aria-label="Voltar ao topo"
    >
      <ChevronUp className="h-5 w-5" />
    </Button>
  )
}
