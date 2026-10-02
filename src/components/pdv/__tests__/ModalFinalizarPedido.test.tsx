import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ModalFinalizarPedido from '../ModalFinalizarPedido'

describe('ModalFinalizarPedido - Consumo Interno Checkbox', () => {
  const mockOnClose = vi.fn()
  const mockOnConfirmar = vi.fn()

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onConfirmar: mockOnConfirmar,
    subtotal: 100,
    total: 100,
    taxaEntrega: 0,
    entregaDomicilio: false,
    processando: false,
    carrinhoVazio: false,
    simplified: true
  }

  beforeEach(() => {
    mockOnClose.mockClear()
    mockOnConfirmar.mockClear()
  })

  it('renderiza checkbox "Consumo Interno" com label em português', () => {
    render(<ModalFinalizarPedido {...defaultProps} />)
    
    const checkbox = screen.getByRole('checkbox', { name: /consumo interno/i })
    expect(checkbox).toBeInTheDocument()
    expect(screen.getByText(/Marcar para registrar como consumo interno/i)).toBeInTheDocument()
  })

  it('checkbox começa desmarcado por padrão', () => {
    render(<ModalFinalizarPedido {...defaultProps} />)
    
    const checkbox = screen.getByRole('checkbox', { name: /consumo interno/i }) as HTMLInputElement
    expect(checkbox.checked).toBe(false)
  })

  it('quando marcado: total é zerado visualmente', () => {
    render(<ModalFinalizarPedido {...defaultProps} />)
    
    const checkbox = screen.getByRole('checkbox', { name: /consumo interno/i })
    fireEvent.click(checkbox)
    
    // Total deve ser exibido como R$ 0,00
    expect(screen.getByText('R$ 0,00')).toBeInTheDocument()
  })

  it('quando marcado: forma de pagamento deixa de ser exibida', () => {
    render(<ModalFinalizarPedido {...defaultProps} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    
    const checkbox = screen.getByRole('checkbox', { name: /consumo interno/i })
    fireEvent.click(checkbox)
    
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('quando marcado: exibe mensagem de confirmação visual', () => {
    render(<ModalFinalizarPedido {...defaultProps} />)
    
    const checkbox = screen.getByRole('checkbox', { name: /consumo interno/i })
    fireEvent.click(checkbox)
    
    expect(screen.getByText(/Consumo interno ativado - Total será R\$ 0,00 e estoque será reduzido normalmente/i)).toBeInTheDocument()
  })

  it('quando desmarcado: campos voltam ao normal', () => {
    render(<ModalFinalizarPedido {...defaultProps} />)
    
    const checkbox = screen.getByRole('checkbox', { name: /consumo interno/i })
    
    // Marcar
    fireEvent.click(checkbox)
    expect(screen.getByText('R$ 0,00')).toBeInTheDocument()
    
    // Desmarcar
    fireEvent.click(checkbox)
    expect(screen.getAllByText('R$ 100,00').length).toBeGreaterThan(0)
  })

  it('botão "Confirmar" é desabilitado se consumo_interno marcado E carrinho vazio', () => {
    render(<ModalFinalizarPedido {...defaultProps} carrinhoVazio={true} />)
    
    const checkbox = screen.getByRole('checkbox', { name: /consumo interno/i })
    fireEvent.click(checkbox)
    
    const botaoConfirmar = screen.getByRole('button', { name: /Confirmar Pedido/i })
    expect(botaoConfirmar).toBeDisabled()
  })

  it('botão "Confirmar" é habilitado se consumo_interno marcado E carrinho com itens', () => {
    render(<ModalFinalizarPedido {...defaultProps} carrinhoVazio={false} />)
    
    const checkbox = screen.getByRole('checkbox', { name: /consumo interno/i })
    fireEvent.click(checkbox)
    
    const botaoConfirmar = screen.getByRole('button', { name: /Confirmar Pedido/i })
    expect(botaoConfirmar).not.toBeDisabled()
  })

  it('passa consumoInterno=true ao onConfirmar quando marcado', () => {
    render(<ModalFinalizarPedido {...defaultProps} carrinhoVazio={false} />)
    
    const checkbox = screen.getByRole('checkbox', { name: /consumo interno/i })
    fireEvent.click(checkbox)
    
    const botaoConfirmar = screen.getByRole('button', { name: /Confirmar Pedido/i })
    fireEvent.click(botaoConfirmar)
    
    expect(mockOnConfirmar).toHaveBeenCalledWith(
      expect.objectContaining({
        consumoInterno: true,
        formaPagamento: 'interno',
        precisaTroco: false
      })
    )
  })

  it('passa consumoInterno=false ao onConfirmar quando desmarcado', () => {
    render(<ModalFinalizarPedido {...defaultProps} carrinhoVazio={false} />)
    
    const botaoConfirmar = screen.getByRole('button', { name: /Confirmar Pedido/i })
    fireEvent.click(botaoConfirmar)
    
    expect(mockOnConfirmar).toHaveBeenCalledWith(
      expect.objectContaining({
        consumoInterno: false
      })
    )
  })

  it('exibe descrição diferente quando consumo interno está marcado', () => {
    render(<ModalFinalizarPedido {...defaultProps} />)
    
    const checkbox = screen.getByRole('checkbox', { name: /consumo interno/i })
    
    // Inicialmente deve exibir "Confirme os dados do pagamento"
    expect(screen.getByText(/Confirme os dados do pagamento/i)).toBeInTheDocument()
    
    // Ao marcar, muda para "Registrar consumo interno - Sem cobrança"
    fireEvent.click(checkbox)
    expect(screen.queryByText(/Confirme os dados do pagamento/i)).not.toBeInTheDocument()
    expect(screen.getByText(/Registrar consumo interno - Sem cobrança/i)).toBeInTheDocument()
  })

  it('reseta estado ao fechar modal', () => {
    const { rerender } = render(<ModalFinalizarPedido {...defaultProps} />)
    
    const checkbox = screen.getByRole('checkbox', { name: /consumo interno/i })
    fireEvent.click(checkbox)
    
    expect(checkbox).toBeChecked()
    
    // Simular fechamento
    rerender(<ModalFinalizarPedido {...defaultProps} isOpen={false} />)
    rerender(<ModalFinalizarPedido {...defaultProps} isOpen={true} />)
    
    // Checkbox deve estar desmarcado novamente
    const newCheckbox = screen.getByRole('checkbox', { name: /consumo interno/i }) as HTMLInputElement
    expect(newCheckbox.checked).toBe(false)
  })
})
