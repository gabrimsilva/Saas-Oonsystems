import { useLayoutEffect, useRef, useState } from 'react'
import { ArrowDownAZ, ArrowDownWideNarrow, ArrowUpWideNarrow, ArrowUpZA, Flame, type LucideIcon } from 'lucide-react'
import type { ProdutoCatalogo } from '@/components/delivery/CatalogoProdutoCard'
import type { TipoVenda } from '@/services/lojaOnlineService'
import { precoUnitario } from './precos'

export type Ordenacao = 'mais-vendidos' | 'a-z' | 'z-a' | 'menor-preco' | 'maior-preco'

const OPCOES: Array<{ id: Ordenacao; titulo: string; Icone: LucideIcon }> = [
  { id: 'mais-vendidos', titulo: 'Mais vendidos', Icone: Flame },
  { id: 'a-z', titulo: 'A – Z', Icone: ArrowDownAZ },
  { id: 'z-a', titulo: 'Z – A', Icone: ArrowUpZA },
  { id: 'menor-preco', titulo: 'Mais barato', Icone: ArrowDownWideNarrow },
  { id: 'maior-preco', titulo: 'Mais caro', Icone: ArrowUpWideNarrow },
]

const comparadorNome = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true })

/** Devolve uma cópia ordenada. Produtos sem preço online vão para o fim nas ordenações por preço. */
export function ordenarProdutos(
  produtos: ProdutoCatalogo[],
  ordenacao: Ordenacao,
  modo: TipoVenda,
  vendas: Map<string, number>,
): ProdutoCatalogo[] {
  const porNome = (a: ProdutoCatalogo, b: ProdutoCatalogo) => comparadorNome.compare(a.nome, b.nome)
  const lista = [...produtos]

  switch (ordenacao) {
    case 'a-z':
      return lista.sort(porNome)
    case 'z-a':
      return lista.sort((a, b) => porNome(b, a))
    case 'menor-preco':
    case 'maior-preco': {
      const sinal = ordenacao === 'menor-preco' ? 1 : -1
      return lista.sort((a, b) => {
        const pa = precoUnitario(a, modo)
        const pb = precoUnitario(b, modo)
        if (pa <= 0 || pb <= 0) return pa <= 0 && pb <= 0 ? porNome(a, b) : pa <= 0 ? 1 : -1
        return (pa - pb) * sinal || porNome(a, b)
      })
    }
    case 'mais-vendidos':
    default:
      return lista.sort((a, b) => (vendas.get(b.id) || 0) - (vendas.get(a.id) || 0) || porNome(a, b))
  }
}

interface OrdenacaoCatalogoProps {
  valor: Ordenacao
  onMudar: (ordenacao: Ordenacao) => void
}

/** Chips de ordenação com indicador deslizante (na cor do tema da loja) */
export default function OrdenacaoCatalogo({ valor, onMudar }: OrdenacaoCatalogoProps) {
  const trilhoRef = useRef<HTMLDivElement>(null)
  const [indicador, setIndicador] = useState<{ left: number; width: number } | null>(null)

  // Posiciona a "pílula" sob o chip ativo e o mantém visível no scroll horizontal
  useLayoutEffect(() => {
    const trilho = trilhoRef.current
    const ativo = trilho?.querySelector<HTMLElement>(`[data-ordem="${valor}"]`)
    if (!trilho || !ativo) return
    const medir = () => setIndicador({ left: ativo.offsetLeft, width: ativo.offsetWidth })
    medir()
    // Rola só o trilho (nunca a página) para deixar o chip ativo visível
    const fim = ativo.offsetLeft + ativo.offsetWidth
    if (ativo.offsetLeft < trilho.scrollLeft) trilho.scrollTo({ left: ativo.offsetLeft - 8, behavior: 'smooth' })
    else if (fim > trilho.scrollLeft + trilho.clientWidth) trilho.scrollTo({ left: fim - trilho.clientWidth + 8, behavior: 'smooth' })
    const observador = new ResizeObserver(medir)
    observador.observe(trilho)
    return () => observador.disconnect()
  }, [valor])

  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="hidden sm:inline text-sm font-medium text-muted-foreground shrink-0">Ordenar por</span>
      <div
        ref={trilhoRef}
        role="radiogroup"
        aria-label="Ordenar produtos"
        className="relative flex gap-1 overflow-x-auto scroll-smooth bg-card border border-border rounded-full p-1 shadow-xs max-w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {indicador && (
          <span
            aria-hidden
            className="absolute top-1 bottom-1 rounded-full bg-primary shadow-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            style={{ left: indicador.left, width: indicador.width }}
          />
        )}
        {OPCOES.map(({ id, titulo, Icone }) => {
          const ativo = valor === id
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={ativo}
              data-ordem={id}
              onClick={() => !ativo && onMudar(id)}
              className={`relative z-10 flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition-colors duration-300 cursor-pointer ${
                ativo ? 'text-primary-foreground' : 'text-muted-foreground hover:text-primary'
              }`}
            >
              <Icone className={`h-4 w-4 transition-transform duration-300 ${ativo ? 'scale-110' : ''}`} aria-hidden="true" />
              {titulo}
            </button>
          )
        })}
      </div>
    </div>
  )
}
