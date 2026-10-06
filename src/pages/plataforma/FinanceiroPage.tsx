/**
 * Plataforma > Financeiro: receita recorrente estimada a partir dos planos
 * contratados, mensalidades a vencer e o que foi de fato recebido (pagamentos
 * registrados em Mensalidades).
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AlertOctagon, CalendarClock, CircleDollarSign, DollarSign, Receipt, TrendingUp, Wallet } from 'lucide-react'
import {
  diasAte,
  ehPagante,
  nomeDoCliente,
  plataformaService,
  temMensalidade,
  valorDoCiclo,
  valorMensalDoCliente,
  type PagamentoMensalidade,
} from '@/services/plataformaService'
import { useDadosPlataforma } from './PlataformaLayout'
import { CartaoIndicador, Carregando, formatarData, formatarReais, paraInputData } from './comum'
import { CalendarCheck } from 'lucide-react'
import { EstadoVazio } from '@/components/ui/feedback'

const MESES_GRAFICO = 6

/** Últimos N meses ("yyyy-mm"), do mais antigo ao atual */
function ultimosMeses(n: number): string[] {
  const hoje = new Date()
  return Array.from({ length: n }, (_, i) =>
    paraInputData(new Date(hoje.getFullYear(), hoje.getMonth() - (n - 1 - i), 1)).slice(0, 7))
}

const rotuloMes = (mes: string) =>
  new Date(`${mes}-15T12:00:00`).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '')

export default function FinanceiroPage() {
  const { clientes, planos, carregando } = useDadosPlataforma()
  const [pagamentos, setPagamentos] = useState<PagamentoMensalidade[] | null>(null)
  const meses = useMemo(() => ultimosMeses(MESES_GRAFICO), [])

  useEffect(() => {
    plataformaService
      .listarPagamentos({ de: `${meses[0]}-01` })
      .then(setPagamentos)
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : 'Erro ao carregar os pagamentos', { id: 'financeiro-pagamentos' })
        setPagamentos([])
      })
  }, [meses])

  const recebidoPorMes = useMemo(
    () =>
      meses.map((mes) => {
        const doMes = (pagamentos ?? []).filter((p) => p.pago_em.startsWith(mes))
        return { mes, total: doMes.reduce((s, p) => s + p.valor, 0), qtd: doMes.length }
      }),
    [meses, pagamentos],
  )
  const recebidoNoMes = recebidoPorMes[recebidoPorMes.length - 1]

  const resumo = useMemo(() => {
    const pagantes = clientes.filter(ehPagante)
    const mrr = pagantes.reduce((soma, c) => soma + valorMensalDoCliente(c, planos), 0)

    const porPlano = planos
      .map((p) => {
        const doPlano = pagantes.filter((c) => c.plano_id === p.id)
        return {
          plano: p,
          clientes: doPlano.length,
          mensais: doPlano.filter((c) => c.ciclo === 'mensal').length,
          anuais: doPlano.filter((c) => c.ciclo === 'anual').length,
          mrr: doPlano.reduce((soma, c) => soma + valorMensalDoCliente(c, planos), 0),
        }
      })
      .filter((l) => l.clientes > 0 || l.plano.ativo)
      .sort((a, b) => b.mrr - a.mrr)

    const renovacoes = clientes
      .filter((c) => temMensalidade(c) && c.vigencia_ate)
      .map((c) => ({ cliente: c, dias: diasAte(c.vigencia_ate) ?? 0, valor: valorDoCiclo(c, planos) }))
      .filter((r) => r.dias <= 30)
      .sort((a, b) => a.dias - b.dias)

    return {
      pagantes: pagantes.length,
      mrr,
      arr: mrr * 12,
      ticket: pagantes.length ? mrr / pagantes.length : 0,
      ativosSemPlano: clientes.filter((c) => c.status === 'ativo' && !c.plano_id).length,
      emTeste: clientes.filter((c) => c.status === 'trial').length,
      porPlano,
      renovacoes,
      aReceber30: renovacoes.filter((r) => r.dias >= 0).reduce((s, r) => s + r.valor, 0),
      vencidas: renovacoes.filter((r) => r.dias < 0),
      emAtraso: renovacoes.filter((r) => r.dias < 0).reduce((s, r) => s + r.valor, 0),
    }
  }, [clientes, planos])

  if (carregando && clientes.length === 0) return <Carregando />

  const maiorMrr = Math.max(...resumo.porPlano.map((l) => l.mrr), 0)
  const maiorRecebido = Math.max(...recebidoPorMes.map((m) => m.total), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Financeiro</h1>
        <p className="text-sm text-muted-foreground">
          O que foi recebido (pagamentos registrados em Mensalidades) e a receita estimada pelos planos dos clientes ativos.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <CartaoIndicador titulo="Recebido no mês" valor={pagamentos ? formatarReais(recebidoNoMes.total) : '…'}
          detalhe={`${recebidoNoMes.qtd} pagamento(s)`} icone={<CircleDollarSign className="h-5 w-5" />} cor="text-success" />
        <CartaoIndicador titulo="Em atraso" valor={formatarReais(resumo.emAtraso)}
          detalhe={`${resumo.vencidas.length} mensalidade(s) vencida(s)`} icone={<AlertOctagon className="h-5 w-5" />}
          cor={resumo.emAtraso > 0 ? 'text-destructive' : 'text-foreground'} />
        <CartaoIndicador titulo="Receita mensal (MRR)" valor={formatarReais(resumo.mrr)} icone={<DollarSign className="h-5 w-5" />} />
        <CartaoIndicador titulo="Receita anual (ARR)" valor={formatarReais(resumo.arr)} icone={<TrendingUp className="h-5 w-5" />} />
        <CartaoIndicador titulo="Clientes pagantes" valor={resumo.pagantes}
          detalhe={`${resumo.emTeste} em teste · ${resumo.ativosSemPlano} ativo(s) sem plano`} icone={<Wallet className="h-5 w-5" />} />
        <CartaoIndicador titulo="Ticket médio" valor={formatarReais(resumo.ticket)} detalhe="por cliente pagante / mês"
          icone={<Receipt className="h-5 w-5" />} />
      </div>

      {/* Recebido por mês */}
      <section className="bg-card rounded-xl border border-border shadow-sm p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-foreground">Recebido por mês</h2>
            <p className="text-xs text-muted-foreground">
              Pagamentos registrados nos últimos {MESES_GRAFICO} meses · total{' '}
              <strong className="text-foreground">{formatarReais(recebidoPorMes.reduce((s, m) => s + m.total, 0))}</strong>
            </p>
          </div>
          <Link to="/plataforma/mensalidades" className="text-sm font-medium text-primary hover:underline whitespace-nowrap">
            Registrar pagamentos
          </Link>
        </div>
        {!pagamentos ? (
          <div className="h-44 mt-4 rounded-lg bg-muted/50 animate-pulse" />
        ) : (
          <ul className="mt-4 grid gap-2 sm:gap-4" style={{ gridTemplateColumns: `repeat(${MESES_GRAFICO}, minmax(0, 1fr))` }}
            aria-label="Recebido por mês">
            {recebidoPorMes.map((m, i) => {
              const atual = i === recebidoPorMes.length - 1
              const altura = maiorRecebido > 0 ? (m.total / maiorRecebido) * 100 : 0
              return (
                <li key={m.mes} className="group flex flex-col items-center gap-1.5"
                  title={`${rotuloMes(m.mes)}: ${formatarReais(m.total)} em ${m.qtd} pagamento(s)`}>
                  <span className={`text-[11px] sm:text-xs tabular-nums whitespace-nowrap ${
                    atual ? 'font-semibold text-foreground' : 'text-muted-foreground sm:opacity-0 sm:group-hover:opacity-100'
                  }`}>
                    {formatarReais(m.total)}
                  </span>
                  <div className="h-32 w-full flex items-end justify-center border-b border-border">
                    <div
                      className={`w-full max-w-12 rounded-t ${atual ? 'bg-primary' : 'bg-primary/55 group-hover:bg-primary/80'}`}
                      style={{ height: m.total > 0 ? `max(${altura}%, 2px)` : 0 }}
                    />
                  </div>
                  <span className={`text-xs ${atual ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{rotuloMes(m.mes)}</span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Receita por plano */}
        <section className="bg-card rounded-xl border border-border shadow-sm p-5">
          <h2 className="font-semibold text-foreground">Receita mensal por plano</h2>
          <p className="text-xs text-muted-foreground mb-4">MRR de cada plano entre os clientes ativos</p>
          {resumo.porPlano.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhum plano cadastrado. <Link to="/plataforma/planos" className="underline">Criar planos</Link>
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left font-semibold pb-2">Plano</th>
                  <th className="text-right font-semibold pb-2">Clientes</th>
                  <th className="text-left font-semibold pb-2 pl-4 w-[40%]">MRR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {resumo.porPlano.map((l) => (
                  <tr key={l.plano.id}>
                    <td className="py-2.5">
                      <span className="font-medium text-foreground">{l.plano.nome}</span>
                      <span className="block text-xs text-muted-foreground">
                        {formatarReais(l.plano.preco_mensal)}/mês · {formatarReais(l.plano.preco_anual)}/ano
                      </span>
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-foreground/80" title={`${l.mensais} mensal(is) · ${l.anuais} anual(is)`}>
                      {l.clientes}
                    </td>
                    <td className="py-2.5 pl-4">
                      <div className="flex items-center gap-2" title={`${l.plano.nome}: ${formatarReais(l.mrr)} por mês`}>
                        <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gray-800 rounded-full"
                            style={{ width: maiorMrr > 0 ? `${(l.mrr / maiorMrr) * 100}%` : 0 }}
                          />
                        </div>
                        <span className="tabular-nums text-foreground w-24 text-right">{formatarReais(l.mrr)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Renovações */}
        <section className="bg-card rounded-xl border border-border shadow-sm p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-foreground">Mensalidades a vencer (30 dias)</h2>
              <p className="text-xs text-muted-foreground">
                A receber: <strong className="text-foreground">{formatarReais(resumo.aReceber30)}</strong>
                {resumo.vencidas.length > 0 && (
                  <span className="text-destructive"> · {resumo.vencidas.length} vencida(s)</span>
                )}
              </p>
            </div>
            <Link to="/plataforma/mensalidades" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline whitespace-nowrap">
              <CalendarClock className="h-4 w-4" aria-hidden="true" /> Mensalidades
            </Link>
          </div>
          {resumo.renovacoes.length === 0 ? (
            <EstadoVazio icone={CalendarCheck} titulo="Nenhuma mensalidade vencendo" descricao="Nada vence nos próximos 30 dias." className="py-8" />
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {resumo.renovacoes.map(({ cliente, dias, valor }) => (
                <li key={cliente.id} className="py-2.5 flex items-center gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <Link to={`/plataforma?busca=${encodeURIComponent(cliente.slug)}`} className="font-medium text-foreground hover:underline truncate block">
                      {nomeDoCliente(cliente)}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {cliente.plano_nome} · {cliente.ciclo === 'anual' ? 'anual' : 'mensal'} · vence {formatarData(cliente.vigencia_ate)}
                    </span>
                  </div>
                  <span className={`text-xs font-medium whitespace-nowrap ${dias < 0 ? 'text-destructive' : dias <= 7 ? 'text-warning-foreground' : 'text-muted-foreground'}`}>
                    {dias < 0 ? `vencida há ${-dias}d` : dias === 0 ? 'hoje' : `em ${dias}d`}
                  </span>
                  <span className="tabular-nums text-foreground w-24 text-right">{formatarReais(valor)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
