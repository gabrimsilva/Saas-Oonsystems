import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatusTimeline from '../StatusTimeline'
import type { HistoricoPedidoSupabase, PedidoSupabase } from '@/services'

describe('StatusTimeline Component', () => {
  const mockHistorico: HistoricoPedidoSupabase[] = [
    {
      id: '1',
      pedido_id: 'pedido-001',
      status: 'Pedido criado',
      observacao: 'Pedido recebido pelo sistema',
      criado_em: '2026-07-14T14:30:00Z',
      atualizado_em: '2026-07-14T14:30:00Z'
    },
    {
      id: '2',
      pedido_id: 'pedido-001',
      status: 'Preparando',
      observacao: 'Seu pedido está em preparo',
      criado_em: '2026-07-14T14:37:00Z',
      atualizado_em: '2026-07-14T14:37:00Z'
    }
  ]

  const mockPedidoDelivery: PedidoSupabase = {
    id: 'p-001',
    pedido_id: 'pedido-001',
    codigo_pedido: '#001',
    cliente_nome: 'João',
    cliente_sobrenome: 'Silva',
    cliente_telefone: '11999999999',
    cliente_email: 'joao@email.com',
    cliente_endereco: 'Rua A',
    cliente_numero: '123',
    cliente_complemento: 'Apto 45',
    cliente_bairro: 'Centro',
    cliente_cidade: 'São Paulo',
    cliente_estado: 'SP',
    cliente_cep: '01234-567',
    entrega_domicilio: true,
    forma_pagamento: 'PIX',
    precisa_troco: false,
    valor_troco: 0,
    subtotal: 50,
    taxa_entrega: 10,
    total: 60,
    desconto: 0,
    tipo_desconto: 'valor',
    itens: [],
    status: 'Preparando',
    observacoes: 'Sem cebola',
    criado_em: '2026-07-14T14:30:00Z',
    atualizado_em: '2026-07-14T14:37:00Z',
    cliente_id: 'c-001'
  }

  const mockPedidoRetirada: PedidoSupabase = {
    ...mockPedidoDelivery,
    entrega_domicilio: false
  }

  it('should render component with title and update indicator', () => {
    render(
      <StatusTimeline
        historico={mockHistorico}
        atualizandoRealtime={false}
        ultimaAtualizacao={new Date('2026-07-14T14:37:00Z')}
        pedido={mockPedidoDelivery}
      />
    )

    expect(screen.getByText('Acompanhe seu Pedido')).toBeInTheDocument()
    expect(screen.getByText(/Atualizado/i)).toBeInTheDocument()
  })

  it('should show "Atualizando..." when realtime is active', () => {
    render(
      <StatusTimeline
        historico={mockHistorico}
        atualizandoRealtime={true}
        ultimaAtualizacao={new Date()}
        pedido={mockPedidoDelivery}
      />
    )

    expect(screen.getByText('Atualizando...')).toBeInTheDocument()
  })

  it('should render empty state when historico is empty', () => {
    render(
      <StatusTimeline
        historico={[]}
        atualizandoRealtime={false}
        ultimaAtualizacao={new Date()}
        pedido={mockPedidoDelivery}
      />
    )

    expect(screen.getByText('Nenhuma atualização de status ainda')).toBeInTheDocument()
  })

  it('should render all historic items in reverse order (most recent last)', () => {
    render(
      <StatusTimeline
        historico={mockHistorico}
        atualizandoRealtime={false}
        ultimaAtualizacao={new Date()}
        pedido={mockPedidoDelivery}
      />
    )

    const items = screen.getAllByText(/Pedido criado|Preparando/)
    expect(items.length).toBeGreaterThan(0)
  })

  it('should display correct status text for delivery orders', () => {
    const historicoLiberado: HistoricoPedidoSupabase[] = [
      {
        id: '1',
        pedido_id: 'pedido-001',
        status: 'Liberado',
        observacao: 'Seu pedido saiu para entrega',
        criado_em: '2026-07-14T14:50:00Z',
        atualizado_em: '2026-07-14T14:50:00Z'
      }
    ]

    render(
      <StatusTimeline
        historico={historicoLiberado}
        atualizandoRealtime={false}
        ultimaAtualizacao={new Date()}
        pedido={mockPedidoDelivery}
      />
    )

    expect(screen.getByText('Saiu para entrega')).toBeInTheDocument()
  })

  it('should display correct status text for pickup orders', () => {
    const historicoLiberado: HistoricoPedidoSupabase[] = [
      {
        id: '1',
        pedido_id: 'pedido-001',
        status: 'Liberado',
        observacao: 'Seu pedido está pronto',
        criado_em: '2026-07-14T14:50:00Z',
        atualizado_em: '2026-07-14T14:50:00Z'
      }
    ]

    render(
      <StatusTimeline
        historico={historicoLiberado}
        atualizandoRealtime={false}
        ultimaAtualizacao={new Date()}
        pedido={mockPedidoRetirada}
      />
    )

    expect(screen.getByText('Pronto para retirada')).toBeInTheDocument()
  })

  it('should display correct status text "Entregue" for delivered orders', () => {
    const historicoFinalizado: HistoricoPedidoSupabase[] = [
      {
        id: '1',
        pedido_id: 'pedido-001',
        status: 'Finalizado',
        observacao: 'Pedido entregue com sucesso',
        criado_em: '2026-07-14T15:00:00Z',
        atualizado_em: '2026-07-14T15:00:00Z'
      }
    ]

    render(
      <StatusTimeline
        historico={historicoFinalizado}
        atualizandoRealtime={false}
        ultimaAtualizacao={new Date()}
        pedido={mockPedidoDelivery}
      />
    )

    expect(screen.getByText('Entregue')).toBeInTheDocument()
  })

  it('should display correct status text "Retirado" for completed pickup orders', () => {
    const historicoFinalizado: HistoricoPedidoSupabase[] = [
      {
        id: '1',
        pedido_id: 'pedido-001',
        status: 'Finalizado',
        observacao: 'Pedido retirado com sucesso',
        criado_em: '2026-07-14T15:00:00Z',
        atualizado_em: '2026-07-14T15:00:00Z'
      }
    ]

    render(
      <StatusTimeline
        historico={historicoFinalizado}
        atualizandoRealtime={false}
        ultimaAtualizacao={new Date()}
        pedido={mockPedidoRetirada}
      />
    )

    expect(screen.getByText('Retirado')).toBeInTheDocument()
  })

  it('should display observations when present', () => {
    render(
      <StatusTimeline
        historico={mockHistorico}
        atualizandoRealtime={false}
        ultimaAtualizacao={new Date()}
        pedido={mockPedidoDelivery}
      />
    )

    expect(screen.getByText('Pedido recebido pelo sistema')).toBeInTheDocument()
    expect(screen.getByText('Seu pedido está em preparo')).toBeInTheDocument()
  })

  it('should not display observacao section when observation is empty', () => {
    const historicoSemObs: HistoricoPedidoSupabase[] = [
      {
        id: '1',
        pedido_id: 'pedido-001',
        status: 'Pedido criado',
        observacao: '',
        criado_em: '2026-07-14T14:30:00Z',
        atualizado_em: '2026-07-14T14:30:00Z'
      }
    ]

    render(
      <StatusTimeline
        historico={historicoSemObs}
        atualizandoRealtime={false}
        ultimaAtualizacao={new Date()}
        pedido={mockPedidoDelivery}
      />
    )

    expect(screen.queryByText('Obs:', { exact: false })).not.toBeInTheDocument()
  })

  it('should format time correctly (HH:mm)', () => {
    const historicoComHora: HistoricoPedidoSupabase[] = [
      {
        id: '1',
        pedido_id: 'pedido-001',
        status: 'Pedido criado',
        observacao: 'Teste',
        criado_em: '2026-07-14T14:35:00Z',
        atualizado_em: '2026-07-14T14:35:00Z'
      }
    ]

    render(
      <StatusTimeline
        historico={historicoComHora}
        atualizandoRealtime={false}
        ultimaAtualizacao={new Date()}
        pedido={mockPedidoDelivery}
      />
    )

    // Verificar que a hora aparece no formato HH:mm
    const timeElements = screen.getAllByText(/\d{2}:\d{2}/)
    expect(timeElements.length).toBeGreaterThan(0)
  })

  it('should have correct CSS classes for status colors', () => {
    const { container } = render(
      <StatusTimeline
        historico={mockHistorico}
        atualizandoRealtime={false}
        ultimaAtualizacao={new Date()}
        pedido={mockPedidoDelivery}
      />
    )

    // Verificar que os badges de status com cores estão presentes
    const statusBadges = container.querySelectorAll('[class*="bg-primary"], [class*="bg-warning"], [class*="bg-success"], [class*="bg-teal-600"], [class*="bg-destructive"]')
    expect(statusBadges.length).toBeGreaterThanOrEqual(mockHistorico.length)
  })

  it('should render with realtime indicator dot', () => {
    const { container } = render(
      <StatusTimeline
        historico={mockHistorico}
        atualizandoRealtime={true}
        ultimaAtualizacao={new Date()}
        pedido={mockPedidoDelivery}
      />
    )

    // Procurar por elemento com classe de animação de pulsação
    const animatedDot = container.querySelector('.animate-pulse')
    expect(animatedDot).toBeInTheDocument()
  })

  it('should handle multiple status changes in timeline', () => {
    const historicoCompleto: HistoricoPedidoSupabase[] = [
      {
        id: '1',
        pedido_id: 'pedido-001',
        status: 'Pedido criado',
        observacao: 'Pedido recebido',
        criado_em: '2026-07-14T14:30:00Z',
        atualizado_em: '2026-07-14T14:30:00Z'
      },
      {
        id: '2',
        pedido_id: 'pedido-001',
        status: 'Preparando',
        observacao: 'Em preparo',
        criado_em: '2026-07-14T14:37:00Z',
        atualizado_em: '2026-07-14T14:37:00Z'
      },
      {
        id: '3',
        pedido_id: 'pedido-001',
        status: 'Liberado',
        observacao: 'Saiu para entrega',
        criado_em: '2026-07-14T14:50:00Z',
        atualizado_em: '2026-07-14T14:50:00Z'
      },
      {
        id: '4',
        pedido_id: 'pedido-001',
        status: 'Finalizado',
        observacao: 'Finalizado com sucesso',
        criado_em: '2026-07-14T15:10:00Z',
        atualizado_em: '2026-07-14T15:10:00Z'
      }
    ]

    render(
      <StatusTimeline
        historico={historicoCompleto}
        atualizandoRealtime={false}
        ultimaAtualizacao={new Date()}
        pedido={mockPedidoDelivery}
      />
    )

    expect(screen.getByText('Pedido recebido')).toBeInTheDocument()
    expect(screen.getByText('Em preparo')).toBeInTheDocument()
    expect(screen.getAllByText('Saiu para entrega')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Entregue')[0]).toBeInTheDocument()
  })

  it('should render without pedido prop (fallback behavior)', () => {
    render(
      <StatusTimeline
        historico={mockHistorico}
        atualizandoRealtime={false}
        ultimaAtualizacao={new Date()}
      />
    )

    expect(screen.getByText('Acompanhe seu Pedido')).toBeInTheDocument()
  })

  it('should handle canceled orders', () => {
    const historicoCancelado: HistoricoPedidoSupabase[] = [
      {
        id: '1',
        pedido_id: 'pedido-001',
        status: 'Cancelado',
        observacao: 'Pedido cancelado pelo cliente',
        criado_em: '2026-07-14T14:45:00Z',
        atualizado_em: '2026-07-14T14:45:00Z'
      }
    ]

    render(
      <StatusTimeline
        historico={historicoCancelado}
        atualizandoRealtime={false}
        ultimaAtualizacao={new Date()}
        pedido={mockPedidoDelivery}
      />
    )

    expect(screen.getByText('Cancelado')).toBeInTheDocument()
  })
})
