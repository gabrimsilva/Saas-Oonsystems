import { describe, it, expect } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import PagamentoDividido from '../PagamentoDividido'
import { DIVISAO_INICIAL, type DivisaoPagamento } from '@/utils/pagamentoDividido'

/** Componente controlado: o teste guarda o estado como a tela faria */
function Cenario({ total = 100, inicial = DIVISAO_INICIAL }: { total?: number; inicial?: DivisaoPagamento }) {
  const [valor, setValor] = useState(inicial)
  return <PagamentoDividido total={total} valor={valor} onChange={setValor} />
}

const campo = (id: string) => document.getElementById(id) as HTMLInputElement | HTMLSelectElement

describe('PagamentoDividido', () => {
  it('mostra o total a dividir e as duas formas (PIX e Dinheiro por padrão)', () => {
    render(<Cenario total={150} />)
    expect(screen.getByText(/Total a dividir/i)).toHaveTextContent('R$ 150,00')
    expect(campo('divisao-forma-1').value).toBe('pix')
    expect(campo('divisao-forma-2').value).toBe('dinheiro')
  })

  it('preenche a outra parte com o restante ao digitar um valor', () => {
    render(<Cenario total={100} />)
    fireEvent.change(campo('divisao-valor-1'), { target: { value: '60' } })
    expect(campo('divisao-valor-2').value).toBe('40,00')
    expect(screen.getByRole('status')).toHaveTextContent('Valores conferem com o total.')
  })

  it('aceita vírgula como separador decimal', () => {
    render(<Cenario total={100} />)
    fireEvent.change(campo('divisao-valor-2'), { target: { value: '33,33' } })
    expect(campo('divisao-valor-1').value).toBe('66,67')
  })

  it('"Metade" divide o total ao meio, com o centavo ímpar na 1ª parte', () => {
    render(<Cenario total={100.01} />)
    fireEvent.click(screen.getByRole('button', { name: 'Metade' }))
    expect(campo('divisao-valor-1').value).toBe('50,01')
    expect(campo('divisao-valor-2').value).toBe('50,00')
  })

  it('escolher a mesma forma da outra parte troca as duas de lugar', () => {
    render(<Cenario />)
    fireEvent.change(campo('divisao-forma-1'), { target: { value: 'dinheiro' } })
    expect(campo('divisao-forma-1').value).toBe('dinheiro')
    expect(campo('divisao-forma-2').value).toBe('pix')
  })

  it('avisa quando a soma não fecha com o total', () => {
    render(<Cenario total={100} inicial={{ ...DIVISAO_INICIAL, valor1: '50,00', valor2: '30,00' }} />)
    expect(screen.getByRole('status')).toHaveTextContent('Faltam R$ 20,00 para completar o total.')
  })

  it('com parte em dinheiro, calcula o troco sobre essa parte', () => {
    render(<Cenario total={100} />)
    fireEvent.change(campo('divisao-valor-1'), { target: { value: '60' } })
    fireEvent.change(campo('divisao-recebido'), { target: { value: '50' } })
    expect(screen.getByRole('status')).toHaveTextContent('Troco: R$ 10,00')
  })

  it('sem parte em dinheiro, não pede o valor recebido', () => {
    render(<Cenario inicial={{ ...DIVISAO_INICIAL, forma2: 'cartaoCredito' }} />)
    expect(campo('divisao-recebido')).toBeNull()
  })
})
