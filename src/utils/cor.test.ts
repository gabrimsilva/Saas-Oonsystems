import { describe, expect, it } from 'vitest'
import { COR_TEMA_PADRAO_ANTIGA, corPersonalizada, gerarPaleta } from './cor'

describe('cor da loja', () => {
  it('o padrão antigo do cadastro não conta como cor personalizada', () => {
    expect(corPersonalizada(COR_TEMA_PADRAO_ANTIGA)).toBeNull()
    expect(corPersonalizada('#111827')).toBeNull()
  })

  it('cores escolhidas pela loja continuam valendo', () => {
    expect(corPersonalizada('#0F766E')).toBe('#0F766E')
    expect(corPersonalizada('#9f1239')).toBe('#9f1239')
  })

  it('cor inválida não é aplicada', () => {
    expect(corPersonalizada('azul')).toBeNull()
    expect(corPersonalizada(null)).toBeNull()
  })

  it('paleta gera hover e texto com contraste', () => {
    const escura = gerarPaleta('#1E3A8A')!
    expect(escura.texto).toBe('oklch(1 0 0)')
    const clara = gerarPaleta('#FDE68A')!
    expect(clara.texto).not.toBe('oklch(1 0 0)')
    expect(escura.hover).toMatch(/^oklch\(/)
  })
})
