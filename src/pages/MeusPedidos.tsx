import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Phone,
  Clock,
  CheckCircle,
  Truck,
  Package,
  ChefHat,
  Calendar,
  MapPin,
  User
} from "lucide-react"
import { pedidoService, configuracaoService, supabase, type PedidoSupabase } from "@/services"
import Footer from "@/components/Footer"
import Header from "@/components/Header"
import InformacoesEstabelecimentoModal from "@/components/InformacoesEstabelecimentoModal"
import BotoesFlutantes from "@/components/delivery/BotoesFlutantes"
import { renderizarDetalhesCombo } from "@/utils/comboFormatacao"
import { MessageSquare } from "lucide-react"

interface MeusPedidosProps {
  onVoltar?: () => void
}

export default function MeusPedidos({ onVoltar }: MeusPedidosProps) {
  const [telefone, setTelefone] = useState("")
  const [pedidos, setPedidos] = useState<PedidoSupabase[]>([])
  const [loading, setLoading] = useState(false)
  const [pesquisaRealizada, setPesquisaRealizada] = useState(false)
  const [erro, setErro] = useState("")
  const [modalInfoAberto, setModalInfoAberto] = useState(false)

  // Telefone da última busca (usado para recarregar via realtime)
  const telefoneBuscadoRef = useRef<string>("")

  // Estados para configurações do estabelecimento
  const [configuracao, setConfiguracao] = useState({
    nomeEstabelecimento: 'Sua Empresa',
    logoUrl: '',
    bannerUrl: ''
  })

  useEffect(() => {
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

  // Função para formatar telefone
  const formatarTelefone = (valor: string) => {
    const numeros = valor.replace(/\D/g, '')

    if (numeros.length === 0) return ''

    if (numeros.length <= 2) {
      return `(${numeros}`
    } else if (numeros.length <= 7) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`
    } else if (numeros.length <= 10) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`
    } else if (numeros.length === 11) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`
    }

    // Limitar a 11 dígitos
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`
  }

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorFormatado = formatarTelefone(e.target.value)
    setTelefone(valorFormatado)
  }

  const buscarPedidos = async () => {
    if (!telefone.trim()) {
      setErro("Por favor, digite seu telefone")
      return
    }

    // Limpar apenas números para busca
    const telefoneNumeros = telefone.replace(/\D/g, '')

    if (telefoneNumeros.length < 10) {
      setErro("Telefone deve ter pelo menos 10 dígitos")
      return
    }

    telefoneBuscadoRef.current = telefoneNumeros
    await carregarPedidosPorTelefone(telefoneNumeros)
  }

  /**
   * Carrega os pedidos de um telefone.
   * @param telefoneNumeros telefone (apenas dígitos)
   * @param silencioso quando true, não mostra loading/erros (usado pelo realtime)
   */
  const carregarPedidosPorTelefone = async (telefoneNumeros: string, silencioso = false) => {
    try {
      if (!silencioso) {
        setLoading(true)
        setErro("")
      }

      // Buscar pedidos pelo telefone (ativos + histórico)
      const pedidosEncontrados = await pedidoService.buscarTodosPorTelefone(telefoneNumeros)

      // Ordenar por data mais recente
      const pedidosOrdenados = pedidosEncontrados.sort((a, b) =>
        new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
      )

      setPedidos(pedidosOrdenados)
      setPesquisaRealizada(true)

      if (!silencioso && pedidosOrdenados.length === 0) {
        setErro("Nenhum pedido encontrado para este telefone")
      }
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error)
      if (!silencioso) {
        setErro("Erro ao buscar pedidos. Tente novamente.")
      }
    } finally {
      if (!silencioso) {
        setLoading(false)
      }
    }
  }

  // Atualização automática (realtime): recarrega os pedidos quando houver
  // qualquer mudança na tabela 'pedidos', sem o cliente precisar dar F5.
  useEffect(() => {
    if (!pesquisaRealizada || !telefoneBuscadoRef.current) return

    const channel = supabase
      .channel(`meus-pedidos-realtime-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        () => {
          if (telefoneBuscadoRef.current) {
            carregarPedidosPorTelefone(telefoneBuscadoRef.current, true)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pesquisaRealizada])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      buscarPedidos()
    }
  }

  const getStatusInfo = (status: string) => {
    const statusMap = {
      'Pedido criado': {
        color: 'bg-warning/15 text-warning-foreground',
        icon: Clock,
        label: 'Aguardando confirmação'
      },
      'Pendente': {
        color: 'bg-warning/15 text-warning-foreground',
        icon: Clock,
        label: 'Aguardando confirmação'
      },
      'Confirmado': {
        color: 'bg-primary/10 text-primary',
        icon: CheckCircle,
        label: 'Confirmado'
      },
      'Preparando': {
        color: 'bg-warning/15 text-warning-foreground',
        icon: ChefHat,
        label: 'Em preparo'
      },
      'Pronto': {
        color: 'bg-primary/10 text-primary',
        icon: Package,
        label: 'Pronto para entrega'
      },
      'Liberado': {
        color: 'bg-primary/10 text-primary',
        icon: Truck,
        label: 'Liberado'
      },
      'Saiu para entrega': {
        color: 'bg-primary/10 text-primary',
        icon: Truck,
        label: 'Saiu para entrega'
      },
      'Entregue': {
        color: 'bg-success/10 text-success',
        icon: CheckCircle,
        label: 'Entregue'
      },
      'Retirado': {
        color: 'bg-success/10 text-success',
        icon: CheckCircle,
        label: 'Retirado'
      },
      'Finalizado': {
        color: 'bg-success/10 text-success',
        icon: CheckCircle,
        label: 'Finalizado'
      },
      'Cancelado': {
        color: 'bg-destructive/10 text-destructive',
        icon: Clock,
        label: 'Cancelado'
      }
    }

    return statusMap[status as keyof typeof statusMap] || statusMap['Pendente']
  }

  const formatarData = (data: string) => {
    return new Date(data).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatarMoeda = (valor: number | undefined | null) => {
    if (valor === undefined || valor === null || isNaN(valor)) {
      return 'R$ 0,00'
    }
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
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
              Meus Pedidos
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Consulte o histórico dos seus pedidos e acompanhe o status de cada um
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Formulário de busca */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Consultar Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label htmlFor="telefone-consulta" className="block text-sm font-medium text-foreground/80 mb-2">
                  Digite seu telefone para consultar os pedidos
                </label>
                <div className="flex gap-3">
                  <Input
                    id="telefone-consulta"
                    name="telefone-consulta"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={telefone}
                    onChange={handleTelefoneChange}
                    onKeyPress={handleKeyPress}
                    className="flex-1"
                    maxLength={15}
                  />
                  <Button
                    onClick={buscarPedidos}
                    disabled={loading || !telefone.trim()}
                    className="bg-primary hover:bg-primary-hover cursor-pointer"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    {loading ? 'Buscando...' : 'Buscar'}
                  </Button>
                </div>
              </div>

              {erro && (
                <div className="text-destructive text-sm bg-destructive/5 p-3 rounded-lg">
                  {erro}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lista de pedidos */}
        {pesquisaRealizada && (
          <div className="space-y-4">
            {pedidos.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Nenhum pedido encontrado
                  </h3>
                  <p className="text-muted-foreground">
                    Não encontramos pedidos para este telefone.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-foreground">
                    {pedidos.length} {pedidos.length === 1 ? 'pedido encontrado' : 'pedidos encontrados'}
                  </h2>
                </div>

                {pedidos.map((pedido) => {
                  const statusInfo = getStatusInfo(pedido.status)
                  const StatusIcon = statusInfo.icon

                  return (
                    <Card key={pedido.id} className="overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">
                              Pedido #{pedido.codigo_pedido || pedido.id.slice(-8)}
                            </CardTitle>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {formatarData(pedido.criado_em)}
                              </div>
                              <div className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                {pedido.cliente_nome}
                              </div>
                            </div>
                          </div>
                          <Badge className={statusInfo.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* Endereço de entrega */}
                        {pedido.entrega_domicilio && pedido.cliente_endereco && (
                          <div className="flex items-start gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground/70 mt-0.5" />
                            <div>
                              <p className="font-medium">Endereço de entrega:</p>
                              <p className="text-muted-foreground">
                                {pedido.cliente_endereco}
                                {pedido.cliente_numero && `, ${pedido.cliente_numero}`}
                                {pedido.cliente_complemento && `, ${pedido.cliente_complemento}`}
                                {pedido.cliente_bairro && ` - ${pedido.cliente_bairro}`}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Itens do pedido */}
                        {pedido.itens && pedido.itens.length > 0 && (
                          <div>
                            <p className="font-medium text-sm mb-2">Itens do pedido:</p>
                            <div className="space-y-1">
                              {pedido.itens.map((item: any, index: number) => {
                                // Verificar se o item tem a estrutura do histórico_geral
                                const produto = item.produto || item
                                const quantidade = item.quantidade || 1
                                const nome = produto.nome || item.nome
                                const preco = produto.preco || item.preco || item.preco_total || 0

                                return (
                                  <div key={index} className="flex justify-between text-sm bg-muted/50 p-2 rounded">
                                    <span>
                                      {quantidade}x {nome}
                                      {(produto.categoria_nome || produto.categoria) && (
                                        <span className="text-xs text-muted-foreground ml-2">
                                          ({produto.categoria_nome || produto.categoria})
                                        </span>
                                      )}
                                      
                                      {/* Renderizar detalhes do combo se for um combo */}
                                      {renderizarDetalhesCombo(item)}
                                      
                                      {/* Detalhes do item (se não for combo) */}
                                      {!item.produtosCombo && (
                                        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                          {item.tamanhoSelecionado && (
                                            <div>• Tamanho: {item.tamanhoSelecionado.nome}</div>
                                          )}
                                          {item.saboresSelecionados && item.saboresSelecionados.length > 0 && (
                                            <div>• Sabores: {item.saboresSelecionados.map((s: any) => s.nome).join(', ')}</div>
                                          )}
                                          {item.bordaSelecionada && (
                                            <div>• Borda: {item.bordaSelecionada.nome}</div>
                                          )}
                                          {item.adicionaisSelecionados && item.adicionaisSelecionados.length > 0 && (
                                            <div>• Adicionais: {item.adicionaisSelecionados.map((a: any) =>
                                              `${a.quantidade}x ${a.nome} (+R$ ${(a.valor * a.quantidade).toFixed(2).replace('.', ',')})`
                                            ).join(', ')}</div>
                                          )}
                                          {item.observacoes && (
                                            <div className="text-xs text-muted-foreground italic mt-1 flex items-start gap-1">
                                              <MessageSquare className="inline h-3 w-3 mt-0.5 flex-shrink-0" />
                                              <span>Obs: {item.observacoes}</span>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </span>
                                    <span className="font-medium">
                                      {formatarMoeda(preco * quantidade)}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Observações */}
                        {pedido.observacoes && (
                          <div className="text-sm">
                            <p className="font-medium">Observações:</p>
                            <p className="text-muted-foreground">{pedido.observacoes}</p>
                          </div>
                        )}

                        {/* Total */}
                        <div className="flex justify-between items-center pt-3 border-t">
                          <span className="font-medium">Total do pedido:</span>
                          <span className="text-xl font-bold text-[color:var(--price-color-cliente)]">
                            {formatarMoeda(pedido.total)}
                          </span>
                        </div>

                        {/* Informações de cancelamento */}
                        {pedido.cancelado && pedido.motivo_cancelamento && (
                          <div className="bg-destructive/5 border border-destructive/30 p-3 rounded-lg">
                            <p className="font-medium text-destructive text-sm mb-1">Pedido Cancelado</p>
                            <p className="text-destructive text-sm">
                              <span className="font-medium">Motivo:</span> {pedido.motivo_cancelamento}
                            </p>
                            {pedido.requer_extorno && (
                              <p className="text-destructive text-sm mt-1">
                                <span className="font-medium">Extorno:</span> {formatarMoeda(pedido.valor_extorno || 0)}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Botão de acompanhar pedido */}
                        {!pedido.cancelado && ['Pedido criado', 'Pendente', 'Confirmado', 'Preparando', 'Pronto', 'Liberado', 'Saiu para entrega'].includes(pedido.status) && (
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                              const codigoPedido = pedido.codigo_pedido || pedido.pedido_id || pedido.id
                              window.open(`/meu-pedido/${codigoPedido}`, '_blank')
                            }}
                          >
                            Acompanhar Pedido
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </>
            )}
          </div>
        )}
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