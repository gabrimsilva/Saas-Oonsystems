import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import toast from "react-hot-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  QrCode, 
  Copy, 
  CheckCircle, 
  Clock, 
  ArrowLeft,
  Loader2
} from "lucide-react"
import { supabase } from "@/services"
import { clienteService } from "@/lib/clienteService"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import InformacoesEstabelecimentoModal from "@/components/InformacoesEstabelecimentoModal"
import BotoesFlutantes from "@/components/delivery/BotoesFlutantes"

interface PixPaymentData {
  qr_code: string
  qr_code_base64: string
  payment_id: string
  transaction_amount: number
  expiration_date: string
}

export default function PagamentoPix() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const pedidoId = searchParams.get('pedido')
  
  const [pixData, setPixData] = useState<PixPaymentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'approved' | 'rejected' | 'expired'>('pending')
  const [modalInfoAberto, setModalInfoAberto] = useState(false)
  const [tempoRestante, setTempoRestante] = useState(10 * 60) // 10 minutos em segundos
  const [configuracao, setConfiguracao] = useState({
    nomeEstabelecimento: 'Sua Empresa',
    logoUrl: '',
    bannerUrl: ''
  })

  // Proteger contra navegação de volta do navegador
  useEffect(() => {
    // Substituir a entrada atual no histórico para evitar voltar ao checkout
    window.history.replaceState(null, '', window.location.href)
    
    // Adicionar uma entrada extra no histórico para capturar o botão voltar
    window.history.pushState(null, '', window.location.href)
    
    const handlePopState = () => {
      // Quando o usuário tenta voltar, redirecionar para o delivery
      navigate('/delivery', { replace: true })
    }
    
    window.addEventListener('popstate', handlePopState)
    
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [navigate])

  useEffect(() => {
    if (!pedidoId) {
      navigate('/delivery')
      return
    }

    carregarConfiguracoes()
    verificarPedidoECriarPix()
  }, [pedidoId])

  // Verifica se o pedido já foi pago antes de criar novo PIX
  const verificarPedidoECriarPix = async () => {
    try {
      setLoading(true)

      // Buscar dados do pedido
      const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos')
        .select('*')
        .eq('codigo_pedido', pedidoId)
        .single()

      if (pedidoError || !pedido) {
        console.error('Pedido não encontrado')
        navigate('/delivery')
        return
      }

      // Se o pedido já foi pago (status diferente de "Aguardando pagamento"), redirecionar
      if (pedido.status !== 'Aguardando pagamento') {
        navigate(`/meu-pedido/pedido-${pedidoId}`)
        return
      }

      // Se já existe um payment_id aprovado no Mercado Pago, verificar status
      if (pedido.mercado_pago_payment_id && pedido.mercado_pago_status === 'approved') {
        setPaymentStatus('approved')
        setTimeout(() => {
          navigate(`/meu-pedido/pedido-${pedidoId}`)
        }, 2000)
        return
      }

      // Se já existe um payment_id pendente, reutilizar ao invés de criar novo
      if (pedido.mercado_pago_payment_id && pedido.mercado_pago_status === 'pending') {
        await recuperarPagamentoExistente(pedido)
        return
      }

      // Caso contrário, criar novo pagamento PIX
      await criarPagamentoPix()
    } catch (error) {
      console.error('Erro ao verificar pedido:', error)
      navigate('/delivery')
    }
  }

  // Recupera dados de um pagamento PIX existente
  const recuperarPagamentoExistente = async (pedido: any) => {
    try {
      // Verificar status atual do pagamento no Mercado Pago
      const { data, error } = await supabase.functions.invoke('check-payment-status', {
        body: {
          payment_id: pedido.mercado_pago_payment_id
        }
      })

      if (error) {
        console.error('Erro ao verificar pagamento existente:', error)
        // Se não conseguir verificar, criar novo pagamento
        await criarPagamentoPix()
        return
      }

      // Se o pagamento foi aprovado enquanto isso
      if (data?.status === 'approved') {
        setPaymentStatus('approved')
        
        // Atualizar status do pedido
        await supabase
          .from('pedidos')
          .update({ 
            status: 'Pedido criado',
            forma_pagamento: 'pix',
            mercado_pago_status: 'approved'
          })
          .eq('codigo_pedido', pedidoId)

        setTimeout(() => {
          navigate(`/meu-pedido/pedido-${pedidoId}`)
        }, 2000)
        return
      }

      // Se o pagamento foi rejeitado ou expirou, criar novo
      if (data?.status === 'rejected' || data?.status === 'cancelled' || data?.status === 'expired') {
        await criarPagamentoPix()
        return
      }

      // Se ainda está pendente, recuperar os dados do QR Code
      if (data?.qr_code && data?.qr_code_base64) {
        // Calcular tempo restante baseado no timestamp de criação do pedido
        const criadoEm = new Date(pedido.criado_em).getTime()
        const agora = Date.now()
        const tempoDecorrido = Math.floor((agora - criadoEm) / 1000)
        const tempoRestanteCalculado = Math.max(0, (10 * 60) - tempoDecorrido)
        
        if (tempoRestanteCalculado === 0) {
          await cancelarPedidoExpirado()
          return
        }
        
        setTempoRestante(tempoRestanteCalculado)
        setPixData({
          qr_code: data.qr_code,
          qr_code_base64: data.qr_code_base64,
          payment_id: pedido.mercado_pago_payment_id,
          transaction_amount: pedido.total,
          expiration_date: data.expiration_date || ''
        })
        setLoading(false)
      } else {
        // Se não tem dados do QR Code, criar novo pagamento
        await criarPagamentoPix()
      }
    } catch (error) {
      console.error('Erro ao recuperar pagamento existente:', error)
      await criarPagamentoPix()
    }
  }

  // Polling para verificar status do pagamento
  useEffect(() => {
    if (!pixData || paymentStatus !== 'pending') return

    const interval = setInterval(async () => {
      await verificarStatusPagamento()
    }, 3000) // Verifica a cada 3 segundos

    return () => clearInterval(interval)
  }, [pixData, paymentStatus])

  // Timer de 10 minutos para expiração
  useEffect(() => {
    if (paymentStatus !== 'pending' || loading) return

    const timer = setInterval(() => {
      setTempoRestante(prev => {
        if (prev <= 1) {
          // Tempo expirou - cancelar pedido
          cancelarPedidoExpirado()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [paymentStatus, loading])

  const cancelarPedidoExpirado = async () => {
    try {
      // Buscar dados do pedido antes de cancelar (para decrementar estatísticas)
      const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos')
        .select('cliente_id, total')
        .eq('codigo_pedido', pedidoId)
        .single()

      if (pedidoError) {
        console.error('Erro ao buscar pedido:', pedidoError)
      }

      // Atualizar status do pedido para cancelado
      await supabase
        .from('pedidos')
        .update({ 
          status: 'Cancelado',
          cancelado: true,
          motivo_cancelamento: 'Tempo de pagamento PIX expirado (10 minutos)',
          cancelado_em: new Date().toISOString()
        })
        .eq('codigo_pedido', pedidoId)

      // Decrementar estatísticas do cliente (se houver cliente_id)
      if (pedido?.cliente_id && pedido?.total) {
        try {
          await clienteService.decrementarEstatisticas(pedido.cliente_id, pedido.total)
        } catch (estatisticasError) {
          console.error('Erro ao decrementar estatísticas do cliente:', estatisticasError)
          // Não bloquear o cancelamento se falhar
        }
      }

      // Adicionar ao histórico
      await supabase
        .from('historico_pedidos')
        .insert({
          pedido_id: pedidoId,
          status: 'Cancelado',
          observacao: 'Pedido cancelado automaticamente - tempo de pagamento PIX expirado'
        })

      setPaymentStatus('expired')
    } catch (error) {
      console.error('Erro ao cancelar pedido expirado:', error)
      setPaymentStatus('expired')
    }
  }

  const carregarConfiguracoes = async () => {
    try {
      const { data: configs } = await supabase
        .from('configuracoes')
        .select('chave, valor')
        .in('chave', ['nome_loja', 'logo_url', 'banner_url'])

      if (configs) {
        const configMap = configs.reduce((acc, config) => {
          acc[config.chave] = config.valor
          return acc
        }, {} as Record<string, string>)

        setConfiguracao({
          nomeEstabelecimento: configMap.nome_loja || 'Sua Empresa',
          logoUrl: configMap.logo_url || '',
          bannerUrl: configMap.banner_url || ''
        })
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    }
  }

  const criarPagamentoPix = async () => {
    try {
      setLoading(true)

      // Buscar dados do pedido
      const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos')
        .select('*')
        .eq('codigo_pedido', pedidoId)
        .single()

      if (pedidoError || !pedido) {
        throw new Error('Pedido não encontrado')
      }

      // Calcular tempo restante baseado no timestamp de criação do pedido
      const criadoEm = new Date(pedido.criado_em).getTime()
      const agora = Date.now()
      const tempoDecorrido = Math.floor((agora - criadoEm) / 1000) // em segundos
      const tempoRestanteCalculado = Math.max(0, (10 * 60) - tempoDecorrido)
      
      // Se já expirou, cancelar imediatamente
      if (tempoRestanteCalculado === 0) {
        await cancelarPedidoExpirado()
        return
      }
      
      setTempoRestante(tempoRestanteCalculado)

      // Preparar itens do pedido para o Mercado Pago
      const items = pedido.itens?.map((item: any) => ({
        id: item.produto?.id || item.id || 'item',
        title: item.produto?.nome || item.nome || 'Produto',
        description: item.produto?.descricao || item.descricao || `${item.produto?.nome || 'Produto'} - Pedido delivery`,
        category_id: 'food', // Categoria: food para delivery de comida
        quantity: item.quantidade || 1,
        unit_price: item.preco_unitario || item.preco || 0
      })) || []

      // Chamar Edge Function para criar pagamento PIX no Mercado Pago
      // (valor, referência e URL do webhook são definidos no servidor a partir do pedido)
      const { data, error } = await supabase.functions.invoke('create-pix-payment', {
        body: {
          pedido_id: pedido.id,
          description: `Pedido #${pedido.codigo_pedido} - Delivery`,
          payer: {
            email: pedido.cliente_email || 'cliente@email.com',
            first_name: pedido.cliente_nome,
            last_name: pedido.cliente_sobrenome || '',
            identification: {
              type: 'CPF',
              number: pedido.cliente_cpf || '00000000000'
            }
          },
          items: items
        }
      })

      if (error) {
        console.error('Erro ao criar pagamento PIX:', error)
        throw error
      }

      // Se o backend retornou erro de pedido já processado, redirecionar
      if (data?.error) {
        if (data.error === 'Pedido já processado' || data.error === 'Pagamento já aprovado') {
          navigate(`/meu-pedido/pedido-${pedidoId}`)
          return
        }
        throw new Error(data.message || data.error)
      }

      if (data && data.qr_code && data.qr_code_base64) {
        setPixData({
          qr_code: data.qr_code,
          qr_code_base64: data.qr_code_base64,
          payment_id: data.payment_id,
          transaction_amount: data.transaction_amount,
          expiration_date: data.expiration_date
        })
      } else {
        throw new Error('Dados do PIX inválidos')
      }
    } catch (error) {
      console.error('Erro ao criar pagamento PIX:', error)
      toast.error('Erro ao gerar QR Code do PIX. Tente novamente.')
      navigate('/delivery')
    } finally {
      setLoading(false)
    }
  }

  const verificarStatusPagamento = async () => {
    if (!pixData) return

    try {
      // Chamar Edge Function para verificar status do pagamento
      const { data, error } = await supabase.functions.invoke('check-payment-status', {
        body: {
          payment_id: pixData.payment_id
        }
      })

      if (error) {
        console.error('Erro ao verificar status:', error)
        return
      }

      if (data && data.status) {
        if (data.status === 'approved') {
          setPaymentStatus('approved')
          
          // Atualizar status do pedido no banco para "Pedido criado" (aparece no Kanban)
          await supabase
            .from('pedidos')
            .update({ 
              status: 'Pedido criado',
              forma_pagamento: 'pix'
            })
            .eq('codigo_pedido', pedidoId)

          // Adicionar ao histórico
          await supabase
            .from('historico_pedidos')
            .insert({
              pedido_id: pedidoId,
              status: 'Pedido criado',
              observacao: 'Pagamento via PIX confirmado pelo Mercado Pago'
            })

          // Envio de WhatsApp desabilitado para este projeto

          // Redirecionar para página do pedido após 2 segundos
          setTimeout(() => {
            navigate(`/meu-pedido/pedido-${pedidoId}`)
          }, 2000)
        } else if (data.status === 'rejected' || data.status === 'cancelled') {
          setPaymentStatus('rejected')
        }
      }
    } catch (error) {
      console.error('Erro ao verificar status do pagamento:', error)
    }
  }

  const copiarCodigoPix = () => {
    if (pixData) {
      navigator.clipboard.writeText(pixData.qr_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatarTempoRestante = () => {
    const minutos = Math.floor(tempoRestante / 60)
    const segundos = tempoRestante % 60
    return `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-destructive animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Gerando QR Code do PIX...</p>
        </div>
      </div>
    )
  }

  if (paymentStatus === 'approved') {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="w-20 h-20 text-success mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Pagamento Confirmado!</h2>
            <p className="text-muted-foreground mb-4">
              Seu pagamento via PIX foi confirmado com sucesso.
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecionando para o acompanhamento do pedido...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (paymentStatus === 'rejected') {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">❌</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Pagamento Não Realizado</h2>
            <p className="text-muted-foreground mb-6">
              O pagamento não foi confirmado. Por favor, tente novamente.
            </p>
            <Button 
              onClick={() => navigate('/delivery')}
              className="bg-primary hover:bg-primary-hover"
            >
              Voltar ao Cardápio
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (paymentStatus === 'expired') {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <div className="w-20 h-20 bg-warning/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-10 h-10 text-warning-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Tempo Expirado</h2>
            <p className="text-muted-foreground mb-6">
              O tempo para pagamento expirou e o pedido foi cancelado automaticamente.
            </p>
            <Button 
              onClick={() => navigate('/delivery')}
              className="bg-primary hover:bg-primary-hover"
            >
              Fazer Novo Pedido
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/50">
      <Header
        nomeEstabelecimento={configuracao.nomeEstabelecimento}
        logoUrl={configuracao.logoUrl}
        bannerUrl={configuracao.bannerUrl}
        onMaisInformacoes={() => setModalInfoAberto(true)}
      />

      <div className="max-w-2xl mx-auto p-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/delivery')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <Card>
          <CardHeader className="text-center border-b">
            <div className="flex items-center justify-center gap-2 mb-2">
              <QrCode className="w-6 h-6 text-destructive" />
              <CardTitle>Pagamento via PIX</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Escaneie o QR Code ou copie o código para pagar
            </p>
          </CardHeader>

          <CardContent className="pt-6">
            {/* Status e Valor */}
            <div className="text-center mb-6">
              <Badge variant="outline" className="mb-2">
                <Clock className="w-3 h-3 mr-1" />
                Aguardando Pagamento
              </Badge>
              <div className="text-3xl font-bold text-foreground mb-1">
                R$ {pixData?.transaction_amount.toFixed(2).replace('.', ',')}
              </div>
              <p className={`text-sm font-medium ${tempoRestante <= 60 ? 'text-destructive' : tempoRestante <= 180 ? 'text-warning-foreground' : 'text-muted-foreground'}`}>
                Expira em: {formatarTempoRestante()}
              </p>
            </div>

            {/* QR Code */}
            <div className="bg-card p-6 rounded-lg border-2 border-border mb-6">
              <div className="flex justify-center">
                {pixData?.qr_code_base64 && (
                  <img 
                    src={`data:image/png;base64,${pixData.qr_code_base64}`}
                    alt="QR Code PIX"
                    className="w-64 h-64"
                  />
                )}
              </div>
            </div>

            {/* Código Pix Copia e Cola */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground/80 block text-center">
                Ou copie o código PIX:
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={pixData?.qr_code || ''}
                  readOnly
                  className="flex-1 px-3 py-2 border border-input rounded-lg text-sm bg-muted/50 truncate"
                />
                <Button
                  onClick={copiarCodigoPix}
                  variant="outline"
                  className="flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-success" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copiar
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Instruções */}
            <div className="mt-6 p-4 bg-primary/5 rounded-lg">
              <h3 className="font-semibold text-sm text-primary mb-2">
                Como pagar com PIX:
              </h3>
              <ol className="text-sm text-primary space-y-1 list-decimal list-inside">
                <li>Abra o app do seu banco</li>
                <li>Escolha pagar com PIX</li>
                <li>Escaneie o QR Code ou cole o código</li>
                <li>Confirme o pagamento</li>
              </ol>
              <p className="text-xs text-primary mt-3">
                ⚡ O pagamento é confirmado na hora!
              </p>
            </div>

            {/* Aviso de verificação automática */}
            <div className="mt-4 text-center">
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Verificando pagamento automaticamente...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <InformacoesEstabelecimentoModal
        isOpen={modalInfoAberto}
        onClose={() => setModalInfoAberto(false)}
      />

      <BotoesFlutantes />

      <Footer nomeEstabelecimento={configuracao.nomeEstabelecimento} />

    </div>
  )
}
