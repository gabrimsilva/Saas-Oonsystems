import { Info, ArrowLeft } from "lucide-react"
import LojaStatusBadge from "./LojaStatusBadge"

interface HeaderProps {
  nomeEstabelecimento: string
  logoUrl?: string
  bannerUrl?: string
  onMaisInformacoes: () => void
  showBackButton?: boolean
  onBack?: () => void
  showInfoButton?: boolean // Controla se mostra o botão "Mais informações"
}

export default function Header({
  nomeEstabelecimento,
  logoUrl,
  bannerUrl,
  onMaisInformacoes,
  showBackButton = false,
  onBack,
  showInfoButton = true
}: HeaderProps) {
  // Se não tem banner, usar fundo branco simples
  const temBanner = bannerUrl && bannerUrl.trim() !== ''
  
  return (
    <div
      className={`relative shadow-sm border-b overflow-hidden ${temBanner ? 'min-h-[200px]' : 'bg-card'}`}
      style={!temBanner ? {} : {
        background: 'var(--muted)'
      }}
    >
      {/* Banner como fundo - usa o configurado ou o fallback */}
      {temBanner && (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center">
          <div className="w-full h-full" style={{ maxWidth: '1550px' }}>
            <img
              src={bannerUrl}
              alt="Banner do estabelecimento"
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        </div>
      )}

      {/* Content Section - sobreposto ao banner */}
      <div className={`relative z-10 max-w-7xl mx-auto px-4 flex flex-col items-center justify-center ${temBanner ? 'py-6 min-h-[200px]' : 'py-4'}`}>
        {/* Botão de voltar */}
        {showBackButton && onBack && (
          <button
            onClick={onBack}
            className="absolute top-4 left-4 flex items-center gap-2 text-white bg-primary hover:bg-primary-hover px-3 py-2 rounded-xl transition-all cursor-pointer shadow-md"
            title="Voltar"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Voltar</span>
          </button>
        )}

        {/* Badge de status da loja */}
        <div className="absolute top-4 right-4">
          <LojaStatusBadge className="bg-card bg-opacity-95 shadow-sm" />
        </div>

        {/* Logo */}
        <div className="flex items-center justify-center mb-3">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center overflow-hidden shadow-lg ring-4 ring-opacity-50 ${temBanner ? 'bg-primary ring-white' : 'bg-card ring-gray-200'}`}>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={nomeEstabelecimento}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : (
              <span className="text-white text-2xl font-bold">
                {nomeEstabelecimento.charAt(0).toUpperCase()}
              </span>
            )}
            <span className={`text-white text-2xl font-bold ${logoUrl ? 'hidden' : ''}`}>
              {nomeEstabelecimento.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Nome do estabelecimento */}
        <div className={`inline-block px-6 py-2 rounded-xl shadow-md mb-3 ${temBanner ? 'bg-card bg-opacity-95' : 'bg-muted/50'}`}>
          <h1 className={`text-2xl font-bold text-center ${temBanner ? 'text-primary' : 'text-foreground'}`}>
            {nomeEstabelecimento}
          </h1>
        </div>

        {/* Botão "Mais informações" com fundo branco semi-transparente */}
        {showInfoButton && (
          <div className={`inline-block px-6 py-3 rounded-xl shadow-md ${temBanner ? 'bg-card bg-opacity-95' : 'bg-muted/50'}`}>
            <button
              onClick={onMaisInformacoes}
              className={`flex items-center gap-2 font-medium transition-colors cursor-pointer text-sm ${temBanner ? 'text-primary hover:text-primary-hover' : 'text-primary hover:text-primary-hover'}`}
            >
              <Info className="h-4 w-4" />
              <span>Mais informações</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
