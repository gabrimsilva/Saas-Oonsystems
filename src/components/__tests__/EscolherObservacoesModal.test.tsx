import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import EscolherObservacoesModal from '../EscolherObservacoesModal'

describe('EscolherObservacoesModal', () => {
  const mockOnClose = vi.fn()
  const mockOnConfirm = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Renderização básica', () => {
    it('deve renderizar o modal quando isOpen é true', () => {
      render(
        <EscolherObservacoesModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByText('Adicionar Observações')).toBeInTheDocument()
      expect(screen.getByText('Alguma observação especial para este produto?')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Ex: Sem cebola, bem assada...')).toBeInTheDocument()
    })

    it('não deve renderizar o modal quando isOpen é false', () => {
      render(
        <EscolherObservacoesModal
          isOpen={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.queryByText('Adicionar Observações')).not.toBeInTheDocument()
    })

    it('deve renderizar botões "Pular" e "Confirmar"', () => {
      render(
        <EscolherObservacoesModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByRole('button', { name: /pular/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument()
    })
  })

  describe('Limite de caracteres (300)', () => {
    it('deve permitir digitar até 300 caracteres', async () => {
      render(
        <EscolherObservacoesModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const textarea = screen.getByPlaceholderText('Ex: Sem cebola, bem assada...')
      const texto300Chars = 'a'.repeat(300)

      fireEvent.change(textarea, { target: { value: texto300Chars } })

      expect(textarea).toHaveValue(texto300Chars)
      expect(screen.getByText('300/300 caracteres')).toBeInTheDocument()
    })

    it('não deve permitir digitar mais de 300 caracteres', async () => {
      render(
        <EscolherObservacoesModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const textarea = screen.getByPlaceholderText('Ex: Sem cebola, bem assada...') as HTMLTextAreaElement
      
      // O textarea tem maxLength=300, então o navegador bloqueia automaticamente
      // Vamos verificar que o atributo maxLength está presente
      expect(textarea).toHaveAttribute('maxLength', '300')
      
      // Tentar definir um valor maior que 300 caracteres
      const texto301Chars = 'a'.repeat(301)
      fireEvent.change(textarea, { target: { value: texto301Chars } })

      // O componente valida e não permite mais de 300 caracteres
      expect(textarea.value.length).toBeLessThanOrEqual(300)
    })

    it('deve bloquear entrada quando atingir 300 caracteres', async () => {
      render(
        <EscolherObservacoesModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const textarea = screen.getByPlaceholderText('Ex: Sem cebola, bem assada...') as HTMLTextAreaElement
      const texto300Chars = 'a'.repeat(300)

      fireEvent.change(textarea, { target: { value: texto300Chars } })
      expect(textarea.value).toBe(texto300Chars)

      // Tentar adicionar mais um caractere
      fireEvent.change(textarea, { target: { value: texto300Chars + 'b' } })
      
      // Deve continuar com 300 caracteres
      expect(textarea.value).toBe(texto300Chars)
    })
  })

  describe('Sanitização de entrada', () => {
    it('deve remover tags HTML ao confirmar', async () => {
      render(
        <EscolherObservacoesModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const textarea = screen.getByPlaceholderText('Ex: Sem cebola, bem assada...')
      const textoComHTML = '<script>alert("xss")</script>Sem cebola'

      fireEvent.change(textarea, { target: { value: textoComHTML } })
      
      const confirmarButton = screen.getByRole('button', { name: /confirmar/i })
      fireEvent.click(confirmarButton)

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('Sem cebola')
      })
    })

    it('deve remover tags HTML perigosas', async () => {
      render(
        <EscolherObservacoesModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const textarea = screen.getByPlaceholderText('Ex: Sem cebola, bem assada...')
      const textoComScript = '<img src=x onerror="alert(1)">Bem assada'

      fireEvent.change(textarea, { target: { value: textoComScript } })
      
      const confirmarButton = screen.getByRole('button', { name: /confirmar/i })
      fireEvent.click(confirmarButton)

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalled()
        const chamada = mockOnConfirm.mock.calls[0][0]
        expect(chamada).not.toContain('<img')
        expect(chamada).not.toContain('onerror')
      })
    })

    it('deve remover todas as tags HTML', async () => {
      render(
        <EscolherObservacoesModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const textarea = screen.getByPlaceholderText('Ex: Sem cebola, bem assada...')
      const textoComTags = '<div><p>Texto <strong>importante</strong></p></div>'

      fireEvent.change(textarea, { target: { value: textoComTags } })
      
      const confirmarButton = screen.getByRole('button', { name: /confirmar/i })
      fireEvent.click(confirmarButton)

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('Texto importante')
      })
    })
  })

  describe('Botão "Pular"', () => {
    it('deve chamar onConfirm com string vazia ao clicar em "Pular"', async () => {
      render(
        <EscolherObservacoesModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const pularButton = screen.getByRole('button', { name: /pular/i })
      fireEvent.click(pularButton)

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('')
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('deve chamar onConfirm com string vazia mesmo se houver texto digitado', async () => {
      render(
        <EscolherObservacoesModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const textarea = screen.getByPlaceholderText('Ex: Sem cebola, bem assada...')
      fireEvent.change(textarea, { target: { value: 'Algum texto' } })

      const pularButton = screen.getByRole('button', { name: /pular/i })
      fireEvent.click(pularButton)

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('')
      })
    })
  })

  describe('Botão "Confirmar"', () => {
    it('deve chamar onConfirm com texto trimmed ao clicar em "Confirmar"', async () => {
      render(
        <EscolherObservacoesModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const textarea = screen.getByPlaceholderText('Ex: Sem cebola, bem assada...')
      fireEvent.change(textarea, { target: { value: '  Sem cebola  ' } })

      const confirmarButton = screen.getByRole('button', { name: /confirmar/i })
      fireEvent.click(confirmarButton)

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('Sem cebola')
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('deve chamar onConfirm com string vazia se campo estiver vazio', async () => {
      render(
        <EscolherObservacoesModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const confirmarButton = screen.getByRole('button', { name: /confirmar/i })
      fireEvent.click(confirmarButton)

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('')
      })
    })

    it('deve remover espaços em branco no início e fim', async () => {
      render(
        <EscolherObservacoesModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const textarea = screen.getByPlaceholderText('Ex: Sem cebola, bem assada...')
      fireEvent.change(textarea, { target: { value: '   Bem assada   ' } })

      const confirmarButton = screen.getByRole('button', { name: /confirmar/i })
      fireEvent.click(confirmarButton)

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('Bem assada')
      })
    })

    it('deve chamar onConfirm com string vazia se houver apenas espaços', async () => {
      render(
        <EscolherObservacoesModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const textarea = screen.getByPlaceholderText('Ex: Sem cebola, bem assada...')
      fireEvent.change(textarea, { target: { value: '     ' } })

      const confirmarButton = screen.getByRole('button', { name: /confirmar/i })
      fireEvent.click(confirmarButton)

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('')
      })
    })
  })

  describe('Contador de caracteres', () => {
    it('deve exibir 0/300 caracteres inicialmente', () => {
      render(
        <EscolherObservacoesModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByText('0/300 caracteres')).toBeInTheDocument()
    })

    it('deve atualizar contador ao digitar', async () => {
      render(
        <EscolherObservacoesModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const textarea = screen.getByPlaceholderText('Ex: Sem cebola, bem assada...')
      
      fireEvent.change(textarea, { target: { value: 'Sem cebola' } })
      expect(screen.getByText('10/300 caracteres')).toBeInTheDocument()

      fireEvent.change(textarea, { target: { value: 'Sem cebola, bem assada' } })
      expect(screen.getByText('22/300 caracteres')).toBeInTheDocument()
    })

    it('deve exibir 300/300 quando atingir o limite', async () => {
      render(
        <EscolherObservacoesModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const textarea = screen.getByPlaceholderText('Ex: Sem cebola, bem assada...')
      const texto300Chars = 'a'.repeat(300)

      fireEvent.change(textarea, { target: { value: texto300Chars } })

      expect(screen.getByText('300/300 caracteres')).toBeInTheDocument()
    })

    it('deve atualizar contador corretamente ao apagar texto', async () => {
      render(
        <EscolherObservacoesModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const textarea = screen.getByPlaceholderText('Ex: Sem cebola, bem assada...')
      
      fireEvent.change(textarea, { target: { value: 'Sem cebola' } })
      expect(screen.getByText('10/300 caracteres')).toBeInTheDocument()

      fireEvent.change(textarea, { target: { value: 'Sem' } })
      expect(screen.getByText('3/300 caracteres')).toBeInTheDocument()

      fireEvent.change(textarea, { target: { value: '' } })
      expect(screen.getByText('0/300 caracteres')).toBeInTheDocument()
    })
  })

  describe('Reset de estado', () => {
    it('deve resetar observações quando o modal abre novamente', async () => {
      const { rerender } = render(
        <EscolherObservacoesModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const textarea = screen.getByPlaceholderText('Ex: Sem cebola, bem assada...')
      fireEvent.change(textarea, { target: { value: 'Texto anterior' } })
      expect(textarea).toHaveValue('Texto anterior')

      // Fechar modal
      rerender(
        <EscolherObservacoesModal
          isOpen={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      // Reabrir modal
      rerender(
        <EscolherObservacoesModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const textareaReaberto = screen.getByPlaceholderText('Ex: Sem cebola, bem assada...')
      expect(textareaReaberto).toHaveValue('')
      expect(screen.getByText('0/300 caracteres')).toBeInTheDocument()
    })
  })

  describe('Acessibilidade', () => {
    it('deve ter aria-label no textarea', () => {
      render(
        <EscolherObservacoesModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const textarea = screen.getByPlaceholderText('Ex: Sem cebola, bem assada...')
      expect(textarea).toHaveAttribute('aria-label', 'Campo de observações do produto')
    })

    it('deve ter aria-describedby apontando para o contador', () => {
      render(
        <EscolherObservacoesModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const textarea = screen.getByPlaceholderText('Ex: Sem cebola, bem assada...')
      expect(textarea).toHaveAttribute('aria-describedby', 'char-count')
    })

    it('deve ter aria-live no contador de caracteres', () => {
      render(
        <EscolherObservacoesModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const contador = screen.getByText('0/300 caracteres')
      expect(contador).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('Variantes de estilo', () => {
    it('deve aplicar estilo delivery quando variant="delivery"', () => {
      render(
        <EscolherObservacoesModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          variant="delivery"
        />
      )

      const confirmarButton = screen.getByRole('button', { name: /confirmar/i })
      expect(confirmarButton).toHaveClass('bg-primary')
    })

    it('deve usar estilo padrão quando variant="default"', () => {
      render(
        <EscolherObservacoesModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          variant="default"
        />
      )

      const confirmarButton = screen.getByRole('button', { name: /confirmar/i })
      expect(confirmarButton).not.toHaveClass('bg-red-600')
    })
  })
})
