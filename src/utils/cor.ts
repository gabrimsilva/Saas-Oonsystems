/**
 * Utilitários de cor para o tema dinâmico por estabelecimento.
 *
 * Converte cores hex (#RRGGBB) para o formato oklch() usado pelas variáveis CSS
 * do sistema (definidas em src/index.css). Inclui validação para acionar o
 * fallback de tema padrão quando a cor é inválida (Req 6.5).
 *
 * @module utils/cor
 */

const HEX_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

/** Verdadeiro se a string é uma cor hex válida (#RGB ou #RRGGBB). */
export function corHexValida(cor: string | null | undefined): cor is string {
  return typeof cor === 'string' && HEX_REGEX.test(cor.trim())
}

/**
 * Cor que todo cliente recebia por padrão no cadastro (antes do design system).
 * Não é uma escolha do cliente: tratá-la como "sem cor personalizada" faz valer
 * a cor principal do sistema.
 */
export const COR_TEMA_PADRAO_ANTIGA = '#111827'

/** Cor escolhida pela loja, ou null se inválida ou se for o padrão antigo. */
export function corPersonalizada(cor: string | null | undefined): string | null {
  if (!corHexValida(cor)) return null
  return cor.trim().toLowerCase() === COR_TEMA_PADRAO_ANTIGA ? null : cor.trim()
}

/** Normaliza #RGB -> #RRGGBB. Retorna null se inválida. */
function normalizarHex(cor: string): { r: number; g: number; b: number } | null {
  if (!corHexValida(cor)) return null
  let hex = cor.trim().slice(1)
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('')
  }
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  return { r, g, b }
}

/** Converte um canal sRGB [0..255] para linear. */
function srgbParaLinear(c: number): number {
  const cs = c / 255
  return cs <= 0.04045 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4)
}

/**
 * Converte cor hex para a notação `oklch(L C H)` usada pelas variáveis CSS.
 * Retorna null se a cor for inválida.
 *
 * Implementação baseada na conversão sRGB -> linear -> OKLab -> OKLCH.
 */
export function hexParaOklch(cor: string): string | null {
  const rgb = normalizarHex(cor)
  if (!rgb) return null

  const r = srgbParaLinear(rgb.r)
  const g = srgbParaLinear(rgb.g)
  const b = srgbParaLinear(rgb.b)

  // Linear sRGB -> LMS (matriz OKLab)
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b

  const l_ = Math.cbrt(l)
  const m_ = Math.cbrt(m)
  const s_ = Math.cbrt(s)

  // LMS -> OKLab
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_

  const C = Math.sqrt(A * A + B * B)
  let H = (Math.atan2(B, A) * 180) / Math.PI
  if (H < 0) H += 360

  const Lr = +L.toFixed(4)
  const Cr = +C.toFixed(4)
  const Hr = +H.toFixed(2)
  return `oklch(${Lr} ${Cr} ${Hr})`
}

/**
 * Gera uma paleta de tokens a partir da cor base, para aplicar nas variáveis CSS
 * do sistema. Usa a mesma matiz com pequenas variações de luminosidade para
 * estados (hover/accent). Retorna null se a cor base for inválida (Req 6.5).
 */
export interface PaletaTema {
  base: string         // --primary / --sidebar-primary / --chart-1 / --ring
  baseHex: string
  /** Hover/pressed: mais escuro (ou mais claro, se a cor já for muito escura) */
  hover: string
  /** Texto sobre a cor base: branco ou grafite, o que tiver contraste */
  texto: string
}

export function gerarPaleta(corHex: string): PaletaTema | null {
  const base = hexParaOklch(corHex)
  if (!base) return null
  const [L, C, H] = base.slice(6, -1).split(' ').map(Number)
  const Lhover = L < 0.35 ? L + 0.08 : L - 0.06
  return {
    base,
    baseHex: corHex,
    hover: `oklch(${+Lhover.toFixed(4)} ${C} ${H})`,
    texto: L > 0.68 ? 'oklch(0.24 0.012 260)' : 'oklch(1 0 0)',
  }
}
