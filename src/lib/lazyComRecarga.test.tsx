import { Suspense } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { lazyComRecarga } from './lazyComRecarga'
import ErroInesperado from '@/components/ErroInesperado'

const recarregar = vi.fn()

beforeEach(() => {
  // O setup global troca o sessionStorage por um mock que não guarda nada
  const dados = new Map<string, string>()
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => dados.get(k) ?? null,
      setItem: (k: string, v: string) => void dados.set(k, String(v)),
      removeItem: (k: string) => void dados.delete(k),
      clear: () => dados.clear(),
    },
  })
  recarregar.mockReset()
  Object.defineProperty(window, 'location', { value: { ...window.location, reload: recarregar }, writable: true })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

const montar = (Comp: React.ComponentType) =>
  render(
    <ErroInesperado>
      <Suspense fallback={<p>carregando</p>}>
        <Comp />
      </Suspense>
    </ErroInesperado>,
  )

describe('lazyComRecarga', () => {
  it('arquivo da versão anterior sumiu: recarrega a página uma vez', async () => {
    const Tela = lazyComRecarga(() => Promise.reject(new Error('Failed to fetch dynamically imported module')))
    montar(Tela)
    await vi.waitFor(() => expect(recarregar).toHaveBeenCalledTimes(1))
    expect(sessionStorage.getItem('oonsystems_recarga_versao')).toBe('1')
  })

  it('se falhar de novo depois de recarregar, mostra o aviso em vez de tela branca', async () => {
    sessionStorage.setItem('oonsystems_recarga_versao', '1')
    const Tela = lazyComRecarga(() => Promise.reject(new Error('Failed to fetch dynamically imported module')))
    montar(Tela)
    expect(await screen.findByText('Não foi possível abrir esta tela')).toBeTruthy()
    expect(recarregar).not.toHaveBeenCalled()
  })

  it('carregou bem: limpa a marca para uma próxima publicação', async () => {
    sessionStorage.setItem('oonsystems_recarga_versao', '1')
    const Tela = lazyComRecarga(async () => ({ default: () => <p>tela ok</p> }))
    montar(Tela)
    expect(await screen.findByText('tela ok')).toBeTruthy()
    expect(sessionStorage.getItem('oonsystems_recarga_versao')).toBeNull()
  })
})
