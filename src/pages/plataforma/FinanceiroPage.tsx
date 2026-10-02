/**
 * Plataforma > Financeiro: receita recorrente estimada a partir dos planos
 * contratados e renovações próximas. Sem integração de cobrança: os valores
 * vêm do preço do plano e do ciclo de cada cliente ativo.
 */

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, DollarSign, Receipt, TrendingUp, Wallet } from 'lucide-react'
import {
  diasAte,
  ehPagante,
  nomeDoCliente,
  valorMensalDoCliente,
} from '@/services/plataformaService'
import { useDadosPlataforma } from './PlataformaLayout'
import { CartaoIndicador, Carregando, formatarData, formatarReais } from './comum'
import { CalendarCheck } from 'lucide-react'
import { EstadoVazio } from '@/components/ui/feedback'

export default function FinanceiroPage() {
  const { clientes, planos, carregando } = useDadosPlataforma()

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
      .filter((c) => c.status === 'ativo' && c.plano_id && c.vigencia_ate)
      .map((c) => {
        const plano = planos.find((p) => p.id === c.plano_id)
        const valor = plano ? (c.ciclo === 'anual' ? plano.preco_anual : plano.preco_mensal) : 0
        return { cliente: c, dias: diasAte(c.vigencia_ate) ?? 0, valor }
      })
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
    }
  }, [clientes, planos])

  if (carregando && clientes.length === 0) return <Carregando />

  const maiorMrr = Math.max(...resumo.porPlano.map((l) => l.mrr), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Financeiro</h1>
        <p className="text-sm text-muted-foreground">
          Receita recorrente estimada pelos planos dos clientes ativos (anual dividido por 12).
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CartaoIndicador titulo="Receita mensal (MRR)" valor={formatarReais(resumo.mrr)} icone={<DollarSign className="h-5 w-5" />} />
        <CartaoIndicador titulo="Receita anual (ARR)" valor={formatarReais(resumo.arr)} icone={<TrendingUp className="h-5 w-5" />} />
        <CartaoIndicador titulo="Clientes pagantes" valor={resumo.pagantes}
          detalhe={`${resumo.emTeste} em teste · ${resumo.ativosSemPlano} ativo(s) sem plano`} icone={<Wallet className="h-5 w-5" />} />
        <CartaoIndicador titulo="Ticket médio" valor={formatarReais(resumo.ticket)} detalhe="por cliente pagante / mês"
          icone={<Receipt className="h-5 w-5" />} />
      </div>

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
              <h2 className="font-semibold text-foreground">Renovações nos próximos 30 dias</h2>
              <p className="text-xs text-muted-foreground">
                A receber: <strong className="text-foreground">{formatarReais(resumo.aReceber30)}</strong>
                {resumo.vencidas.length > 0 && (
                  <span className="text-destructive"> · {resumo.vencidas.length} vigência(s) vencida(s)</span>
                )}
              </p>
            </div>
            <CalendarClock className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          {resumo.renovacoes.length === 0 ? (
            <EstadoVazio icone={CalendarCheck} titulo="Nenhuma vigência vencendo" descricao="Nada vence nos próximos 30 dias." className="py-8" />
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
