import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { aplicarTemaSistema, TEMA_PADRAO, TEMAS_SISTEMA, temaValido } from './temasSistema'

const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8')

describe('temas do sistema', () => {
  afterEach(() => document.documentElement.removeAttribute('data-tema'))

  it('tem 5 temas com ids únicos e o padrão é o azul', () => {
    expect(TEMAS_SISTEMA).toHaveLength(5)
    expect(new Set(TEMAS_SISTEMA.map((t) => t.id)).size).toBe(5)
    expect(TEMA_PADRAO).toBe('azul')
  })

  it('cada tema (menos o padrão) tem CSS no claro e no escuro', () => {
    for (const t of TEMAS_SISTEMA.filter((t) => t.id !== TEMA_PADRAO)) {
      expect(css).toContain(`:root[data-tema="${t.id}"] {`)
      expect(css).toContain(`:root.dark[data-tema="${t.id}"] {`)
    }
  })

  it('a prévia usa a mesma cor primária do CSS', () => {
    for (const t of TEMAS_SISTEMA.filter((t) => t.id !== TEMA_PADRAO)) {
      const bloco = css.split(`:root[data-tema="${t.id}"] {`)[1].split('}')[0]
      const primaria = /--primary: oklch\(([\d.]+) ([\d.]+) (\d+)\)/.exec(bloco)!
      const [, l, c, h] = /oklch\(([\d.]+) ([\d.]+) (\d+)\)/.exec(t.primaria)!
      expect(Number(primaria[1])).toBeCloseTo(Number(l), 3)
      expect(Number(primaria[2])).toBeCloseTo(Number(c), 3)
      expect(primaria[3]).toBe(h)
    }
  })

  it('temas de menu escuro têm o CSS do menu com a mesma cor da prévia', () => {
    for (const t of TEMAS_SISTEMA.filter((t) => t.menuEscuro)) {
      const bloco = css.split(`:root[data-tema="${t.id}"] [data-area="menu"] {`)[1]?.split('}')[0]
      expect(bloco, t.id).toBeDefined()
      expect(bloco).toContain(`--sidebar: ${t.menu.replace(/oklch\(([\d.]+) ([\d.]+) (\d+)\)/, (_, l, c, h) =>
        `oklch(${Number(l).toFixed(3)} ${Number(c).toFixed(3)} ${h})`)};`)
    }
    expect(TEMAS_SISTEMA.find((t) => t.id === TEMA_PADRAO)?.menuEscuro).toBe(false)
  })

  it('aplica o atributo no <html> e o padrão remove', () => {
    aplicarTemaSistema('petroleo')
    expect(document.documentElement.getAttribute('data-tema')).toBe('petroleo')
    aplicarTemaSistema('azul')
    expect(document.documentElement.hasAttribute('data-tema')).toBe(false)
    aplicarTemaSistema('grafite')
    aplicarTemaSistema(null)
    expect(document.documentElement.hasAttribute('data-tema')).toBe(false)
  })

  it('valida o id do tema', () => {
    expect(temaValido('marinho')).toBe(true)
    expect(temaValido('vermelho')).toBe(false)
    expect(temaValido(null)).toBe(false)
  })
})
