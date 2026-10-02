import { useState, useEffect } from "react"
import { ChefHat, CheckCircle, Truck, Package } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getEstabelecimentoAtivo } from "@/services"
import { clienteService } from "@/lib/clienteService"
import { DragDropContext } from '@hello-pangea/dnd'
import { useNotificacao } from "@/hooks/useNotificacao"
import { useRealtimePedidos } from "@/hooks/useRealtimePedidos"
import { useGerenciarPedidos } from "@/hooks/useGerenciarPedidos"
import { useAutoArquivarPedidos } from "@/hooks/useAutoArquivarPedidos"
import { 
  ColunaKanban, 
  type ColunaConfig,
  HeaderPedidos,
  BarraBuscaPedidos,
  DialogZerarPedidos,
  DialogResultado,
  type DadosCancelamento
} from "@/components/pedidos"
import { filtrarPedidosPorBusca, getPedidosPorStatus } from "@/utils/pedidosFiltros"


// Status possíveis do pedido
const STATUS_COLUMNS: ColunaConfig[] = [
  {
    id: 'Pedido criado',
    title: 'Novos Pedidos',
    icon: Package,
    color: 'bg-primary/5 border-primary/15',
    badgeColor: 'bg-primary/10 text-primary'
  },
  {
    id: 'Preparando',
    title: 'Em Separação',
    icon: ChefHat,
    color: 'bg-warning/5 border-warning/30',
    badgeColor: 'bg-warning/15 text-warning-foreground'
  },
  {
    id: 'Liberado',
    title: 'Prontos p/ Entrega',
    icon: CheckCircle,
    color: 'bg-success/5 border-success/30',
    badgeColor: 'bg-success/10 text-success'
  },
  {
    id: 'Finalizado',
    title: 'Entregues',
    icon: Truck,
    color: 'bg-muted/50 border-border',
    badgeColor: 'bg-muted text-foreground/80'
  }
]

export default function Pedidos() {
  const [searchTerm, setSearchTerm] = useState("")
  const [notificacoesAtivas, setNotificacoesAtivas] = useState(true)
  const [dialogZerarAberto, setDialogZerarAberto] = useState(false)
  const [dialogResultadoAberto, setDialogResultadoAberto] = useState(false)
  const [mensagemResultado, setMensagemResultado] = useState('')
  const [tipoResultado, setTipoResultado] = useState<'sucesso' | 'erro'>('sucesso')

  const { permissao, solicitarPermissao, notificarNovoPedido } = useNotificacao()
  
  // Hook de gerenciamento de pedidos
  const {
    pedidos,
    loading,
    novoPedidoRecebido,
    carregarPedidos,
    atualizarStatus,
    limparPedidos
  } = useGerenciarPedidos(notificarNovoPedido, notificacoesAtivas)
  
  // Hook de realtime
  const { isConnected: realtimeConnected, lastUpdate, reconnect } = useRealtimePedidos(
    carregarPedidos,
    { autoRefresh: true }
  )

  // Hook de arquivamento automático à meia-noite
  useAutoArquivarPedidos({
    enabled: true,
    onArquivamento: (quantidade) => {
      console.log(`🌙 ${quantidade} pedidos arquivados automaticamente à meia-noite`)
      carregarPedidos() // Recarregar lista após arquivamento
    }
  })

  // Carregar pedidos na inicialização
  useEffect(() => {
    carregarPedidos()
  }, [])

  const zerarPedidos = () => {
    setDialogZerarAberto(true)
  }

  const confirmarZerarPedidos = async () => {
    try {
      setDialogZerarAberto(false)

      // Tentar abordagem direta primeiro
      console.log('🚀 Tentando zerar pedidos diretamente...')
      
      // 1. Buscar apenas pedidos FINALIZADOS (somente do estabelecimento atual)
      // Status "Entregue" mantém no kanban, apenas "Finalizado" vai para histórico
      const { data: pedidosParaMover, error: errorBuscar } = await supabase
        .from('pedidos')
        .select('*')
        .eq('estabelecimento_id', getEstabelecimentoAtivo() ?? '00000000-0000-0000-0000-000000000000')
        .eq('status', 'Finalizado')
      
      console.log('📊 Pedidos encontrados:', pedidosParaMover?.length || 0)
      
      if (errorBuscar) {
        console.error('❌ Erro ao buscar pedidos:', errorBuscar)
        throw errorBuscar
      }

      if (!pedidosParaMover || pedidosParaMover.length === 0) {
        setMensagemResultado('Nenhum pedido encontrado para mover.')
        setTipoResultado('sucesso')
        setDialogResultadoAberto(true)
        return
      }

      // 2. Mover cada pedido para o histórico
      let pedidosMovidos = 0
      const errosMover: string[] = []
      const agora = new Date().toISOString()

      for (const pedido of pedidosParaMover) {
        try {
          // Preparar dados para o histórico
          // Colunas NOT NULL recebem default seguro (ex.: pedidos de PDV podem
          // não ter sobrenome/telefone)
          const dadosHistorico = {
            pedido_id: pedido.pedido_id,
            codigo_pedido: pedido.codigo_pedido,
            cliente_nome: pedido.cliente_nome ?? 'Cliente',
            cliente_sobrenome: pedido.cliente_sobrenome ?? '',
            cliente_telefone: pedido.cliente_telefone ?? '',
            cliente_email: pedido.cliente_email,
            cliente_endereco: pedido.cliente_endereco,
            cliente_numero: pedido.cliente_numero,
            cliente_complemento: pedido.cliente_complemento,
            cliente_bairro: pedido.cliente_bairro,
            cliente_cidade: pedido.cliente_cidade,
            cliente_estado: pedido.cliente_estado,
            entrega_domicilio: pedido.entrega_domicilio,
            forma_pagamento: pedido.forma_pagamento ?? 'nao_informado',
            precisa_troco: pedido.precisa_troco,
            valor_troco: pedido.valor_troco,
            subtotal: pedido.subtotal ?? 0,
            taxa_entrega: pedido.taxa_entrega,
            taxa_extra_km: pedido.taxa_extra_km || 0,
            desconto: pedido.desconto || 0,
            tipo_desconto: pedido.tipo_desconto || 'valor',
            total: pedido.total ?? 0,
            itens: pedido.itens ?? [],
            status: 'Finalizado',
            observacoes: pedido.observacoes,
            criado_em: pedido.criado_em,
            movido_em: agora,
            forma_pagamento_dividido: pedido.forma_pagamento_dividido || false,
            pagamento_1_tipo: pedido.pagamento_1_tipo || null,
            pagamento_1_valor: pedido.pagamento_1_valor || null,
            pagamento_2_tipo: pedido.pagamento_2_tipo || null,
            pagamento_2_valor: pedido.pagamento_2_valor || null,
            estabelecimento_id: (pedido as any).estabelecimento_id
          }

          // Inserir no histórico
          const { error: errorInserir } = await supabase
            .from('historico_geral')
            .insert(dadosHistorico)

          // 23505 = pedido já existe no histórico (movido anteriormente).
          // Nesse caso seguimos para remover da tabela de pedidos mesmo assim,
          // para que ele saia do Kanban.
          if (errorInserir && errorInserir.code !== '23505') {
            console.error(`❌ Erro ao inserir pedido ${pedido.pedido_id}:`, errorInserir)
            errosMover.push(`${pedido.pedido_id}: ${errorInserir.message}`)
            continue
          }

          // Remover da tabela de pedidos.
          // Usamos .select() para confirmar que a linha foi realmente removida:
          // se o RLS bloquear o DELETE, não há erro mas 0 linhas são afetadas
          // (era o motivo dos pedidos "voltarem" para o Kanban).
          const { data: removidos, error: errorRemover } = await supabase
            .from('pedidos')
            .delete()
            .eq('pedido_id', pedido.pedido_id)
            .select('pedido_id')

          if (errorRemover) {
            console.error(`❌ Erro ao remover pedido ${pedido.pedido_id}:`, errorRemover)
            errosMover.push(`${pedido.pedido_id}: ${errorRemover.message}`)
            continue
          }

          if (!removidos || removidos.length === 0) {
            console.error(`❌ Pedido ${pedido.pedido_id} não foi removido (provável bloqueio de RLS no DELETE).`)
            errosMover.push(`${pedido.pedido_id}: remoção bloqueada (verifique a política de DELETE em 'pedidos')`)
            continue
          }

          pedidosMovidos++
        } catch (error) {
          console.error(`❌ Erro ao processar pedido ${pedido.pedido_id}:`, error)
          continue
        }
      }

      // Limpar estado local
      limparPedidos()
      
      // Aguardar um pouco e recarregar
      await new Promise(resolve => setTimeout(resolve, 1000))
      await carregarPedidos(true)

      if (pedidosMovidos === pedidosParaMover.length) {
        // Todos movidos com sucesso
        setMensagemResultado(`${pedidosMovidos} pedido(s) movido(s) para o histórico com sucesso.`)
        setTipoResultado('sucesso')
      } else if (pedidosMovidos > 0) {
        // Parcial
        setMensagemResultado(
          `${pedidosMovidos} de ${pedidosParaMover.length} pedido(s) movido(s). ` +
          `Falha em ${errosMover.length}: ${errosMover[0] ?? 'erro desconhecido'}`
        )
        setTipoResultado('erro')
      } else {
        // Nenhum movido
        setMensagemResultado(
          `Nenhum pedido pôde ser movido para o histórico. Detalhe: ${errosMover[0] ?? 'erro desconhecido'}`
        )
        setTipoResultado('erro')
      }
      setDialogResultadoAberto(true)

    } catch (error) {
      console.error('❌ Erro geral ao zerar pedidos:', error)

      // Recarrega para refletir o estado real do banco (alguns podem ter sido movidos)
      try {
        limparPedidos()
        await carregarPedidos(true)
      } catch { /* ignora erro de recarregamento */ }

      const msg = error instanceof Error ? error.message : 'Erro desconhecido'
      setMensagemResultado(`Erro ao mover pedidos para o histórico: ${msg}`)
      setTipoResultado('erro')
      setDialogResultadoAberto(true)
    }
  }

  const handleDragEnd = (result: any) => {
    const { destination, draggableId } = result
    if (!destination) return
    if (destination.droppableId === result.source.droppableId && 
        destination.index === result.source.index) return
    atualizarStatus(draggableId, destination.droppableId)
  }

  const handleToggleNotificacoes = async () => {
    if (permissao === 'default') {
      await solicitarPermissao()
    }
    setNotificacoesAtivas(!notificacoesAtivas)
  }

  const handleCancelarPedido = async (pedidoId: string, dados: DadosCancelamento) => {
    try {
      // Buscar dados do pedido antes de cancelar (para decrementar estatísticas)
      const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos')
        .select('cliente_id, total')
        .eq('pedido_id', pedidoId)
        .single()

      if (pedidoError) throw pedidoError

      // Atualizar o pedido com os dados de cancelamento
      const { error } = await supabase
        .from('pedidos')
        .update({
          cancelado: true,
          motivo_cancelamento: dados.motivo,
          requer_extorno: dados.requerExtorno,
          valor_extorno: dados.valorExtorno,
          forma_pagamento_extorno: dados.formaPagamentoExtorno,
          cancelado_em: new Date().toISOString(),
          status: 'Cancelado'
        })
        .eq('pedido_id', pedidoId)

      if (error) throw error

      // Decrementar estatísticas do cliente (se houver cliente_id)
      if (pedido?.cliente_id && pedido?.total) {
        try {
          await clienteService.decrementarEstatisticas(pedido.cliente_id, pedido.total)
        } catch (estatisticasError) {
          console.error('Erro ao decrementar estatísticas do cliente:', estatisticasError)
          // Não bloquear o cancelamento se falhar
        }
      }

      // Recarregar pedidos
      await carregarPedidos()

      setMensagemResultado('Pedido cancelado com sucesso!')
      setTipoResultado('sucesso')
      setDialogResultadoAberto(true)
    } catch (error) {
      console.error('Erro ao cancelar pedido:', error)
      setMensagemResultado('Erro ao cancelar pedido. Tente novamente.')
      setTipoResultado('erro')
      setDialogResultadoAberto(true)
    }
  }

  const pedidosFiltrados = filtrarPedidosPorBusca(pedidos, searchTerm)

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando pedidos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Desktop */}
      <HeaderPedidos
        novoPedidoRecebido={novoPedidoRecebido}
        notificacoesAtivas={notificacoesAtivas}
        onToggleNotificacoes={handleToggleNotificacoes}
        onZerarPedidos={zerarPedidos}
        onAtualizar={() => carregarPedidos(true)}
        carregando={loading}
        totalPedidos={pedidos.length}
        realtimeConectado={realtimeConnected}
        ultimaAtualizacao={lastUpdate}
        onReconectar={reconnect}
        variante="desktop"
      />

      {/* Header Mobile */}
      <HeaderPedidos
        novoPedidoRecebido={novoPedidoRecebido}
        notificacoesAtivas={notificacoesAtivas}
        onToggleNotificacoes={handleToggleNotificacoes}
        onZerarPedidos={zerarPedidos}
        onAtualizar={() => carregarPedidos(true)}
        carregando={loading}
        totalPedidos={pedidos.length}
        realtimeConectado={realtimeConnected}
        ultimaAtualizacao={lastUpdate}
        onReconectar={reconnect}
        variante="mobile"
      />

      {/* Busca */}
      <BarraBuscaPedidos
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {STATUS_COLUMNS.map((column) => (
            <ColunaKanban
              key={column.id}
              config={column}
              pedidos={getPedidosPorStatus(pedidosFiltrados, column.id)}
              onStatusChange={atualizarStatus}
              onCancelar={handleCancelarPedido}
            />
          ))}
        </div>
      </DragDropContext>

      {/* Dialogs */}
      <DialogZerarPedidos
        aberto={dialogZerarAberto}
        onMudarEstado={setDialogZerarAberto}
        onConfirmar={confirmarZerarPedidos}
      />

      <DialogResultado
        aberto={dialogResultadoAberto}
        onMudarEstado={setDialogResultadoAberto}
        tipo={tipoResultado}
        mensagem={mensagemResultado}
      />
    </div>
  )
}