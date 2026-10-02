import { Package, ChefHat, CheckCircle, Truck, Clock, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { HistoricoPedidoSupabase, PedidoSupabase } from "@/services"

interface StatusTimelineProps {
  historico: HistoricoPedidoSupabase[]
  atualizandoRealtime?: boolean
  ultimaAtualizacao?: Date
  pedido?: PedidoSupabase
}

/**
 * Componente de Timeline de Status de Pedido
 * 
 * Exibe o histórico de status do pedido em tempo real com:
 * - Ícones coloridos por status
 * - Hora de cada atualização
 * - Observações do status
 * - Indicador de atualização em tempo real via Realtime
 * 
 * @example
 * <StatusTimeline 
 *   historico={historico} 
 *   atualizandoRealtime={true}
 *   ultimaAtualizacao={new Date()}
 *   pedido={pedido}
 * />
 */
export default function StatusTimeline({
  historico,
  atualizandoRealtime = false,
  ultimaAtualizacao = new Date(),
  pedido
}: StatusTimelineProps) {
  // Debug logging
  if (typeof window !== 'undefined') {
    console.log('StatusTimeline renderizado:', {
      historicoLength: historico?.length,
      historicoItems: historico,
      pedidoId: pedido?.pedido_id,
      codigoPedido: pedido?.codigo_pedido,
      atualizandoRealtime,
      ultimaAtualizacao: ultimaAtualizacao.toLocaleTimeString()
    })
  }

  /**
   * Formata hora em HH:mm
   */
  const formatarHora = (dataISO: string): string => {
    return new Date(dataISO).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  /**
   * Converte status genérico para status exibição
   * Ex: "Liberado" → "Saiu para entrega" (se delivery)
   */
  const getStatusExibicao = (status: string): string => {
    if (status === 'Liberado' && pedido) {
      return pedido.entrega_domicilio ? 'Saiu para entrega' : 'Pronto para retirada'
    }
    if (status === 'Finalizado' && pedido) {
      return pedido.entrega_domicilio ? 'Entregue' : 'Retirado'
    }
    return status
  }

  /**
   * Retorna cor do badge de status
   */
  const getStatusColor = (status: string): string => {
    const statusExibicao = getStatusExibicao(status)
    const statusLower = statusExibicao.toLowerCase()
    
    if (statusLower.includes('criado') || statusLower.includes('recebido')) return 'bg-primary'
    if (statusLower.includes('preparando') || statusLower.includes('cozinha')) return 'bg-warning'
    if (statusLower.includes('pronto') || statusLower.includes('liberado')) return 'bg-success'
    if (statusLower.includes('entrega') || statusLower.includes('saiu')) return 'bg-teal-600'
    if (statusLower.includes('finalizado') || statusLower.includes('entregue') || statusLower.includes('concluído')) return 'bg-success'
    if (statusLower.includes('cancelado')) return 'bg-destructive'
    
    return 'bg-gray-500'
  }

  /**
   * Retorna ícone do status
   */
  const getStatusIcon = (status: string) => {
    const statusExibicao = getStatusExibicao(status)
    const statusLower = statusExibicao.toLowerCase()
    
    if (statusLower.includes('criado') || statusLower.includes('recebido')) return <Package className="w-4 h-4" />
    if (statusLower.includes('preparando') || statusLower.includes('cozinha')) return <ChefHat className="w-4 h-4" />
    if (statusLower.includes('pronto') || statusLower.includes('liberado')) return <CheckCircle className="w-4 h-4" />
    if (statusLower.includes('entrega') || statusLower.includes('saiu')) return <Truck className="w-4 h-4" />
    if (statusLower.includes('finalizado') || statusLower.includes('entregue') || statusLower.includes('concluído')) return <CheckCircle className="w-4 h-4" />
    if (statusLower.includes('cancelado')) return <X className="w-4 h-4" />
    
    return <Clock className="w-4 h-4" />
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-destructive" />
            Acompanhe seu Pedido
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className={`w-2 h-2 rounded-full ${atualizandoRealtime ? 'bg-primary animate-pulse' : 'bg-success'}`}></div>
            <span>
              {atualizandoRealtime ? 'Atualizando...' : `Atualizado ${ultimaAtualizacao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {historico.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Nenhuma atualização de status ainda</p>
          </div>
        ) : (
          <div className="space-y-4">
            {historico.slice().reverse().map((item) => (
              <div key={item.id} className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 ${getStatusColor(item.status)}`}>
                  {getStatusIcon(item.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-foreground">{getStatusExibicao(item.status)}</h3>
                    <span className="text-sm text-muted-foreground flex-shrink-0">{formatarHora(item.criado_em)}</span>
                  </div>
                  {item.observacao && (
                    <p className="text-sm text-muted-foreground mt-1">{item.observacao}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
