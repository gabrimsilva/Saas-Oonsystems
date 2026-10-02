import { Button } from "@/components/ui/button"
import { DangerButton } from "@/components/ui/danger-button"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, RefreshCw, Bell, BellOff, History } from "lucide-react"
import { IndicadorConexao } from "./IndicadorConexao"

/**
 * Props do componente HeaderPedidos
 */
interface HeaderPedidosProps {
  /** Indica se há um novo pedido recebido */
  novoPedidoRecebido: boolean
  /** Indica se as notificações estão ativas */
  notificacoesAtivas: boolean
  /** Callback para alternar notificações */
  onToggleNotificacoes: () => void
  /** Callback para zerar pedidos */
  onZerarPedidos: () => void
  /** Callback para atualizar pedidos */
  onAtualizar: () => void
  /** Indica se está carregando */
  carregando: boolean
  /** Número total de pedidos */
  totalPedidos: number
  /** Status da conexão realtime */
  realtimeConectado: boolean
  /** Data/hora da última atualização */
  ultimaAtualizacao: Date
  /** Callback para reconectar realtime */
  onReconectar: () => void
  /** Variante de exibição (desktop ou mobile) */
  variante?: 'desktop' | 'mobile'
}

/**
 * Componente de header da página de pedidos
 * 
 * Exibe título, status da conexão, indicadores e botões de ação.
 * Possui versões desktop e mobile com layouts diferentes.
 * 
 * @example
 * ```tsx
 * // Versão desktop
 * <HeaderPedidos
 *   novoPedidoRecebido={novoPedidoRecebido}
 *   notificacoesAtivas={notificacoesAtivas}
 *   onToggleNotificacoes={handleToggleNotificacoes}
 *   onZerarPedidos={zerarPedidos}
 *   onAtualizar={() => carregarPedidos(true)}
 *   carregando={loading}
 *   totalPedidos={pedidos.length}
 *   realtimeConectado={realtimeConnected}
 *   ultimaAtualizacao={lastUpdate}
 *   onReconectar={reconectarRealtime}
 * />
 * 
 * // Versão mobile
 * <HeaderPedidos
 *   variante="mobile"
 *   {...props}
 * />
 * ```
 */
export function HeaderPedidos({
  novoPedidoRecebido,
  notificacoesAtivas,
  onToggleNotificacoes,
  onZerarPedidos,
  onAtualizar,
  carregando,
  totalPedidos,
  realtimeConectado,
  ultimaAtualizacao,
  onReconectar,
  variante = 'desktop'
}: HeaderPedidosProps) {
  // Versão Mobile
  if (variante === 'mobile') {
    return (
      <div className="md:hidden space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight flex items-center justify-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            Pedidos - Kanban
          </h1>
          <IndicadorConexao
            conectado={realtimeConectado}
            ultimaAtualizacao={ultimaAtualizacao}
            onReconectar={onReconectar}
            carregando={carregando}
            variante="mobile"
          />
        </div>

        <div className="space-y-2">
          {novoPedidoRecebido && (
            <Badge className="bg-success text-white animate-pulse w-full justify-center py-2">
              Novo pedido!
            </Badge>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleNotificacoes}
              className={`flex items-center justify-center gap-2 ${
                notificacoesAtivas
                  ? 'text-primary border-primary/20 hover:bg-primary/5'
                  : 'text-muted-foreground/70 border-border'
              }`}
            >
              {notificacoesAtivas ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              <span className="hidden sm:inline">
                {notificacoesAtivas ? 'Notificações' : 'Silencioso'}
              </span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onAtualizar}
              disabled={carregando}
              className="flex items-center justify-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${carregando ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <DangerButton
              size="sm"
              onClick={onZerarPedidos}
              loading={carregando}
              disabled={totalPedidos === 0}
              className="flex items-center justify-center gap-2"
            >
              <History className="h-4 w-4" />
              Zerar Pedidos
            </DangerButton>
          </div>
        </div>
      </div>
    )
  }

  // Versão Desktop
  return (
    <div className="hidden md:flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <ShoppingCart className="h-6 w-6" />
          Pedidos - Kanban
        </h1>
        <IndicadorConexao
          conectado={realtimeConectado}
          ultimaAtualizacao={ultimaAtualizacao}
          onReconectar={onReconectar}
          carregando={carregando}
          variante="desktop"
        />
      </div>

      <div className="flex items-center gap-3">
        {novoPedidoRecebido && (
          <Badge className="bg-success text-white animate-pulse">
            Novo pedido!
          </Badge>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onToggleNotificacoes}
          className={`flex items-center gap-2 ${
            notificacoesAtivas
              ? 'text-primary border-primary/20 hover:bg-primary/5'
              : 'text-muted-foreground/70 border-border'
          }`}
        >
          {notificacoesAtivas ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          {notificacoesAtivas ? 'Notificações' : 'Silencioso'}
        </Button>

        <DangerButton
          size="sm"
          onClick={onZerarPedidos}
          loading={carregando}
          disabled={totalPedidos === 0}
          className="flex items-center gap-2"
        >
          <History className="h-4 w-4" />
          Zerar Pedidos
        </DangerButton>

        <Button
          variant="outline"
          size="sm"
          onClick={onAtualizar}
          disabled={carregando}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${carregando ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>
    </div>
  )
}
