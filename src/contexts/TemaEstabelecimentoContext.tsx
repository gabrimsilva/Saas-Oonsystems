/**
 * TemaEstabelecimentoProvider — identidade visual por estabelecimento
 *
 * Observa o Estabelecimento_Atual e injeta a cor de tema nas variáveis CSS do
 * `:root` em tempo real, sem recarregar a página (Req 6.1-6.6). Quando não há
 * estabelecimento ou a cor é inválida, aplica o tema padrão (variáveis originais
 * definidas em src/index.css) e sinaliza via atributo de dados.
 *
 * @module contexts/TemaEstabelecimentoContext
 */

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useEstabelecimento } from './EstabelecimentoContext'
import { gerarPaleta, corHexValida, corPersonalizada } from '@/utils/cor'

/** Variáveis CSS de cor principal afetadas pelo tema do estabelecimento. */
const VARS_PRIMARIAS = [
  '--primary',
  '--ring',
  '--sidebar-primary',
  '--chart-1',
  '--price-color',
  '--price-color-cliente',
  '--color-price',
  '--color-price-cliente',
]

/** Variáveis derivadas da cor base (hover e texto sobre a cor). */
const VARS_DERIVADAS = ['--primary-hover', '--primary-foreground', '--sidebar-primary-foreground']

function limparTema() {
  const root = document.documentElement
  for (const v of [...VARS_PRIMARIAS, ...VARS_DERIVADAS]) {
    root.style.removeProperty(v)
  }
  root.removeAttribute('data-tema-estabelecimento')
  root.removeAttribute('data-tema-padrao')
}

function aplicarTema(corHex: string): boolean {
  const paleta = gerarPaleta(corHex)
  if (!paleta) return false
  const root = document.documentElement
  for (const v of VARS_PRIMARIAS) {
    root.style.setProperty(v, paleta.base)
  }
  root.style.setProperty('--primary-hover', paleta.hover)
  root.style.setProperty('--primary-foreground', paleta.texto)
  root.style.setProperty('--sidebar-primary-foreground', paleta.texto)
  root.setAttribute('data-tema-estabelecimento', corHex)
  root.removeAttribute('data-tema-padrao')
  return true
}

interface ProviderProps {
  children: ReactNode
}

export const TemaEstabelecimentoProvider = ({ children }: ProviderProps) => {
  const { estabelecimentoAtual } = useEstabelecimento()

  useEffect(() => {
    const root = document.documentElement
    if (!estabelecimentoAtual) {
      // Sem estabelecimento: tema padrão (Req 6.6)
      limparTema()
      return
    }
    const cor = estabelecimentoAtual.cor_tema
    // Padrão antigo do cadastro: usa a cor principal do sistema (não é escolha da loja)
    if (corHexValida(cor) && !corPersonalizada(cor)) {
      limparTema()
      return
    }
    if (!corHexValida(cor) || !aplicarTema(cor)) {
      // Cor inválida/ausente: tema padrão + sinalização (Req 6.5)
      limparTema()
      root.setAttribute('data-tema-padrao', 'true')
    }
  }, [estabelecimentoAtual])

  return <>{children}</>
}
