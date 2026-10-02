import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Package, 
  ChefHat, 
  CheckCircle, 
  Truck, 
  Search, 
  Calendar,
  DollarSign,
  User,
  Phone,
  MapPin,
  Clock,
  Filter,
  X,
  Eye,
  Printer
} from "lucide-react"
import { pedidoService } from "@/services"
import { printJobService } from "@/services/printJobService"
import type { PedidoSupabase } from "@/types/supabase"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import VisualizarCupomModal from "@/components/VisualizarCupomModal"
import toast from "react-hot-toast"

/**
 * Página de Acompanhamento de Pedidos Delivery
 * 
 * Exibe lista completa de pedidos com filtros por:
 * - Período
 * - Status
 * - Forma de pagamento
 */
export default function AcompanhamentoPedidos() {
  const [pedidos, setPedidos] = useState<PedidoSupabase[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState("")
  const [filtroStatus, setFiltroStatus] = useState<string>("todos")
  const [filtroPagamento, setFiltroPagamento] = useState<string>("todos")
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>("hoje")
  const [cupomModalAberto, setCupomModalAberto] = useState(false)
  const [pedidoSelecionado, setPedidoSelecionado] = useState<PedidoSupabase | null>(null)
  const [imprimindo, setImprimindo] = useState<string | null>(null)

  // Carregar pedidos
  useEffect(() => {
    carregarPedidos()
  }, [])

  const carregarPedidos = async () => {
    try {
      setLoading(true)
      const todosPedidos = await pedidoService.buscarTodos(1000)
      setPedidos(todosPedidos)
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filtrar pedidos
  const pedidosFiltrados = useMemo(() => {
    let resultado = [...pedidos]

    // Filtro de busca (nome, telefone, código)
    if (busca) {
      const buscaLower = busca.toLowerCase()
      resultado = resultado.filter(p => 
        p.cliente_nome?.toLowerCase().includes(buscaLower) ||
        p.cliente_telefone?.includes(busca) ||
        p.codigo_pedido?.includes(busca) ||
        p.pedido_id?.includes(busca)
      )
    }

    // Filtro de status
    if (filtroStatus !== "todos") {
      resultado = resultado.filter(p => p.status === filtroStatus)
    }

    // Filtro de forma de pagamento
    if (filtroPagamento !== "todos") {
      resultado = resultado.filter(p => p.forma_pagamento === filtroPagamento)
    }

    // Filtro de período (timezone-safe)
    if (filtroPeriodo !== "todos") {
      const agora = new Date()
      const anoAtual = agora.getFullYear()
      const mesAtual = agora.getMonth()
      const diaAtual = agora.getDate()
      
      if (filtroPeriodo === "hoje") {
        const inicioDiaStr = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(diaAtual).padStart(2, '0')}T00:00:00Z`
        const inicioDia = new Date(inicioDiaStr)
        resultado = resultado.filter(p => {
          const dataPedidoStr = p.criado_em.split('T')[0] + 'T00:00:00Z'
          const dataPedido = new Date(dataPedidoStr)
          return dataPedido >= inicioDia
        })
      } else if (filtroPeriodo === "semana") {
        const inicioSemana = new Date(agora)
        inicioSemana.setDate(diaAtual - 7)
        const anoSemana = inicioSemana.getFullYear()
        const mesSemana = inicioSemana.getMonth()
        const diaSemana = inicioSemana.getDate()
        const inicioSemanaStr = `${anoSemana}-${String(mesSemana + 1).padStart(2, '0')}-${String(diaSemana).padStart(2, '0')}T00:00:00Z`
        const inicioSemanaDate = new Date(inicioSemanaStr)
        resultado = resultado.filter(p => {
          const dataPedidoStr = p.criado_em.split('T')[0] + 'T00:00:00Z'
          const dataPedido = new Date(dataPedidoStr)
          return dataPedido >= inicioSemanaDate
        })
      } else if (filtroPeriodo === "mes") {
        const inicioMesStr = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-01T00:00:00Z`
        const inicioMes = new Date(inicioMesStr)
        resultado = resultado.filter(p => {
          const dataPedidoStr = p.criado_em.split('T')[0] + 'T00:00:00Z'
          const dataPedido = new Date(dataPedidoStr)
          return dataPedido >= inicioMes
        })
      }
    }

    // Ordenar por mais recente
    return resultado.sort((a, b) => 
      new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
    )
  }, [pedidos, busca, filtroStatus, filtroPagamento, filtroPeriodo])

  // Estatísticas
  const estatisticas = useMemo(() => {
    const total = pedidosFiltrados.length
    const recebidos = pedidosFiltrados.filter(p => p.status === 'Pedido criado').length
    const preparando = pedidosFiltrados.filter(p => p.status === 'Preparando').length
    const liberados = pedidosFiltrados.filter(p => p.status === 'Liberado').length
    const finalizados = pedidosFiltrados.filter(p => p.status === 'Finalizado').length
    const faturamento = pedidosFiltrados.reduce((sum, p) => sum + (p.total || 0), 0)

    return { total, recebidos, preparando, liberados, finalizados, faturamento }
  }, [pedidosFiltrados])

  // Função para obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pedido criado': return 'bg-primary/10 text-primary'
      case 'Preparando': return 'bg-warning/15 text-warning-foreground'
      case 'Liberado': return 'bg-success/10 text-success'
      case 'Finalizado': return 'bg-primary/10 text-primary'
      default: return 'bg-muted text-foreground'
    }
  }

  // Função para obter ícone do status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pedido criado': return <Package className="h-4 w-4" />
      case 'Preparando': return <ChefHat className="h-4 w-4" />
      case 'Liberado': return <CheckCircle className="h-4 w-4" />
      case 'Finalizado': return <Truck className="h-4 w-4" />
      default: return <Package className="h-4 w-4" />
    }
  }

  // Limpar filtros
  const limparFiltros = () => {
    setBusca("")
    setFiltroStatus("todos")
    setFiltroPagamento("todos")
    setFiltroPeriodo("hoje")
  }

  const [cupomHTML, setCupomHTML] = useState<string>('')

  // Visualizar cupom do pedido
  const handleVisualizarCupom = async (pedido: PedidoSupabase) => {
    try {
      setPedidoSelecionado(pedido)
      
      // Gerar HTML do cupom
      const { receiptService } = await import('@/services/receiptService')
      const html = await receiptService.generateOrderReceipt(pedido)
      setCupomHTML(html)
      
      setCupomModalAberto(true)
    } catch (error) {
      console.error('Erro ao carregar cupom:', error)
      toast.error('Erro ao carregar cupom')
    }
  }

  // Imprimir cupom do pedido
  const handleImprimirCupom = async (pedido: PedidoSupabase) => {
    try {
      setImprimindo(pedido.id)
      const resultado = await printJobService.print(pedido.id, 'ORDER')
      
      if (resultado.success) {
        if (resultado.method === 'qz') {
          toast.success('Cupom enviado para impressora!')
        } else {
          toast.success('Abrindo janela de impressão...')
        }
      } else {
        toast.error(resultado.error || 'Erro ao imprimir cupom')
      }
    } catch (error) {
      console.error('Erro ao imprimir:', error)
      toast.error('Erro ao imprimir cupom')
    } finally {
      setImprimindo(null)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Acompanhamento de Pedidos</h1>
        <p className="text-muted-foreground">
          Visualize e gerencie todos os pedidos delivery
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estatisticas.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Novos Pedidos</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estatisticas.recebidos}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Separação</CardTitle>
            <ChefHat className="h-4 w-4 text-warning-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estatisticas.preparando}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prontos p/ Entrega</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estatisticas.liberados}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entregues</CardTitle>
            <Truck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estatisticas.finalizados}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento</CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {estatisticas.faturamento.toFixed(2).replace('.', ',')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
            <Button variant="outline" size="sm" onClick={limparFiltros}>
              <X className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone ou código..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Período */}
            <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hoje">Hoje</SelectItem>
                <SelectItem value="semana">Última semana</SelectItem>
                <SelectItem value="mes">Último mês</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>

            {/* Status */}
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="Pedido criado">Novos Pedidos</SelectItem>
                <SelectItem value="Preparando">Em Separação</SelectItem>
                <SelectItem value="Liberado">Prontos p/ Entrega</SelectItem>
                <SelectItem value="Finalizado">Entregues</SelectItem>
              </SelectContent>
            </Select>

            {/* Forma de Pagamento */}
            <Select value={filtroPagamento} onValueChange={setFiltroPagamento}>
              <SelectTrigger>
                <SelectValue placeholder="Pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as formas</SelectItem>
                <SelectItem value="PIX">PIX</SelectItem>
                <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                <SelectItem value="Cartão de Débito">Débito</SelectItem>
                <SelectItem value="Cartão de Crédito">Crédito</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Pedidos */}
      <Card>
        <CardHeader>
          <CardTitle>Pedidos ({pedidosFiltrados.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando pedidos...
            </div>
          ) : pedidosFiltrados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum pedido encontrado
            </div>
          ) : (
            <div className="space-y-4">
              {pedidosFiltrados.map((pedido) => (
                <Card key={pedido.id} className="border-l-4" style={{
                  borderLeftColor: 
                    pedido.status === 'Pedido criado' ? '#3b82f6' :
                    pedido.status === 'Preparando' ? '#eab308' :
                    pedido.status === 'Liberado' ? '#22c55e' :
                    '#a855f7'
                }}>
                  <CardContent className="pt-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      {/* Coluna 1: Pedido e Cliente */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg">
                            #{pedido.codigo_pedido || pedido.pedido_id.slice(0, 8)}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(pedido.status)}`}>
                            {getStatusIcon(pedido.status)}
                            {pedido.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{pedido.cliente_nome} {pedido.cliente_sobrenome || ''}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{pedido.cliente_telefone}</span>
                        </div>
                      </div>

                      {/* Coluna 2: Endereço */}
                      <div className="space-y-2">
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            {pedido.entrega_domicilio ? (
                              <>
                                <div>{pedido.cliente_endereco}</div>
                                {pedido.cliente_complemento && (
                                  <div className="text-muted-foreground">{pedido.cliente_complemento}</div>
                                )}
                                <div className="text-muted-foreground">
                                  {pedido.cliente_cidade} - {pedido.cliente_estado}
                                </div>
                              </>
                            ) : (
                              <span className="font-medium">Retirada no local</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Coluna 3: Pagamento e Valores */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{pedido.forma_pagamento}</span>
                        </div>
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal:</span>
                            <span>R$ {pedido.subtotal?.toFixed(2).replace('.', ',')}</span>
                          </div>
                          {pedido.taxa_entrega > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Taxa:</span>
                              <span>R$ {pedido.taxa_entrega.toFixed(2).replace('.', ',')}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold">
                            <span>Total:</span>
                            <span className="text-success">
                              R$ {pedido.total?.toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Coluna 4: Data e Hora */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {format(new Date(pedido.criado_em), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {format(new Date(pedido.criado_em), "HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        {pedido.previsao_entrega && (
                          <div className="text-sm text-muted-foreground">
                            Previsão: {pedido.previsao_entrega}
                          </div>
                        )}
                        
                        {/* Botões de Ação */}
                        <div className="flex gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVisualizarCupom(pedido)}
                            className="flex items-center gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            Ver Cupom
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleImprimirCupom(pedido)}
                            disabled={imprimindo === pedido.id}
                            className="flex items-center gap-1"
                          >
                            <Printer className="h-4 w-4" />
                            {imprimindo === pedido.id ? 'Imprimindo...' : 'Imprimir'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Visualização de Cupom */}
      {pedidoSelecionado && cupomHTML && (
        <VisualizarCupomModal
          isOpen={cupomModalAberto}
          onClose={() => {
            setCupomModalAberto(false)
            setPedidoSelecionado(null)
            setCupomHTML('')
          }}
          cupomHTML={cupomHTML}
          titulo={`Cupom do Pedido #${pedidoSelecionado.codigo_pedido || pedidoSelecionado.pedido_id}`}
          numero={pedidoSelecionado.codigo_pedido || pedidoSelecionado.pedido_id || ''}
          onImprimir={async () => {
            await handleImprimirCupom(pedidoSelecionado)
          }}
        />
      )}
    </div>
  )
}
