import { memo } from 'react'
import { Droppable, Draggable } from '@hello-pangea/dnd'
import { Badge } from "@/components/ui/badge"
import { Clock, type LucideIcon } from "lucide-react"
import { type PedidoSupabase } from "@/services"
import PedidoCard from "@/components/PedidoCard"

/**
 * Configuração de uma coluna do Kanban
 */
export interface ColunaConfig {
  /**
   * ID único da coluna (usado como droppableId)
   */
  id: string
  /**
   * Título exibido no header da coluna
   */
  title: string
  /**
   * Ícone da coluna
   */
  icon: LucideIcon
  /**
   * Classes CSS para o background e borda do header
   */
  color: string
  /**
   * Classes CSS para o badge de contagem
   */
  badgeColor: string
}

/**
 * Props do componente ColunaKanban
 */
interface ColunaKanbanProps {
  /**
   * Configuração da coluna
   */
  config: ColunaConfig
  /**
   * Lista de pedidos a serem exibidos na coluna
   */
  pedidos: PedidoSupabase[]
  /**
   * Callback chamado quando o status de um pedido é alterado
   */
  onStatusChange: (pedidoId: string, novoStatus: string) => void
  /**
   * Callback chamado quando um pedido é cancelado
   */
  onCancelar?: (pedidoId: string, dados: any) => void
  /**
   * Altura mínima da área de drop (opcional)
   * @default "300px" (mobile) / "400px" (desktop)
   */
  minHeight?: string
}

/**
 * Componente de coluna do Kanban para gerenciamento de pedidos
 *
 * Exibe uma coluna do quadro Kanban com:
 * - Header com ícone, título e contador de pedidos
 * - Área de drop para drag and drop
 * - Lista de cards de pedidos
 * - Mensagem quando não há pedidos
 *
 * Memoizado para evitar re-renderizações desnecessárias de colunas
 * que não tiveram mudanças em seus pedidos.
 *
 * Integrado com @hello-pangea/dnd para funcionalidade de drag and drop.
 *
 * @example
 * ```tsx
 * <ColunaKanban
 *   config={{
 *     id: 'Pedido criado',
 *     title: 'Recebidos',
 *     icon: Package,
 *     color: 'bg-primary/5 border-primary/15',
 *     badgeColor: 'bg-primary/10 text-primary'
 *   }}
 *   pedidos={pedidosRecebidos}
 *   onStatusChange={handleStatusChange}
 * />
 * ```
 */
function ColunaKanban({
  config,
  pedidos,
  onStatusChange,
  onCancelar,
  minHeight
}: ColunaKanbanProps) {
  const Icon = config.icon

  return (
    <div className="space-y-4">
      {/* Header da coluna */}
      <div className={`${config.color} border-2 rounded-full px-2 md:px-4 py-1 md:py-2 flex items-center justify-center gap-1 md:gap-2`}>
        <Icon className="w-3 h-3 md:w-4 md:h-4" />
        <span className="text-xs md:text-sm font-medium">{config.title}</span>
        <Badge className={`${config.badgeColor} text-xs px-1 md:px-2 py-0.5`}>
          {pedidos.length}
        </Badge>
      </div>

      {/* Cards dos pedidos com drag and drop */}
      <Droppable droppableId={config.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`space-y-2 md:space-y-3 p-1 md:p-2 rounded-lg transition-colors ${
              snapshot.isDraggingOver ? 'bg-primary/5 border-2 border-primary/30 border-dashed' : ''
            }`}
            style={{
              minHeight: minHeight || 'min(300px, 400px)'
            }}
          >
            {pedidos.map((pedido, index) => (
              <Draggable key={pedido.pedido_id} draggableId={pedido.pedido_id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={snapshot.isDragging ? 'rotate-3 shadow-lg' : ''}
                  >
                    <PedidoCard
                      pedido={pedido}
                      onStatusChange={onStatusChange}
                      onCancelar={onCancelar}
                      isDragging={snapshot.isDragging}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}

            {/* Mensagem quando não há pedidos */}
            {pedidos.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum pedido</p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  )
}

/**
 * Comparador customizado para React.memo
 * Só re-renderiza se pedidos, config ou callbacks mudarem
 */
function areEqual(prevProps: ColunaKanbanProps, nextProps: ColunaKanbanProps) {
  // Verificar se config mudou
  if (prevProps.config.id !== nextProps.config.id) return false

  // Verificar se quantidade de pedidos mudou
  if (prevProps.pedidos.length !== nextProps.pedidos.length) return false

  // Verificar se IDs dos pedidos mudaram (ordem ou conteúdo)
  for (let i = 0; i < prevProps.pedidos.length; i++) {
    if (
      prevProps.pedidos[i].pedido_id !== nextProps.pedidos[i].pedido_id ||
      prevProps.pedidos[i].status !== nextProps.pedidos[i].status ||
      prevProps.pedidos[i].atualizado_em !== nextProps.pedidos[i].atualizado_em
    ) {
      return false
    }
  }

  // Verificar callbacks (idealmente devem ser estáveis com useCallback)
  if (
    prevProps.onStatusChange !== nextProps.onStatusChange ||
    prevProps.onCancelar !== nextProps.onCancelar
  ) {
    return false
  }

  return true
}

// Exportar componente memoizado para melhor performance
export default memo(ColunaKanban, areEqual)
