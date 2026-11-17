import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Settings,
  Store,
  Clock,
  CreditCard,
  Palette,
  Printer,
  Bell,
  SwatchBook,
  ArrowLeft
} from "lucide-react"

// Importar as páginas de configuração
import ConfiguracoesGeraisPage from "@/pages/configuracoes/ConfiguracoesGeraisPage"
import ConfiguracoesHorarioPage from "@/pages/configuracoes/ConfiguracoesHorarioPage"
import ConfiguracoesPagamentoPage from "@/pages/configuracoes/ConfiguracoesPagamentoPage"
import ConfiguracoesVisuaisPage from "@/pages/configuracoes/ConfiguracoesVisuaisPage"
import ConfiguracoesImpressaoPage from "@/pages/configuracoes/ConfiguracoesImpressaoPage"
import ConfiguracoesNotificacaoPage from "@/pages/configuracoes/ConfiguracoesNotificacaoPage"
import ConfiguracoesTemaPage from "@/pages/configuracoes/ConfiguracoesTemaPage"
import { CabecalhoPagina } from '@/components/ui/feedback'

type ConfigPage =
  | 'index'
  | 'gerais'
  | 'horario'
  | 'pagamento'
  | 'visuais'
  | 'impressao'
  | 'notificacao'
  | 'tema'

interface ConfigCard {
  id: ConfigPage
  title: string
  description: string
  icon: React.ReactNode
  color: string
}

const configCards: ConfigCard[] = [
  {
    id: 'tema',
    title: 'Tema do sistema',
    description: 'Cores do painel para todas as lojas da empresa',
    icon: <SwatchBook className="h-6 w-6" />,
    color: 'text-primary'
  },
  {
    id: 'gerais',
    title: 'Loja',
    description: 'Nome, endereço, telefone e informações básicas',
    icon: <Store className="h-6 w-6" />,
    color: 'text-primary'
  },
  {
    id: 'pagamento',
    title: 'Pagamentos',
    description: 'Formas de pagamento e pedidos pela loja online',
    icon: <CreditCard className="h-6 w-6" />,
    color: 'text-primary'
  },
  {
    id: 'horario',
    title: 'Horário de Funcionamento',
    description: 'Dias e horários de atendimento',
    icon: <Clock className="h-6 w-6" />,
    color: 'text-warning-foreground'
  },
  {
    id: 'visuais',
    title: 'Aparência',
    description: 'Logo, cores e personalização visual',
    icon: <Palette className="h-6 w-6" />,
    color: 'text-primary'
  },
  {
    id: 'impressao',
    title: 'Impressão',
    description: 'Impressora térmica, impressão automática e tamanho das letras do cupom',
    icon: <Printer className="h-6 w-6" />,
    color: 'text-primary'
  },
  {
    id: 'notificacao',
    title: 'Notificações',
    description: 'Som e volume do aviso de novos pedidos',
    icon: <Bell className="h-6 w-6" />,
    color: 'text-primary'
  }
]

interface ConfiguracoesIndexProps {
  initialPage?: ConfigPage
}

export default function ConfiguracoesIndex({ initialPage = 'index' }: ConfiguracoesIndexProps) {
  const [currentPage, setCurrentPage] = useState<ConfigPage>(initialPage)

  useEffect(() => {
    setCurrentPage(initialPage)
  }, [initialPage])

  const handleNavigate = (page: ConfigPage) => {
    setCurrentPage(page)
  }

  const handleBack = () => {
    setCurrentPage('index')
  }

  // Renderizar página específica
  if (currentPage !== 'index') {
    return (
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        {currentPage === 'gerais' && <ConfiguracoesGeraisPage />}
        {currentPage === 'horario' && <ConfiguracoesHorarioPage />}
        {currentPage === 'pagamento' && <ConfiguracoesPagamentoPage />}
        {currentPage === 'visuais' && <ConfiguracoesVisuaisPage />}
        {currentPage === 'impressao' && <ConfiguracoesImpressaoPage />}
        {currentPage === 'notificacao' && <ConfiguracoesNotificacaoPage />}
        {currentPage === 'tema' && <ConfiguracoesTemaPage />}
      </div>
    )
  }

  // Renderizar página inicial com cards
  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <CabecalhoPagina titulo="Configurações" descricao="Gerencie as configurações do sistema" icone={Settings} />

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {configCards.map((card) => (
          <Card
            key={card.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleNavigate(card.id)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className={card.color}>
                  {card.icon}
                </div>
                <span className="text-lg">{card.title}</span>
              </CardTitle>
              <CardDescription className="mt-2">
                {card.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full">
                Configurar →
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
