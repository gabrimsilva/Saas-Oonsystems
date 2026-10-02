import { useState, useEffect } from "react"
import toast from "react-hot-toast"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DangerButton } from "@/components/ui/danger-button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Clock,
  Search,
  Eye,
  RefreshCw,
  Phone,
  MapPin,
  QrCode,
  AlertCircle,
  CheckCircle2
} from "lucide-react"
import { supabase, getEstabelecimentoAtivo } from "@/services"
import { lojaOnlineService } from "@/services/lojaOnlineService"
import { CarregandoPagina } from '@/components/ui/feedback'

interface PedidoAguardando {
  id: string
  pedido_id: string
  codigo_pedido?: string
  cliente_nome: string
  cliente_sobrenome: string
  cliente_telefone: string
  cliente_email?: string
  cliente_endereco?: string
  cliente_numero?: string
  cliente_complemento?: string
  cliente_bairro?: string
  cliente_cidade?: string
  cliente_estado?: string
  entrega_domicilio: boolean
  forma_pagamento: string
  subtotal: number
  taxa_entrega: number
  taxa_extra_km?: number
  total: number
  itens: any[]
  status: string
  observacoes?: string
  criado_em: string
  mercado_pago_payment_id?: string
  mercado_pago_status?: string
  origem?: string | null
}

export default function AguardandoPagamento() {
  const [pedidos, setPedidos] = useState<PedidoAguardando[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [pedidoSelecionado, setPedidoSelecionado] = useState<PedidoAguardando | null>(null)
  const [showDetalhesModal, setShowDetalhesModal] = useState(false)
  const [verificandoStatus, setVerificandoStatus] = useState<string | null>(null)
  const [limpandoExpirados, setLimpandoExpirados] = useState(false)
  const [showConfirmarLimpeza, setShowConfirmarLimpeza] = useState(false)
  const [showResultadoLimpeza, setShowResultadoLimpeza] = useState(false)
  const [resultadoLimpeza, setResultadoLimpeza] = useState({ cancelados: 0, mensagem: '' })

  useEffect(() => {
    carregarPedidosAguardando()

    // Atualizar a cada 10 segundos
    const interval = setInterval(() => {
      carregarPedidosAguardando()
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  const carregarPedidosAguardando = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .eq('status', 'Aguardando pagamento')
        .eq('estabelecimento_id', getEstabelecimentoAtivo() ?? '00000000-0000-0000-0000-000000000000')
        .order('criado_em', { ascending: false })

      if (error) {
        console.error('Erro ao carregar pedidos aguardando:', error)
        return
      }

      setPedidos(data || [])
    } catch (error) {
      console.error('Erro ao carregar pedidos aguardando:', error)
    } finally {
      setLoading(false)
    }
  }

  const verificarStatusPagamento = async (pedido: PedidoAguardando) => {
    // Pedido do catálogo (Checkout Pro): o servidor procura o pagamento pelo pedido
    if (pedido.origem === 'catalogo') {
      try {
        setVerificandoStatus(pedido.pedido_id)
        const status = await lojaOnlineService.consultarPedido(pedido.id)
        if (status.status_pagamento === 'approved') {
          toast.success('Pagamento aprovado! O pedido foi para o Kanban.')
        } else if (status.cancelado) {
          toast('Pedido cancelado', { icon: 'ℹ️' })
        } else {
          toast('Pagamento ainda não confirmado', { icon: '⏳' })
        }
        await carregarPedidosAguardando()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erro ao verificar status do pagamento')
      } finally {
        setVerificandoStatus(null)
      }
      return
    }

    if (!pedido.mercado_pago_payment_id) {
      toast.error('ID de pagamento não encontrado')
      return
    }

    try {
      setVerificandoStatus(pedido.pedido_id)

      const { data, error } = await supabase.functions.invoke('check-payment-status', {
        body: {
          payment_id: pedido.mercado_pago_payment_id
        }
      })

      if (error) {
        console.error('Erro ao verificar status:', error)
        toast.error('Erro ao verificar status do pagamento')
        return
      }

      if (data && data.status === 'approved') {
        toast.success('Pagamento aprovado! O pedido será atualizado automaticamente.')
        await carregarPedidosAguardando()
      } else if (data && data.status === 'pending') {
        toast('Pagamento ainda está pendente', { icon: '⏳' })
      } else {
        toast(`Status do pagamento: ${data?.status || 'desconhecido'}`, { icon: 'ℹ️' })
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error)
      toast.error('Erro ao verificar status do pagamento')
    } finally {
      setVerificandoStatus(null)
    }
  }

  const confirmarLimpezaExpirados = () => {
    setShowConfirmarLimpeza(true)
  }

  const limparPedidosExpirados = async () => {
    setShowConfirmarLimpeza(false)

    try {
      setLimpandoExpirados(true)

      const { data, error } = await supabase.functions.invoke('cancelar-pedidos-expirados')

      if (error) {
        console.error('Erro ao limpar pedidos expirados:', error)
        setResultadoLimpeza({
          cancelados: 0,
          mensagem: 'Erro ao limpar pedidos expirados. Tente novamente.'
        })
        setShowResultadoLimpeza(true)
        return
      }

      if (data) {
        setResultadoLimpeza({
          cancelados: data.cancelados || 0,
          mensagem: data.cancelados > 0 
            ? `${data.cancelados} pedido(s) expirado(s) cancelado(s) com sucesso!`
            : 'Nenhum pedido expirado encontrado.'
        })
        setShowResultadoLimpeza(true)
        await carregarPedidosAguardando()
      }
    } catch (error) {
      console.error('Erro ao limpar pedidos expirados:', error)
      setResultadoLimpeza({
        cancelados: 0,
        mensagem: 'Erro ao limpar pedidos expirados. Tente novamente.'
      })
      setShowResultadoLimpeza(true)
    } finally {
      setLimpandoExpirados(false)
    }
  }

  const formatarData = (dataISO: string) => {
    return new Date(dataISO).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatarHora = (dataISO: string) => {
    return new Date(dataISO).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const calcularTempoEspera = (dataISO: string) => {
    const agora = new Date()
    const criado = new Date(dataISO)
    const diff = agora.getTime() - criado.getTime()
    const minutos = Math.floor(diff / 60000)
    
    if (minutos < 60) {
      return `${minutos} min`
    } else {
      const horas = Math.floor(minutos / 60)
      const mins = minutos % 60
      return `${horas}h ${mins}min`
    }
  }

  const pedidosFiltrados = pedidos.filter(pedido => {
    const termo = searchTerm.toLowerCase().trim()
    if (!termo) return true

    const nomeMatch = pedido.cliente_nome.toLowerCase().includes(termo)
    const telefoneOriginal = pedido.cliente_telefone || ''
    const telefoneNumeros = telefoneOriginal.replace(/\D/g, '')
    const termoNumeros = termo.replace(/\D/g, '')
    const telefoneMatch = telefoneOriginal.toLowerCase().includes(termo) ||
      (termoNumeros && telefoneNumeros.includes(termoNumeros))
    const pedidoId = pedido.pedido_id || ''
    const codigoPedido = pedido.codigo_pedido || ''
    const termoSemHash = termo.replace('#', '')
    const idMatch = pedidoId.toLowerCase().includes(termo) ||
      pedidoId.toLowerCase().includes(termoSemHash) ||
      codigoPedido.toLowerCase().includes(termo) ||
      codigoPedido.toLowerCase().includes(termoSemHash)

    return nomeMatch || telefoneMatch || idMatch
  })

  const verDetalhes = (pedido: PedidoAguardando) => {
    setPedidoSelecionado(pedido)
    setShowDetalhesModal(true)
  }

  if (loading) {
    return <CarregandoPagina variante="cartoes" />
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Desktop */}
      <div className="hidden md:flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Clock className="h-6 w-6 text-warning-foreground" />
            Aguardando Pagamento
          </h1>
          <p className="text-muted-foreground">
            Pedidos PIX aguardando confirmação de pagamento
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm bg-warning/10 border-warning/30 text-warning-foreground">
            {pedidos.length} {pedidos.length === 1 ? 'pedido aguardando' : 'pedidos aguardando'}
          </Badge>

          <DangerButton
            variant="outline"
            size="sm"
            onClick={confirmarLimpezaExpirados}
            loading={limpandoExpirados}
            className="border-destructive/40 text-destructive hover:bg-destructive/5"
          >
            <Clock className="h-4 w-4" />
            Limpar Expirados
          </DangerButton>

          <Button
            variant="outline"
            size="sm"
            onClick={carregarPedidosAguardando}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Header Mobile */}
      <div className="md:hidden space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight flex items-center justify-center gap-2">
            <Clock className="h-6 w-6 text-warning-foreground" />
            Aguardando Pagamento
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            Pedidos PIX aguardando confirmação
          </p>
        </div>
        
        <div className="flex flex-col gap-3">
          <Badge variant="outline" className="text-sm text-center py-2 bg-warning/10 border-warning/30 text-warning-foreground">
            {pedidos.length} {pedidos.length === 1 ? 'pedido aguardando' : 'pedidos aguardando'}
          </Badge>

          <DangerButton
            variant="outline"
            onClick={confirmarLimpezaExpirados}
            loading={limpandoExpirados}
            className="w-full border-destructive/40 text-destructive hover:bg-destructive/5"
          >
            <Clock className="h-4 w-4" />
            Limpar Expirados
          </DangerButton>

          <Button
            variant="outline"
            onClick={carregarPedidosAguardando}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          id="buscar-aguardando"
          name="buscar-aguardando"
          placeholder="Buscar por nome, telefone ou #ID..."
          className="pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Alerta se não houver pedidos */}
      {pedidos.length === 0 && (
        <div className="border border-success/30 bg-success/5 rounded-lg p-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
          <h3 className="font-semibold text-success mb-1">Nenhum pedido aguardando pagamento</h3>
          <p className="text-sm text-success">
            Todos os pedidos PIX foram pagos ou não há pedidos pendentes no momento.
          </p>
        </div>
      )}

      {/* Tabela */}
      {pedidos.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[80px]">ID</TableHead>
                  <TableHead className="min-w-[200px]">Cliente</TableHead>
                  <TableHead className="min-w-[140px]">Telefone</TableHead>
                  <TableHead className="min-w-[100px]">Total</TableHead>
                  <TableHead className="min-w-[100px]">Aguardando</TableHead>
                  <TableHead className="min-w-[120px]">Criado em</TableHead>
                  <TableHead className="min-w-[140px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedidosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum pedido encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  pedidosFiltrados.map((pedido) => (
                    <TableRow key={pedido.id} className="bg-warning/5">
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs border-warning/40">
                          #{pedido.codigo_pedido || pedido.pedido_id.slice(-4)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">
                            {pedido.cliente_nome} {pedido.cliente_sobrenome}
                          </div>
                          {pedido.cliente_email && (
                            <div className="text-xs text-muted-foreground truncate max-w-[180px]">{pedido.cliente_email}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{pedido.cliente_telefone}</TableCell>
                      <TableCell>
                        <span className="font-bold text-warning-foreground text-sm">
                          R$ {pedido.total.toFixed(2).replace('.', ',')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-warning/15 text-warning-foreground border-warning/40">
                          <Clock className="h-3 w-3 mr-1" />
                          {calcularTempoEspera(pedido.criado_em)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{formatarData(pedido.criado_em)}</div>
                          <div className="text-xs text-muted-foreground">{formatarHora(pedido.criado_em)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => verDetalhes(pedido)}
                            className="flex items-center gap-1 text-xs px-2 py-1"
                          >
                            <Eye className="h-3 w-3" />
                            Ver
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => verificarStatusPagamento(pedido)}
                            disabled={verificandoStatus === pedido.pedido_id}
                            className="flex items-center gap-1 text-xs px-2 py-1 border-warning/40 text-warning-foreground hover:bg-warning/10"
                          >
                            {verificandoStatus === pedido.pedido_id ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <QrCode className="h-3 w-3" />
                            )}
                            Status
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Modal de Detalhes */}
      <Dialog open={showDetalhesModal} onOpenChange={setShowDetalhesModal}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning-foreground" />
              Pedido #{pedidoSelecionado?.codigo_pedido || pedidoSelecionado?.pedido_id.slice(-4)}
            </DialogTitle>
            <DialogDescription>
              Aguardando confirmação de pagamento PIX
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4 min-h-0">
            {pedidoSelecionado && (
              <div className="space-y-6">
                {/* Alerta de Pagamento Pendente */}
                <div className="bg-warning/10 border border-warning/30 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-warning-foreground mt-0.5" />
                    <div>
                      <h4 className="font-medium text-warning-foreground">Pagamento PIX Pendente</h4>
                      <p className="text-sm text-warning-foreground mt-1">
                        Este pedido está aguardando a confirmação do pagamento via PIX.
                        O status será atualizado automaticamente quando o pagamento for aprovado.
                      </p>
                      <p className="text-xs text-warning-foreground mt-2">
                        Aguardando há: <strong>{calcularTempoEspera(pedidoSelecionado.criado_em)}</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dados Pessoais */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-foreground flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Dados Pessoais
                  </h3>
                  <div className="space-y-2 bg-muted/50 p-4 rounded-lg">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nome:</span>
                      <span className="font-medium">{pedidoSelecionado.cliente_nome} {pedidoSelecionado.cliente_sobrenome}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Telefone:</span>
                      <span className="font-medium">{pedidoSelecionado.cliente_telefone}</span>
                    </div>
                    {pedidoSelecionado.cliente_email && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-medium">{pedidoSelecionado.cliente_email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dados de Entrega */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Dados de Entrega
                  </h3>
                  <div className="space-y-2 bg-muted/50 p-4 rounded-lg">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tipo:</span>
                      <span className="font-medium">
                        {pedidoSelecionado.entrega_domicilio ? 'Entrega a Domicílio' : 'Retirada no Local'}
                      </span>
                    </div>
                    {pedidoSelecionado.entrega_domicilio && pedidoSelecionado.cliente_endereco && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Endereço:</span>
                          <span className="font-medium text-right">
                            {pedidoSelecionado.cliente_endereco}, {pedidoSelecionado.cliente_numero}
                            {pedidoSelecionado.cliente_complemento && <br />}{pedidoSelecionado.cliente_complemento}
                          </span>
                        </div>
                        {pedidoSelecionado.cliente_bairro && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Bairro:</span>
                            <span className="font-medium">{pedidoSelecionado.cliente_bairro}</span>
                          </div>
                        )}
                        {pedidoSelecionado.cliente_cidade && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Cidade:</span>
                            <span className="font-medium">{pedidoSelecionado.cliente_cidade} - {pedidoSelecionado.cliente_estado}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Itens do Pedido */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-foreground">Itens do Pedido</h3>
                  <div className="space-y-3">
                    {pedidoSelecionado.itens.map((item: any, index: number) => (
                      <div key={index} className="border border-border p-3 rounded-lg">
                        <div className="font-medium text-foreground">
                          {item.quantidade}x {item.produto.nome}
                        </div>
                        {item.tamanhoSelecionado && (
                          <div className="text-sm text-muted-foreground">
                            Tamanho: {item.tamanhoSelecionado.nome} ({item.tamanhoSelecionado.tamanho})
                          </div>
                        )}
                        {item.saboresSelecionados && item.saboresSelecionados.length > 0 && (
                          <div className="text-sm text-muted-foreground">
                            Sabores: {item.saboresSelecionados.map((s: any) => s.nome).join(', ')}
                          </div>
                        )}
                        {item.bordaSelecionada && (
                          <div className="text-sm text-muted-foreground">
                            Borda: {item.bordaSelecionada.nome}
                          </div>
                        )}
                        {item.adicionaisSelecionados && item.adicionaisSelecionados.length > 0 && (
                          <div className="text-sm text-muted-foreground">
                            Adicionais: {item.adicionaisSelecionados.map((a: any) => `${a.quantidade}x ${a.nome}`).join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resumo Financeiro */}
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">R$ {pedidoSelecionado.subtotal.toFixed(2).replace('.', ',')}</span>
                  </div>
                  {pedidoSelecionado.taxa_entrega > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Taxa de entrega:</span>
                      <span className="font-medium">R$ {pedidoSelecionado.taxa_entrega.toFixed(2).replace('.', ',')}</span>
                    </div>
                  )}
                  {pedidoSelecionado.taxa_extra_km && pedidoSelecionado.taxa_extra_km > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Taxa extra (dist.):</span>
                      <span className="font-medium">R$ {pedidoSelecionado.taxa_extra_km.toFixed(2).replace('.', ',')}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-border">
                    <span className="font-semibold text-foreground">Total:</span>
                    <span className="font-bold text-warning-foreground text-lg">
                      R$ {pedidoSelecionado.total.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>

                {/* Botão de Verificar Status */}
                <Button
                  onClick={() => verificarStatusPagamento(pedidoSelecionado)}
                  disabled={verificandoStatus === pedidoSelecionado.pedido_id}
                  className="w-full"
                >
                  {verificandoStatus === pedidoSelecionado.pedido_id ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <QrCode className="h-4 w-4 mr-2" />
                      Verificar Status do Pagamento
                    </>
                  )}
                </Button>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de Confirmação de Limpeza */}
      <AlertDialog open={showConfirmarLimpeza} onOpenChange={setShowConfirmarLimpeza}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Pedidos Expirados</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja cancelar todos os pedidos PIX que estão aguardando há mais de 10 minutos?
              <br /><br />
              Esta ação não pode ser desfeita. Os pedidos serão marcados como cancelados automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <DangerButton 
              onClick={limparPedidosExpirados}
              loading={limpandoExpirados}
            >
              Confirmar Limpeza
            </DangerButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog de Resultado da Limpeza */}
      <AlertDialog open={showResultadoLimpeza} onOpenChange={setShowResultadoLimpeza}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {resultadoLimpeza.cancelados > 0 ? 'Limpeza Concluída' : 'Nenhum Pedido Expirado'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {resultadoLimpeza.mensagem}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowResultadoLimpeza(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
