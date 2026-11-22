import { useCallback, useLayoutEffect, useRef, type RefObject } from 'react'

/**
 * Animação FLIP (First, Last, Invert, Play) para reordenação de listas.
 *
 * Uso:
 *  1. Marque cada item com `data-flip-id` único dentro do container.
 *  2. Chame `capturar()` ANTES de mudar a ordem (ex.: no clique).
 *  3. Passe em `gatilho` o valor que muda a ordem (ex.: a ordenação).
 * Os itens deslizam da posição antiga para a nova; itens novos aparecem com fade.
 */
export function useFlipAnimation(containerRef: RefObject<HTMLElement | null>, gatilho: unknown) {
  const posicoes = useRef<Map<string, DOMRect> | null>(null)

  const capturar = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const mapa = new Map<string, DOMRect>()
    container.querySelectorAll<HTMLElement>('[data-flip-id]').forEach(el => {
      mapa.set(el.dataset.flipId!, el.getBoundingClientRect())
    })
    posicoes.current = mapa
  }, [containerRef])

  useLayoutEffect(() => {
    const anteriores = posicoes.current
    posicoes.current = null
    const container = containerRef.current
    if (!anteriores || !container) return

    const reduzirMovimento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduzirMovimento || typeof Element.prototype.animate !== 'function') return

    const alturaTela = window.innerHeight
    const visivel = (r: DOMRect) => r.bottom > -100 && r.top < alturaTela + 100

    let ordem = 0
    container.querySelectorAll<HTMLElement>('[data-flip-id]').forEach(el => {
      const nova = el.getBoundingClientRect()
      const antiga = anteriores.get(el.dataset.flipId!)
      // Fora da tela antes e depois: não anima (economiza no celular)
      if (!visivel(nova) && (!antiga || !visivel(antiga))) return

      const atraso = Math.min(ordem++ * 25, 250)
      if (!antiga) {
        el.animate(
          [{ opacity: 0, transform: 'scale(0.94)' }, { opacity: 1, transform: 'none' }],
          { duration: 350, delay: atraso, easing: 'ease-out', fill: 'backwards' }
        )
        return
      }

      const dx = antiga.left - nova.left
      const dy = antiga.top - nova.top
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return

      el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(1)`, zIndex: 1 },
          { transform: `translate(${dx * 0.5}px, ${dy * 0.5}px) scale(0.96)`, zIndex: 1, offset: 0.4 },
          { transform: 'none', zIndex: 1 }
        ],
        { duration: 550, delay: atraso, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' }
      )
    })
  }, [gatilho, containerRef])

  return capturar
}
