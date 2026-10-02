import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Star, 
  Send,
  Heart,
  ThumbsUp,
  Clock,
  Utensils,
  MapPin,
  DollarSign,
  Users,
  Award
} from "lucide-react"
import { supabase, configuracaoService, comTenant, getEstabelecimentoAtivo } from "@/services"
import Footer from "@/components/Footer"
import Header from "@/components/Header"
import InformacoesEstabelecimentoModal from "@/components/InformacoesEstabelecimentoModal"
import BotoesFlutantes from "@/components/delivery/BotoesFlutantes"

interface Avaliacao {
  id: string
  nome_cliente: string
  estrelas: number
  descricao?: string
  badges: string[]
  criado_em: string
}

interface AvaliarEstabelecimentoProps {
  onVoltar?: () => void
}

// Badges pré-definidos com ícones
const BADGES_DISPONIVEIS = [
  { id: 'comida-deliciosa', label: 'Comida Deliciosa', icon: Utensils, color: 'bg-warning/15 text-warning-foreground' },
  { id: 'atendimento-excelente', label: 'Atendimento Excelente', icon: Users, color: 'bg-primary/10 text-primary' },
  { id: 'entrega-rapida', label: 'Entrega Rápida', icon: Clock, color: 'bg-success/10 text-success' },
  { id: 'preco-justo', label: 'Preço Justo', icon: DollarSign, color: 'bg-primary/10 text-primary' },
  { id: 'ambiente-agradavel', label: 'Ambiente Agradável', icon: Heart, color: 'bg-primary/10 text-primary' },
  { id: 'localizacao-otima', label: 'Localização Ótima', icon: MapPin, color: 'bg-primary/10 text-primary' },
  { id: 'qualidade-premium', label: 'Qualidade Premium', icon: Award, color: 'bg-warning/15 text-warning-foreground' },
  { id: 'recomendo', label: 'Super Recomendo', icon: ThumbsUp, color: 'bg-success/10 text-success' }
]

export default function AvaliarEstabelecimento({ onVoltar }: AvaliarEstabelecimentoProps) {
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [cardsExpandidos, setCardsExpandidos] = useState<Set<string>>(new Set())
  
  // Estados do formulário
  const [nomeCliente, setNomeCliente] = useState("")
  const [estrelas, setEstrelas] = useState(0)
  const [descricao, setDescricao] = useState("")
  const [badgesSelecionados, setBadgesSelecionados] = useState<string[]>([])
  const [erro, setErro] = useState("")
  const [sucesso, setSucesso] = useState(false)
  const [modalInfoAberto, setModalInfoAberto] = useState(false)
  
  // Estados para configurações do estabelecimento
  const [configuracao, setConfiguracao] = useState({
    nomeEstabelecimento: 'Sua Empresa',
    logoUrl: '',
    bannerUrl: ''
  })

  useEffect(() => {
    carregarAvaliacoes()
    carregarConfiguracoes()
  }, [])

  const carregarConfiguracoes = async () => {
    try {
      const [nomeConfig, logoConfig, bannerConfig] = await Promise.all([
        configuracaoService.buscarPorChave('nome_loja'),
        configuracaoService.buscarPorChave('logo_url'),
        configuracaoService.buscarPorChave('banner_url')
      ])

      setConfiguracao({
        nomeEstabelecimento: nomeConfig?.valor || 'Sua Empresa',
        logoUrl: logoConfig?.valor || '',
        bannerUrl: bannerConfig?.valor || ''
      })
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    }
  }

  const carregarAvaliacoes = async () => {
    try {
      setLoading(true)
      const estabId = getEstabelecimentoAtivo()
      let query = supabase
        .from('avaliacoes')
        .select('*')
        .eq('aprovada', true)
      if (estabId) query = query.eq('estabelecimento_id', estabId)
      const { data, error } = await query
        .order('criado_em', { ascending: false })
        .limit(20)

      if (error) {
        console.error('Erro ao carregar avaliações:', error)
        return
      }

      setAvaliacoes(data || [])
    } catch (error) {
      console.error('Erro ao carregar avaliações:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEstrelaClick = (nota: number) => {
    setEstrelas(nota)
  }

  const toggleBadge = (badgeId: string) => {
    setBadgesSelecionados(prev => 
      prev.includes(badgeId) 
        ? prev.filter(id => id !== badgeId)
        : [...prev, badgeId]
    )
  }

  const enviarAvaliacao = async () => {
    if (!nomeCliente.trim()) {
      setErro("Por favor, digite seu nome")
      return
    }

    if (estrelas === 0) {
      setErro("Por favor, selecione uma nota de 1 a 5 estrelas")
      return
    }

    try {
      setEnviando(true)
      setErro("")

      const { error } = await supabase
        .from('avaliacoes')
        .insert(comTenant({
          nome_cliente: nomeCliente.trim(),
          estrelas,
          descricao: descricao.trim() || null,
          badges: badgesSelecionados
        }))

      if (error) {
        console.error('Erro ao enviar avaliação:', error)
        setErro("Erro ao enviar avaliação. Tente novamente.")
        return
      }

      // Limpar formulário
      setNomeCliente("")
      setEstrelas(0)
      setDescricao("")
      setBadgesSelecionados([])
      setSucesso(true)

      // Recarregar avaliações
      await carregarAvaliacoes()

      // Remover mensagem de sucesso após 3 segundos
      setTimeout(() => setSucesso(false), 3000)

    } catch (error) {
      console.error('Erro ao enviar avaliação:', error)
      setErro("Erro ao enviar avaliação. Tente novamente.")
    } finally {
      setEnviando(false)
    }
  }

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const calcularMediaEstrelas = () => {
    if (avaliacoes.length === 0) return 0
    const soma = avaliacoes.reduce((acc, avaliacao) => acc + avaliacao.estrelas, 0)
    return (soma / avaliacoes.length).toFixed(1)
  }

  const renderEstrelas = (nota: number, tamanho: 'sm' | 'md' | 'lg' = 'md') => {
    const sizes = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4', 
      lg: 'h-6 w-6'
    }

    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((estrela) => (
          <Star
            key={estrela}
            className={`${sizes[tamanho]} ${
              estrela <= nota 
                ? 'text-yellow-400 fill-current' 
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <Header
        nomeEstabelecimento={configuracao.nomeEstabelecimento}
        logoUrl={configuracao.logoUrl}
        bannerUrl={configuracao.bannerUrl}
        onMaisInformacoes={() => setModalInfoAberto(true)}
        showBackButton={!!onVoltar}
        onBack={onVoltar}
      />

      {/* Título da página */}
      <div className="bg-card shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Avaliar Estabelecimento
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Compartilhe sua experiência conosco e ajude outros clientes a descobrir o que torna nosso estabelecimento especial
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Estatísticas */}
        {avaliacoes.length > 0 && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <div className="text-3xl font-bold text-foreground">{calcularMediaEstrelas()}</div>
                  <div className="flex justify-center mb-1">
                    {renderEstrelas(Math.round(parseFloat(calcularMediaEstrelas().toString())), 'lg')}
                  </div>
                  <div className="text-sm text-muted-foreground">Média geral</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-foreground">{avaliacoes.length}</div>
                  <div className="text-sm text-muted-foreground">
                    {avaliacoes.length === 1 ? 'Avaliação' : 'Avaliações'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Formulário de Avaliação */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-warning-foreground" />
              Deixe sua Avaliação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Nome */}
            <div>
              <label htmlFor="nome-avaliacao" className="block text-sm font-medium text-foreground/80 mb-2">
                Seu Nome
              </label>
              <Input
                id="nome-avaliacao"
                name="nome-avaliacao"
                type="text"
                placeholder="Digite seu nome"
                value={nomeCliente}
                onChange={(e) => setNomeCliente(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Estrelas */}
            <div>
              <span className="block text-sm font-medium text-foreground/80 mb-2">
                Sua Nota
              </span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((nota) => (
                  <button
                    key={nota}
                    onClick={() => handleEstrelaClick(nota)}
                    className="p-1 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        nota <= estrelas 
                          ? 'text-yellow-400 fill-current' 
                          : 'text-gray-300 hover:text-warning/60'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {estrelas > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {estrelas === 1 && "Muito ruim"}
                  {estrelas === 2 && "Ruim"}
                  {estrelas === 3 && "Regular"}
                  {estrelas === 4 && "Bom"}
                  {estrelas === 5 && "Excelente"}
                </p>
              )}
            </div>

            {/* Badges */}
            <div>
              <span className="block text-sm font-medium text-foreground/80 mb-2">
                O que mais gostou? (Opcional)
              </span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {BADGES_DISPONIVEIS.map((badge) => {
                  const IconComponent = badge.icon
                  const isSelected = badgesSelecionados.includes(badge.id)
                  
                  return (
                    <button
                      key={badge.id}
                      onClick={() => toggleBadge(badge.id)}
                      className={`p-2 rounded-lg border text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${
                        isSelected 
                          ? `${badge.color} border-current` 
                          : 'bg-muted/50 text-muted-foreground border-border hover:bg-accent'
                      }`}
                    >
                      <IconComponent className="h-3 w-3" />
                      {badge.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label htmlFor="comentario-avaliacao" className="block text-sm font-medium text-foreground/80 mb-2">
                Comentário (Opcional)
              </label>
              <textarea
                id="comentario-avaliacao"
                name="comentario-avaliacao"
                placeholder="Conte-nos mais sobre sua experiência..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-destructive focus:border-transparent resize-none"
              />
            </div>

            {/* Mensagens */}
            {erro && (
              <div className="text-destructive text-sm bg-destructive/5 p-3 rounded-lg">
                {erro}
              </div>
            )}

            {sucesso && (
              <div className="text-success text-sm bg-success/5 p-3 rounded-lg">
                Avaliação enviada com sucesso! Obrigado pelo seu feedback.
              </div>
            )}

            {/* Botão Enviar */}
            <Button
              onClick={enviarAvaliacao}
              disabled={enviando}
              className="w-full bg-primary hover:bg-primary-hover cursor-pointer"
            >
              {enviando ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {enviando ? 'Enviando...' : 'Enviar Avaliação'}
            </Button>
          </CardContent>
        </Card>

        {/* Lista de Avaliações */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            Avaliações dos Clientes
          </h2>

          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-destructive border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Carregando avaliações...</p>
            </div>
          ) : avaliacoes.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Star className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Seja o primeiro a avaliar!
                </h3>
                <p className="text-muted-foreground">
                  Compartilhe sua experiência e ajude outros clientes.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max">
              {avaliacoes.map((avaliacao, index) => {
                // Lógica para criar variação no bento grid
                const isLarge = index % 7 === 0 || index % 7 === 3 // Alguns cards maiores
                const isTall = index % 5 === 1 || index % 5 === 4 // Alguns cards mais altos
                const hasDescription = avaliacao.descricao && avaliacao.descricao.length > 0
                const hasManyBadges = avaliacao.badges && avaliacao.badges.length > 3
                
                return (
                  <Card 
                    key={avaliacao.id}
                    className={`
                      ${isLarge ? 'md:col-span-2' : ''}
                      ${(isTall || hasDescription || hasManyBadges) ? 'md:row-span-2' : ''}
                      transition-all duration-300 hover:shadow-lg
                    `}
                  >
                    <CardContent className="p-4 h-full flex flex-col">
                      {/* Header da avaliação */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-medium text-foreground truncate">{avaliacao.nome_cliente}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {renderEstrelas(avaliacao.estrelas, 'sm')}
                            <span className="text-xs text-muted-foreground">
                              {formatarData(avaliacao.criado_em)}
                            </span>
                          </div>
                        </div>
                        {avaliacao.estrelas === 5 && (
                          <div className="ml-2">
                            <Award className="h-4 w-4 text-warning-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Badges */}
                      {avaliacao.badges && avaliacao.badges.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {(() => {
                            const isExpandido = cardsExpandidos.has(avaliacao.id)
                            const limite = isLarge ? 6 : 3
                            const badgesParaMostrar = isExpandido ? avaliacao.badges : avaliacao.badges.slice(0, limite)
                            
                            return (
                              <>
                                {badgesParaMostrar.map((badgeId) => {
                                  const badge = BADGES_DISPONIVEIS.find(b => b.id === badgeId)
                                  if (!badge) return null
                                  
                                  const IconComponent = badge.icon
                                  return (
                                    <Badge key={badgeId} className={`${badge.color} text-xs`}>
                                      <IconComponent className="h-2.5 w-2.5 mr-1" />
                                      {isLarge ? badge.label : badge.label.split(' ')[0]}
                                    </Badge>
                                  )
                                })}
                                {avaliacao.badges.length > limite && !isExpandido && (
                                  <Badge 
                                    className="bg-muted text-muted-foreground text-xs cursor-pointer hover:bg-accent transition-colors"
                                    onClick={() => {
                                      const novosExpandidos = new Set(cardsExpandidos)
                                      novosExpandidos.add(avaliacao.id)
                                      setCardsExpandidos(novosExpandidos)
                                    }}
                                  >
                                    +{avaliacao.badges.length - limite}
                                  </Badge>
                                )}
                              </>
                            )
                          })()}
                        </div>
                      )}

                      {/* Descrição */}
                      {avaliacao.descricao && (
                        <div className="flex-1">
                          <p className={`text-foreground/80 text-sm leading-relaxed ${
                            isLarge ? '' : 'line-clamp-3'
                          }`}>
                            {avaliacao.descricao}
                          </p>
                        </div>
                      )}

                      {/* Indicador de qualidade */}
                      {avaliacao.estrelas >= 4 && (
                        <div className="mt-auto pt-2">
                          <div className="flex items-center gap-1 text-xs text-success">
                            <ThumbsUp className="h-3 w-3" />
                            <span>Recomendado</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <Footer />

      <BotoesFlutantes />

      {/* Modal de Informações do Estabelecimento */}
      <InformacoesEstabelecimentoModal
        isOpen={modalInfoAberto}
        onClose={() => setModalInfoAberto(false)}
      />

    </div>
  )
}