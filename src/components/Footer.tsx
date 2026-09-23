import { Heart, ExternalLink } from "lucide-react"
import { useNavigate } from "react-router-dom"

interface FooterProps {
  nomeEstabelecimento?: string
}

export default function Footer({ nomeEstabelecimento = "Estabelecimento" }: FooterProps) {
  const anoAtual = new Date().getFullYear()
  const navigate = useNavigate()

  const handleLinkClick = (tipo: string) => {
    switch (tipo) {
      case 'privacidade':
        navigate('/politicas-privacidade')
        break
      case 'avaliar':
        navigate('/avaliar')
        break
      default:
        break
    }
  }

  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-0 pb-24 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Links principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 justify-items-center">
          <button
            onClick={() => handleLinkClick('privacidade')}
            className="text-gray-600 hover:text-red-600 text-sm font-medium transition-colors text-center flex items-center gap-1 justify-center py-2 md:py-0 cursor-pointer"
          >
            Políticas de Privacidade
            <ExternalLink className="h-3 w-3" />
          </button>

          <button
            onClick={() => handleLinkClick('avaliar')}
            className="text-gray-600 hover:text-red-600 text-sm font-medium transition-colors text-center flex items-center gap-1 justify-center py-2 md:py-0 cursor-pointer"
          >
            Avaliar Estabelecimento
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>

        {/* Divisor */}
        <div className="border-t border-gray-200 pt-6">
          {/* Direitos autorais e créditos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
            <div className="text-center md:text-left">
              <p>© {anoAtual} {nomeEstabelecimento}. Todos os direitos reservados.</p>
            </div>

            <div className="text-center md:text-right">
              <p className="flex items-center justify-center md:justify-end gap-1">
                Desenvolvido por{" "}
                <span className="font-medium text-gray-700">OonSystems</span>
                <Heart className="h-4 w-4 text-red-500 fill-current" />
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}