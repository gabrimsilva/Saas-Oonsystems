import { useState, useEffect } from "react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Package,
  Clock,
  CheckCircle,
  Phone,
  MapPin,
  CreditCard,
  ArrowLeft,
  MessageCircle,
  Truck,
  ChefHat,
  MessageSquare
} from "lucide-react"
import { historicoPedidoService, pedidoService, clienteService, configuracaoService, supabase, type HistoricoPedidoSupabase, type PedidoSupabase } from "@/services"
import { openWhatsApp } from "@/lib/whatsapp"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import InformacoesEstabelecimentoModal from "@/components/InformacoesEstabelecimentoModal"
import BotoesFlutantes from "@/components/delivery/BotoesFlutantes"
import { renderizarDetalhesCombo } from "@/utils/comboFormatacao"
import StatusTimeline from "@/components/StatusTimeline"
import { formatarFormaPagamento } from "@/utils/statusFormatacao"

// Adicionar função formatarData
const formatarData = (dataISO: string) => {
  return new Date(dataISO).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// Interfaces removidas - usando tipos do Supabase

// Interface removida - usando PedidoSupabase

// Removido - usando HistoricoPedidoSupabase do supabase.ts

interface ProcessandoPedidoProps {
  pedidoId: string
  onVoltarMenu: () => void
}

export default function ProcessandoPedido({ pedidoId, onVoltarMenu }: ProcessandoPedidoProps) {
  const [pedido, setPedido] = useState<PedidoSupabase | null>(null)
  const [historico, setHistorico] = useState<HistoricoPedidoSupabase[]>([])
  const [cliente, setCliente] = useState<any>(null)
  const [configuracao, setConfiguracao] = useState({
    nomeEstabelecimento: 'Sua Empresa',
    logoUrl: '',
    whatsapp: '',
    bannerUrl: ''
  })
  const [loading, setLoading] = useState(true)
  const [modalInfoAberto, setModalInfoAberto] = useState(false)
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date>(new Date())
  const [atualizandoRealtime, setAtualizandoRealtime] = useState(false)

  useEffect(() => {
    carregarDados()

    // Extrair o código do pedido da URL para usar no realtime
    const codigoPedido = pedidoId.replace('pedido-', '')

    // Configurar realtime para atualizações do histórico
    const channelHistorico = historicoPedidoService.configurarRealtime(codigoPedido, () => {
      setAtualizandoRealtime(true)
      setTimeout(() => {
        carregarHistorico()
        setAtualizandoRealtime(false)
      }, 100)
    })

    // Configurar realtime para atualizações do pedido principal
    const channelPedido = supabase
      .channel(`pedido-${codigoPedido}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pedidos',
          filter: `codigo_pedido=eq.${codigoPedido}`
        },
        () => {
          setAtualizandoRealtime(true)
          setTimeout(() => {
            carregarPedido()
            carregarHistorico()
            setAtualizandoRealtime(false)
          }, 100)
        }
      )
      .subscribe()

    // Configurar polling como backup (atualizar a cada 30 segundos)
    const interval = setInterval(() => {
      carregarHistorico()
    }, 30000)

    return () => {
      historicoPedidoService.removerRealtime(channelHistorico)
      supabase.removeChannel(channelPedido)
      clearInterval(interval)
    }
  }, [pedidoId])

  const carregarDados = async () => {
    await Promise.all([
      carregarPedido(),
      carregarHistorico(),
      carregarConfiguracoes()
    ])
  }

  const carregarConfiguracoes = async () => {
    try {
      const [nomeConfig, logoConfig, whatsappConfig, bannerConfig] = await Promise.all([
        configuracaoService.buscarPorChave('nome_loja'),
        configuracaoService.buscarPorChave('logo_url'),
        configuracaoService.buscarPorChave('whatsapp_loja'),
        configuracaoService.buscarPorChave('banner_url')
      ])

      setConfiguracao({
        nomeEstabelecimento: nomeConfig?.valor || 'Sua Empresa',
        logoUrl: logoConfig?.valor || '',
        whatsapp: whatsappConfig?.valor || '',
        bannerUrl: bannerConfig?.valor || ''
      })
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    }
  }

  const carregarPedido = async () => {
    try {
      const codigoPedido = pedidoId.replace('pedido-', '')
      
      // PRIORIDADE 1: Buscar na tabela de pedidos ativos pelo codigo_pedido
      const { data: pedidosAtivos, error: errorAtivos } = await supabase
        .from('pedidos')
        .select('*')
        .eq('codigo_pedido', codigoPedido)
        .single()

      if (!errorAtivos && pedidosAtivos) {
        setPedido(pedidosAtivos)

        // Carregar dados do cliente se houver cliente_id
        if (pedidosAtivos.cliente_id) {
          try {
            const clienteData = await clienteService.buscarPorId(pedidosAtivos.cliente_id)
            setCliente(clienteData)
          } catch (error) {
            console.error('Erro ao carregar dados do cliente:', error)
          }
        }
        return
      }

      // PRIORIDADE 2: Buscar no histórico geral pelo codigo_pedido
      const { data: pedidoHistorico, error: errorHistorico } = await supabase
        .from('historico_geral')
        .select('*')
        .eq('codigo_pedido', codigoPedido)
        .single()

      if (!errorHistorico && pedidoHistorico) {
        // Converter dados do histórico para formato PedidoSupabase
        const pedidoConvertido: PedidoSupabase = {
          id: pedidoHistorico.id,
          pedido_id: pedidoHistorico.pedido_id,
          codigo_pedido: pedidoHistorico.codigo_pedido, // IMPORTANTE: preservar o código
          cliente_nome: pedidoHistorico.cliente_nome,
          cliente_sobrenome: pedidoHistorico.cliente_sobrenome,
          cliente_telefone: pedidoHistorico.cliente_telefone,
          cliente_email: pedidoHistorico.cliente_email,
          cliente_endereco: pedidoHistorico.cliente_endereco,
          cliente_numero: pedidoHistorico.cliente_numero,
          cliente_complemento: pedidoHistorico.cliente_complemento,
          cliente_bairro: pedidoHistorico.cliente_bairro,
          cliente_cidade: pedidoHistorico.cliente_cidade,
          cliente_estado: pedidoHistorico.cliente_estado,
          entrega_domicilio: pedidoHistorico.entrega_domicilio,
          forma_pagamento: pedidoHistorico.forma_pagamento,
          precisa_troco: pedidoHistorico.precisa_troco,
          valor_troco: pedidoHistorico.valor_troco,
          subtotal: pedidoHistorico.subtotal,
          taxa_entrega: pedidoHistorico.taxa_entrega,
          total: pedidoHistorico.total,
          desconto: pedidoHistorico.desconto || 0,
          tipo_desconto: pedidoHistorico.tipo_desconto || 'valor',
          itens: pedidoHistorico.itens,
          status: pedidoHistorico.status,
          observacoes: pedidoHistorico.observacoes,
          criado_em: pedidoHistorico.criado_em,
          atualizado_em: pedidoHistorico.movido_em // Usar data de quando foi movido
        }
        setPedido(pedidoConvertido)
        return
      }

      // PRIORIDADE 3: Fallback - tentar buscar pelo pedido_id completo (compatibilidade com URLs antigas)
      const pedidoSupabase = await pedidoService.buscarPorId(pedidoId)
      if (pedidoSupabase) {
        setPedido(pedidoSupabase)
        return
      }

      // PRIORIDADE 4: Se não encontrar no Supabase nem no histórico, tentar localStorage (fallback)
      const pedidoSalvo = localStorage.getItem(`pedido-${pedidoId}`)
      if (pedidoSalvo) {
        const pedidoLocal = JSON.parse(pedidoSalvo)
        // Converter formato local para formato Supabase
        const pedidoConvertido: PedidoSupabase = {
          id: pedidoLocal.id,
          pedido_id: pedidoLocal.id,
          cliente_nome: pedidoLocal.dadosCliente?.nome || '',
          cliente_sobrenome: pedidoLocal.dadosCliente?.sobrenome || '',
          cliente_telefone: pedidoLocal.dadosCliente?.telefone || '',
          cliente_email: pedidoLocal.dadosCliente?.email,
          cliente_endereco: pedidoLocal.dadosCliente?.endereco,
          cliente_cidade: pedidoLocal.dadosCliente?.cidade,
          cliente_estado: pedidoLocal.dadosCliente?.estado,
          entrega_domicilio: pedidoLocal.entregaDomicilio || true,
          forma_pagamento: pedidoLocal.dadosCliente?.formaPagamento || 'dinheiro',
          subtotal: pedidoLocal.total || 0,
          taxa_entrega: 0,
          total: pedidoLocal.total || 0,
          desconto: 0,
          tipo_desconto: 'valor',
          itens: pedidoLocal.itens || [],
          status: pedidoLocal.status || 'Pedido criado',
          previsao_entrega: pedidoLocal.previsaoEntrega,
          criado_em: pedidoLocal.dataHora || new Date().toISOString(),
          atualizado_em: pedidoLocal.dataHora || new Date().toISOString()
        }
        setPedido(pedidoConvertido)
      }
    } catch (error) {
      console.error('Erro ao carregar pedido:', error)
    }
  }

  const carregarHistorico = async () => {
    try {
      const codigoPedido = pedidoId.replace('pedido-', '')
      console.log('🔄 [ProcessandoPedido] Buscando histórico para:', codigoPedido)
      
      const historicoData = await historicoPedidoService.buscarPorPedido(codigoPedido)
      console.log('✅ [ProcessandoPedido] Histórico carregado:', historicoData)
      
      setHistorico(historicoData)
      setUltimaAtualizacao(new Date())

      // Se não há histórico, criar o primeiro registro
      if (historicoData.length === 0) {
        console.log('📝 [ProcessandoPedido] Criando primeiro status...')
        await historicoPedidoService.adicionarStatus(codigoPedido, 'Pedido criado', 'Pedido recebido pelo sistema')
        const novoHistorico = await historicoPedidoService.buscarPorPedido(codigoPedido)
        console.log('✅ [ProcessandoPedido] Primeiro status criado:', novoHistorico)
        setHistorico(novoHistorico)
        setUltimaAtualizacao(new Date())
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error)
      const codigoPedido = pedidoId.replace('pedido-', '')
      setHistorico([
        {
          id: '1',
          pedido_id: codigoPedido,
          status: 'Pedido criado',
          observacao: 'Pedido recebido pelo sistema',
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString()
        }
      ])
      setUltimaAtualizacao(new Date())
    } finally {
      setLoading(false)
    }
  }



  const getTempoEstimado = () => {
    if (!pedido) return '45 min'
    return pedido.entrega_domicilio ? '45-60 min' : '30-45 min'
  }

  // Último status efetivo do pedido (histórico tem prioridade sobre o campo do pedido)
  const getUltimoStatus = () => {
    if (!pedido) return ''
    return historico.length > 0 ? historico[historico.length - 1].status : pedido.status
  }

  // Função para obter o texto do cabeçalho baseado no status
  const getTituloPedido = () => {
    if (!pedido) return 'Pedido Confirmado!'

    const ultimoStatus = getUltimoStatus()

    if (ultimoStatus === 'Cancelado') {
      return 'Pedido Cancelado'
    }

    if (ultimoStatus === 'Preparando') {
      return 'Em preparo!'
    }

    if (ultimoStatus === 'Liberado') {
      return pedido.entrega_domicilio ? 'A caminho de você!' : 'Retirada Disponível!'
    }

    if (ultimoStatus === 'Finalizado' || ultimoStatus === 'Entregue' || ultimoStatus === 'Retirado') {
      return 'Pedido Finalizado!'
    }

    return 'Pedido Confirmado!'
  }

  // Gradiente do cabeçalho de acordo com o status atual
  const getHeaderGradiente = () => {
    if (!pedido) return 'bg-success'

    const ultimoStatus = getUltimoStatus()

    if (ultimoStatus === 'Cancelado') return 'bg-destructive'
    if (ultimoStatus === 'Preparando') return 'bg-warning'
    if (ultimoStatus === 'Liberado') {
      return pedido.entrega_domicilio
        ? 'bg-primary' // A caminho (roxo)
        : 'bg-primary'  // Retirada (azul)
    }
    if (ultimoStatus === 'Finalizado' || ultimoStatus === 'Entregue' || ultimoStatus === 'Retirado') {
      return 'bg-gray-600' // Finalizado (cinza)
    }
    return 'bg-success' // Criado/Confirmado (verde)
  }

  // Ícone do cabeçalho de acordo com o status atual
  const getHeaderIcone = () => {
    if (!pedido) return <CheckCircle className="w-6 h-6" />

    const ultimoStatus = getUltimoStatus()

    if (ultimoStatus === 'Preparando') return <ChefHat className="w-6 h-6" />
    if (ultimoStatus === 'Liberado') {
      return pedido.entrega_domicilio ? <Truck className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />
    }
    return <CheckCircle className="w-6 h-6" />
  }

  // Função para obter ID curto do pedido
  const getIdCurto = () => {
    if (!pedido) return ''
    
    // Sempre usar o codigo_pedido se disponível
    if (pedido.codigo_pedido && pedido.codigo_pedido.trim() !== '') {
      return pedido.codigo_pedido
    }
    
    // Fallback: extrair da URL se não tiver codigo_pedido
    const codigoFromUrl = pedidoId.replace('pedido-', '')
    if (codigoFromUrl && codigoFromUrl !== pedidoId) {
      return codigoFromUrl
    }
    
    // Último fallback: últimos 4 caracteres do pedido_id
    return pedido.pedido_id?.slice(-4) || 'N/A'
  }



  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-destructive rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-white" />
          </div>
          <p className="text-muted-foreground">Carregando pedido...</p>
        </div>
      </div>
    )
  }

  if (!pedido) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Pedido não encontrado</p>
          <Button onClick={onVoltarMenu}>Voltar ao Menu</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/60">
      {/* Header */}
      <Header
        nomeEstabelecimento={configuracao.nomeEstabelecimento}
        logoUrl={configuracao.logoUrl}
        bannerUrl={configuracao.bannerUrl}
        onMaisInformacoes={() => setModalInfoAberto(true)}
        showBackButton={true}
        onBack={onVoltarMenu}
      />

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Status Hero Section */}
        <Card className={`mb-6 text-white border-0 ${getHeaderGradiente()}`}>
          <CardContent className="p-6">
            {/* Layout Desktop */}
            <div className="hidden md:flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    {getHeaderIcone()}
                  </div>
                  <div>
                    <h1 className="text-2xl font-semibold">{getTituloPedido()}</h1>
                    <p className="text-success/60">#{getIdCurto()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>Previsão: {getTempoEstimado()}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-success/60 text-sm">Total Pago</p>
                <p className="text-2xl font-bold">R$ {pedido.total.toFixed(2).replace('.', ',')}</p>
              </div>
            </div>

            {/* Layout Mobile - Tudo enfileirado verticalmente */}
            <div className="md:hidden">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  {getHeaderIcone()}
                </div>
                <div className="flex-1">
                  <h1 className="text-xl font-bold mb-1">{getTituloPedido()}</h1>
                  <p className="text-success/60 text-lg mb-2">#{getIdCurto()}</p>
                  <p className="text-success/60 text-sm mb-1">Total Pago</p>
                  <p className="text-2xl font-bold mb-3">R$ {pedido.total.toFixed(2).replace('.', ',')}</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">Previsão: {getTempoEstimado()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status do Pedido - Timeline em Tempo Real */}
            <StatusTimeline 
              historico={historico} 
              atualizandoRealtime={atualizandoRealtime} 
              ultimaAtualizacao={ultimaAtualizacao} 
              pedido={pedido} 
            />

            {/* Itens do Pedido */}
            <Card>
              <CardHeader>
                <CardTitle>Seus Itens</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pedido.itens.map((item: any, index: number) => (
                    <div key={index} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                        {item.produto.imagem_path || item.produto.urlImagem ? (
                          <img
                            src={item.produto.imagem_path || item.produto.urlImagem}
                            alt={item.produto.nome}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/placeholder-food.svg';
                            }}
                          />
                        ) : (
                          <Package className="w-8 h-8 text-muted-foreground/70" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground">{item.produto.nome}</h4>
                        {(item.produto?.categoria_nome || item.produto?.categoria) && (
                          <p className="text-xs text-muted-foreground">
                            {item.produto.categoria_nome || item.produto.categoria}
                          </p>
                        )}
                        
                        {/* Renderizar detalhes do combo se for um combo */}
                        {renderizarDetalhesCombo(item)}
                        
                        {/* Renderizar detalhes normais se não for combo */}
                        {!item.produtosCombo && (
                          <div className="text-sm text-muted-foreground space-y-1">
                            {item.tamanhoSelecionado && (
                              <p>Tamanho: {item.tamanhoSelecionado.nome} ({item.tamanhoSelecionado.tamanho})</p>
                            )}
                            {item.saboresSelecionados && item.saboresSelecionados.length > 0 && (
                              <p>Sabores: {item.saboresSelecionados.map((s: any) => s.nome).join(', ')}</p>
                            )}
                            {item.bordaSelecionada && (
                              <p>Borda: {item.bordaSelecionada.nome}</p>
                            )}
                            {item.adicionaisSelecionados && item.adicionaisSelecionados.length > 0 && (
                              <p>Adicionais: {item.adicionaisSelecionados.map((a: any) => 
                                `${a.quantidade}x ${a.nome}`
                              ).join(', ')}</p>
                            )}
                            {item.observacoes && (
                              <p className="text-xs text-muted-foreground italic flex items-start gap-1">
                                <MessageSquare className="inline h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span>Obs: {item.observacoes}</span>
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary">{item.quantidade}x</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Informações do Cliente */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-destructive" />
                  Seus Dados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-semibold">{pedido.cliente_nome} {pedido.cliente_sobrenome}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="font-semibold">{pedido.cliente_telefone}</p>
                </div>
                {pedido.cliente_email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-semibold">{pedido.cliente_email}</p>
                  </div>
                )}
                {cliente && cliente.total_pedidos > 1 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">Cliente desde {formatarData(cliente.criado_em)}</p>
                    <p className="text-xs text-muted-foreground">{cliente.total_pedidos} pedidos realizados</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Endereço de Entrega */}
            {pedido.entrega_domicilio && pedido.cliente_endereco && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-destructive" />
                    Endereço de Entrega
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-1">
                    <p className="font-semibold">{pedido.cliente_endereco}, {pedido.cliente_numero}</p>
                    {pedido.cliente_complemento && (
                      <p className="text-muted-foreground">{pedido.cliente_complemento}</p>
                    )}
                    <p className="text-muted-foreground">
                      {pedido.cliente_bairro && `${pedido.cliente_bairro}, `}
                      {pedido.cliente_cidade} - {pedido.cliente_estado}
                    </p>
                    {pedido.cliente_cep && (
                      <p className="text-muted-foreground">CEP: {pedido.cliente_cep}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Observações do Pedido */}
            {pedido.observacoes && pedido.observacoes.trim() && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-destructive" />
                    Observações
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap">{pedido.observacoes}</p>
                </CardContent>
              </Card>
            )}

            {/* Forma de Pagamento */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-destructive" />
                  Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-semibold">{formatarFormaPagamento(pedido.forma_pagamento)}</p>
                  {pedido.precisa_troco && pedido.valor_troco && (
                    <p className="text-sm text-muted-foreground">
                      Troco para: R$ {pedido.valor_troco.toFixed(2).replace('.', ',')}
                    </p>
                  )}
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>R$ {pedido.subtotal.toFixed(2).replace('.', ',')}</span>
                    </div>
                    {pedido.taxa_entrega > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Taxa de entrega:</span>
                        <span>R$ {pedido.taxa_entrega.toFixed(2).replace('.', ',')}</span>
                      </div>
                    )}
                    {(pedido as any).taxa_extra_km > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Taxa extra (distância):</span>
                        <span className="text-warning-foreground">R$ {(pedido as any).taxa_extra_km.toFixed(2).replace('.', ',')}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg pt-1 border-t">
                      <span>Total:</span>
                      <span className="text-[color:var(--price-color-cliente)]">R$ {pedido.total.toFixed(2).replace('.', ',')}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ações */}
            <div className="space-y-3">
              <Button
                className="w-full bg-primary hover:bg-primary-hover text-white cursor-pointer"
                onClick={() => {
                  if (!configuracao.whatsapp) {
                    toast.error('WhatsApp não configurado. Entre em contato pelo telefone.')
                    return
                  }
                  const mensagem = `Olá! Preciso de ajuda com meu pedido #${getIdCurto()}`
                  const numeroLimpo = configuracao.whatsapp.replace(/\D/g, '')
                  const url = `https://wa.me/${numeroLimpo}?text=${encodeURIComponent(mensagem)}`
                  openWhatsApp(url)
                }}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Chamar Suporte
              </Button>

              <Button
                variant="outline"
                onClick={onVoltarMenu}
                className="w-full cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Menu
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Informações */}
      <InformacoesEstabelecimentoModal
        isOpen={modalInfoAberto}
        onClose={() => setModalInfoAberto(false)}
      />

      <BotoesFlutantes />

      {/* Footer */}
      <Footer nomeEstabelecimento={configuracao.nomeEstabelecimento} />

    </div>
  )
}