/**
 * Plataforma > Alertas: prazos de teste e vigência, limites do plano,
 * clientes bloqueados e clientes sem uso.
 */

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertOctagon, AlertTriangle, ArrowRight, CheckCircle2, Info } from 'lucide-react'
import { nomeDoCliente, type GravidadeAlerta } from '@/services/plataformaService'
import { useDadosPlataforma } from './PlataformaLayout'
import { Carregando } from './comum'
import { EstadoVazio } from '@/components/ui/feedback'

const GRAVIDADE: Record<GravidadeAlerta, { rotulo: string; icone: typeof Info; classe: string }> = {
  critico: { rotulo: 'Crítico', icone: AlertOctagon, classe: 'text-destructive bg-destructive/5 border-destructive/30' },
  atencao: { rotulo: 'Atenção', icone: AlertTriangle, classe: 'text-warning-foreground bg-warning/10 border-warning/30' },
  info: { rotulo: 'Informativo', icone: Info, classe: 'text-sky-800 bg-sky-50 border-sky-200' },
}

export default function AlertasPage() {
  const { alertas, carregando, clientes } = useDadosPlataforma()
  const [filtro, setFiltro] = useState<GravidadeAlerta | 'todos'>('todos')

  const contagem = useMemo(() => ({
    critico: alertas.filter((a) => a.gravidade === 'critico').length,
    atencao: alertas.filter((a) => a.gravidade === 'atencao').length,
    info: alertas.filter((a) => a.gravidade === 'info').length,
  }), [alertas])

  if (carregando && clientes.length === 0) return <Carregando />

  const visiveis = filtro === 'todos' ? alertas : alertas.filter((a) => a.gravidade === filtro)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Alertas</h1>
        <p className="text-sm text-muted-foreground">
          Testes e vigências vencendo, limites do plano ultrapassados, bloqueios e clientes sem uso.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Filtrar por gravidade">
        {(['todos', 'critico', 'atencao', 'info'] as const).map((g) => {
          const total = g === 'todos' ? alertas.length : contagem[g]
          return (
            <button
              key={g}
              role="radio"
              aria-checked={filtro === g}
              onClick={() => setFiltro(g)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border cursor-pointer ${
                filtro === g ? 'bg-primary/10 text-primary border-primary/30' : 'bg-card text-muted-foreground border-border hover:border-border-strong hover:text-foreground'
              }`}
            >
              {g === 'todos' ? 'Todos' : GRAVIDADE[g].rotulo} <span className="tabular-nums opacity-70">({total})</span>
            </button>
          )
        })}
      </div>

      {visiveis.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EstadoVazio
            icone={CheckCircle2}
            titulo={filtro !== 'todos' ? 'Nenhum alerta nessa categoria' : 'Nenhum alerta'}
            descricao="Tudo em dia com os clientes."
          />
        </div>
      ) : (
        <ul className="bg-card rounded-xl border border-border shadow-sm divide-y divide-border">
          {visiveis.map((a, i) => {
            const g = GRAVIDADE[a.gravidade]
            const Icone = g.icone
            return (
              <li key={`${a.tipo}-${a.cliente.id}-${i}`} className="flex items-center gap-4 px-4 py-3">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium whitespace-nowrap ${g.classe}`}>
                  <Icone className="h-3.5 w-3.5" aria-hidden="true" /> {g.rotulo}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{nomeDoCliente(a.cliente)}</p>
                  <p className="text-sm text-muted-foreground">{a.mensagem}</p>
                </div>
                <Link
                  to={`/plataforma?busca=${encodeURIComponent(a.cliente.slug)}`}
                  className="inline-flex items-center gap-1 text-sm text-foreground/80 hover:text-foreground font-medium whitespace-nowrap"
                >
                  Abrir cliente <ArrowRight className="h-4 w-4" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
