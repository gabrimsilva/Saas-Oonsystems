/**
 * IndicadorEstabelecimento — indicador visual permanente do estabelecimento
 * atual no cabeçalho, exibindo nome e cor correspondente (Req 7.1-7.5).
 *
 * @module components/estabelecimento/IndicadorEstabelecimento
 */

import { Building2, AlertTriangle } from 'lucide-react'
import { useEstabelecimento } from '@/contexts/EstabelecimentoContext'
import { corPersonalizada } from '@/utils/cor'

export default function IndicadorEstabelecimento() {
  const { estabelecimentoAtual, loading } = useEstabelecimento()

  if (loading) return null

  if (!estabelecimentoAtual) {
    // Nenhum estabelecimento selecionado (Req 7.5)
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-warning/40 bg-warning/10 px-3 py-1">
        <AlertTriangle className="size-3.5 text-warning-foreground" />
        <span className="text-xs font-medium text-warning-foreground">
          Nenhum estabelecimento selecionado
        </span>
      </div>
    )
  }

  const cor = corPersonalizada(estabelecimentoAtual.cor_tema) ?? 'var(--primary)'

  return (
    <div
      className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-muted px-3 py-1"
      title={`Estabelecimento atual: ${estabelecimentoAtual.nome}`}
    >
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: cor }} aria-hidden="true" />
      <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate text-xs font-medium text-foreground">
        {estabelecimentoAtual.nome}
      </span>
    </div>
  )
}
