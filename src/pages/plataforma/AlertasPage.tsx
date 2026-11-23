/**
 * Plataforma > Alertas: prazos de teste e vigência, limites do plano,
 * clientes bloqueados, clientes sem uso e contas a pagar vencendo/vencidas.
 */

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertOctagon, AlertTriangle, ArrowRight, Building2, CheckCircle2, Info, WalletCards } from 'lucide-react'
import { nomeDoCliente, type GravidadeAlerta } from '@/services/plataformaService'
import { useDadosPlataforma } from './PlataformaLayout'
import { Carregando, formatarData } from './comum'
import { EstadoVazio } from '@/components/ui/feedback'

const GRAVIDADE: Record<GravidadeAlerta, { rotulo: string; icone: typeof Info; classe: string }> = {
  critico: { rotulo: 'Crítico', icone: AlertOctagon, classe: 'text-destructive bg-destructive/5 border-destructive/30' },
  atencao: { rotulo: 'Atenção', icone: AlertTriangle, classe: 'text-warning-foreground bg-warning/10 border-warning/30' },
  info: { rotulo: 'Informativo', icone: Info, classe: 'text-info bg-info/10 border-info/30' },
}

function Etiqueta({ gravidade }: { gravidade: GravidadeAlerta }) {
  const g = GRAVIDADE[gravidade]
  const Icone = g.icone
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium whitespace-nowrap ${g.classe}`}>
      <Icone className="h-3.5 w-3.5" aria-hidden="true" /> {g.rotulo}
    </span>
  )
}

export default function AlertasPage() {
  const { alertas, alertasContas, carregando, clientes } = useDadosPlataforma()
  const [filtro, setFiltro] = useState<GravidadeAlerta | 'todos'>('todos')

  const contagem = useMemo(() => {
    const conta = (g: GravidadeAlerta) =>
      alertas.filter((a) => a.gravidade === g).length + alertasContas.filter((a) => a.gravidade === g).length
    return { critico: conta('critico'), atencao: conta('atencao'), info: conta('info') }
  }, [alertas, alertasContas])

  if (carregando && clientes.length === 0) return <Carregando />

  const passa = (g: GravidadeAlerta) => filtro === 'todos' || g === filtro
  const visiveis = alertas.filter((a) => passa(a.gravidade))
  const contasVisiveis = alertasContas.filter((a) => passa(a.gravidade))
  const total = alertas.length + alertasContas.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Alertas</h1>
        <p className="text-sm text-muted-foreground">
          Testes e vigências vencendo, limites do plano, bloqueios, clientes sem uso e contas a pagar.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Filtrar por gravidade">
        {(['todos', 'critico', 'atencao', 'info'] as const).map((g) => (
          <button
            key={g}
            role="radio"
            aria-checked={filtro === g}
            onClick={() => setFiltro(g)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border cursor-pointer ${
              filtro === g ? 'bg-primary/10 text-primary border-primary/30' : 'bg-card text-muted-foreground border-border hover:border-border-strong hover:text-foreground'
            }`}
          >
            {g === 'todos' ? 'Todos' : GRAVIDADE[g].rotulo}{' '}
            <span className="tabular-nums opacity-70">({g === 'todos' ? total : contagem[g]})</span>
          </button>
        ))}
      </div>

      {visiveis.length === 0 && contasVisiveis.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EstadoVazio
            icone={CheckCircle2}
            titulo={filtro !== 'todos' ? 'Nenhum alerta nessa categoria' : 'Nenhum alerta'}
            descricao="Tudo em dia com os clientes e as contas."
          />
        </div>
      ) : (
        <>
          {contasVisiveis.length > 0 && (
            <section className="space-y-2" aria-labelledby="alertas-contas">
              <h2 id="alertas-contas" className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <WalletCards className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> Contas a pagar
              </h2>
              <ul className="bg-card rounded-xl border border-border shadow-sm divide-y divide-border">
                {contasVisiveis.map((a) => (
                  <li key={a.conta.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                    <Etiqueta gravidade={a.gravidade} />
                    <div className="flex-1 min-w-[180px]">
                      <p className="font-medium text-foreground truncate">
                        {a.conta.descricao}
                        {a.conta.fornecedor && <span className="font-normal text-muted-foreground"> · {a.conta.fornecedor}</span>}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {a.mensagem} Vencimento {formatarData(a.conta.vencimento)}.
                      </p>
                    </div>
                    <Link
                      to="/plataforma/contas-a-pagar"
                      className="inline-flex items-center gap-1 text-sm text-foreground/80 hover:text-foreground font-medium whitespace-nowrap"
                    >
                      Abrir contas <ArrowRight className="h-4 w-4" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {visiveis.length > 0 && (
            <section className="space-y-2" aria-labelledby="alertas-clientes">
              <h2 id="alertas-clientes" className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> Clientes
              </h2>
              <ul className="bg-card rounded-xl border border-border shadow-sm divide-y divide-border">
                {visiveis.map((a, i) => (
                  <li key={`${a.tipo}-${a.cliente.id}-${i}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                    <Etiqueta gravidade={a.gravidade} />
                    <div className="flex-1 min-w-[180px]">
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
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
