import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))

import { caminhoNoBucket, pastaDoEstabelecimento, setEstabelecimentoAtivo } from './tenant'

const URL_BASE = 'https://x.supabase.co/storage/v1/object/public/produtos-imagens'

describe('pastaDoEstabelecimento', () => {
  afterEach(() => setEstabelecimentoAtivo(null))

  it('coloca o arquivo dentro do estabelecimento ativo', () => {
    setEstabelecimentoAtivo('abc')
    expect(pastaDoEstabelecimento('logos')).toBe('abc/logos')
  })

  it('exige um estabelecimento ativo', () => {
    expect(() => pastaDoEstabelecimento('logos')).toThrow('Nenhum estabelecimento selecionado')
  })
})

describe('caminhoNoBucket', () => {
  it('devolve o caminho completo dentro do bucket', () => {
    expect(caminhoNoBucket(`${URL_BASE}/abc/produtos/foto.png`, 'produtos-imagens')).toBe('abc/produtos/foto.png')
  })

  it('ignora parâmetros e decodifica o nome', () => {
    expect(caminhoNoBucket(`${URL_BASE}/abc/foto%20nova.png?t=1`, 'produtos-imagens')).toBe('abc/foto nova.png')
  })

  it('não aceita URL de outro bucket ou site', () => {
    expect(caminhoNoBucket(`${URL_BASE}/abc/foto.png`, 'sistema-imagens')).toBeNull()
    expect(caminhoNoBucket('https://exemplo.com/foto.png', 'produtos-imagens')).toBeNull()
  })
})
