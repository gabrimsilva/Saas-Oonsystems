import { useState, useEffect } from "react"
import { buscarConfiguracaoSegura, limparCache } from "@/lib/configService"
import CheckoutCardapioWhatsapp from "@/components/CheckoutCardapioWhatsapp"
import CheckoutStepByStep from "@/components/CheckoutStepByStep"

interface CheckoutWrapperProps {
  onNavigate: (page: 'delivery' | 'checkout') => void
}

const CheckoutWrapper = ({ onNavigate }: CheckoutWrapperProps) => {
  const [modoCardapioWhatsapp, setModoCardapioWhatsapp] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  const verificarConfiguracoes = async (forceReload = false) => {
    // Se forçar reload, limpar cache primeiro
    if (forceReload) {
      limparCache()
    }
    
    try {
      const configCardapio = await buscarConfiguracaoSegura('modo_cardapio_whatsapp')
      const modoCardapio = configCardapio?.valor === 'true'
      setModoCardapioWhatsapp(modoCardapio)
    } catch (error) {
      console.error('❌ Erro ao verificar configurações:', error)
      // Usar valores padrão em caso de erro
      setModoCardapioWhatsapp(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    verificarConfiguracoes()

    // Listener para mudanças nas configurações
    const handleConfigChange = () => {
      setLoading(true)
      verificarConfiguracoes(true)
    }

    // Escutar evento customizado de mudança de configuração
    window.addEventListener('configChanged', handleConfigChange)

    return () => {
      window.removeEventListener('configChanged', handleConfigChange)
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-warning mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando checkout...</p>
          <p className="mt-2 text-sm text-muted-foreground">
            WhatsApp: {modoCardapioWhatsapp ? 'ativo' : 'inativo'}
          </p>
        </div>
      </div>
    )
  }

  // Se modo cardápio com WhatsApp está ativado, usar checkout simplificado
  if (modoCardapioWhatsapp) {
    return (
      <>
        <CheckoutCardapioWhatsapp onNavigate={onNavigate} />
      </>
    )
  }

  // Caso contrário, usar checkout step-by-step
  return (
    <>
      <CheckoutStepByStep onNavigate={onNavigate} />
    </>
  )
}

export default CheckoutWrapper
