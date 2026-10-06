/**
 * Plataforma > Mensalidades: vencimentos dos clientes com plano, cobrança pelo
 * WhatsApp, registro de pagamento (avança o vencimento) e recebimentos do mês.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  AlertOctagon,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CircleDollarSign,
  History,
  MessageCircle,
  Plus,
  Receipt,
  Search,
} from 'lucide-react'
import {
  diasAte,
  mensagemCobranca,
  nomeDoCliente,
  plataformaService,
  situacaoMensalidade,
  temMensalidade,
  valorDoCiclo,
  type ClientePlataforma,
  type PagamentoMensalidade,
  type SituacaoMensalidade,
} from '@/services/plataformaService'
import { linkWhatsAppLoja } from '@/components/catalogo/whatsappPedido'
import { Button } from '@/components/ui/button'
import { EstadoVazio, TabelaCarregando } from '@/components/ui/feedback'
import { useTabelaResponsiva } from '@/hooks/useTabelaResponsiva'
import { useDadosPlataforma } from './PlataformaLayout'
import { CartaoIndicador, Carregando, formatarData, formatarReais, paraInputData, ROTULO_FORMA, StatusCliente } from './comum'
import { ModalNovaMensalidade, ModalPagamentosCliente, ModalRegistrarPagamento } from './ModaisMensalidade'

type Filtro = 'a_vencer' | 'vencida' | 'hoje' | 'semana' | 'em_dia' | 'sem_data' | 'todas'

const FILTROS: Array<{ id: Filtro; rotulo: string }> = [
  { id: 'a_vencer', rotulo: 'Pendentes (30 dias)' },
  { id: 'vencida', rotulo: 'Vencidas' },
  { id: 'hoje', rotulo: 'Vencem hoje' },
  { id: 'semana', rotulo: 'Próximos 7 dias' },
  { id: 'em_dia', rotulo: 'Em dia' },
  { id: 'sem_data', rotulo: 'Sem vencimento' },
  { id: 'todas', rotulo: 'Todas' },
]

function passaNoFiltro(s: SituacaoMensalidade, filtro: Filtro): boolean {
  switch (filtro) {
    case 'todas': return true
    case 'a_vencer': return s === 'vencida' || s === 'hoje' || s === 'semana' || s === 'mes'
    case 'semana': return s === 'hoje' || s === 'semana'
    case 'em_dia': return s === 'mes' || s === 'em_dia'
    default: return s === filtro
  }
}

const ORDEM_SITUACAO: Record<SituacaoMensalidade, number> = { vencida: 0, hoje: 1, semana: 2, mes: 3, em_dia: 4, sem_data: 5 }

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Primeiro e último dia (yyyy-mm-dd) do mês "yyyy-mm" */
function limitesDoMes(mes: string): { de: string; ate: string } {
  const [a, m] = mes.split('-').map(Number)
  const ultimo = new Date(a, m, 0).getDate()
  return { de: `${mes}-01`, ate: `${mes}-${String(ultimo).padStart(2, '0')}` }
}

function TagSituacao({ vencimento }: { vencimento: string | null }) {
  const dias = diasAte(vencimento)
  if (dias === null) return <span className="text-xs text-muted-foreground">Sem vencimento</span>
  const [texto, classe] =
    dias < 0 ? [`Vencida há ${-dias} dia(s)`, 'text-destructive']
      : dias === 0 ? ['Vence hoje', 'text-warning-foreground font-semibold']
        : dias <= 7 ? [`Em ${dias} dia(s)`, 'text-warning-foreground']
          : [`Em ${dias} dias`, 'text-muted-foreground']
  return (
    <div className="leading-tight whitespace-nowrap">
      <div className="text-foreground">{formatarData(vencimento)}</div>
      <div className={`text-xs ${classe}`}>{texto}</div>
    </div>
  )
}

export default function MensalidadesPage() {
  const tabelaRef = useTabelaResponsiva()
  const { clientes, planos, carregando, recarregar } = useDadosPlataforma()
  const [filtro, setFiltro] = useState<Filtro>('a_vencer')
  const [busca, setBusca] = useState('')
  const [mes, setMes] = useState(() => paraInputData(new Date()).slice(0, 7))
  const [recebidos, setRecebidos] = useState<PagamentoMensalidade[] | null>(null)
  const [ultimos, setUltimos] = useState<Map<string, PagamentoMensalidade>>(new Map())
  const [aberto, setAberto] = useState<{ acao: 'pagar' | 'historico'; cliente: ClientePlataforma } | null>(null)
  const [nova, setNova] = useState(false)

  const carregarPagamentos = useCallback(async () => {
    try {
      const { de, ate } = limitesDoMes(mes)
      // Pagamentos do mês escolhido + os dos últimos 13 meses (último pagamento de cada cliente)
      const inicio = new Date()
      inicio.setMonth(inicio.getMonth() - 13)
      const [doMes, recentes] = await Promise.all([
        plataformaService.listarPagamentos({ de, ate }),
        plataformaService.listarPagamentos({ de: paraInputData(inicio) }),
      ])
      setRecebidos(doMes)
      const mapa = new Map<string, PagamentoMensalidade>()
      for (const p of recentes) if (!mapa.has(p.tenant_id)) mapa.set(p.tenant_id, p)
      setUltimos(mapa)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar os pagamentos', { id: 'mensalidades-pagamentos' })
      setRecebidos([])
    }
  }, [mes])

  useEffect(() => {
    carregarPagamentos()
  }, [carregarPagamentos])

  const aposAlterar = () => {
    recarregar()
    carregarPagamentos()
  }

  const linhas = useMemo(
    () =>
      clientes
        .filter(temMensalidade)
        .map((c) => ({ cliente: c, situacao: situacaoMensalidade(c.vigencia_ate), valor: valorDoCiclo(c, planos) }))
        .sort(
          (a, b) =>
            ORDEM_SITUACAO[a.situacao] - ORDEM_SITUACAO[b.situacao] ||
            (a.cliente.vigencia_ate ?? '').localeCompare(b.cliente.vigencia_ate ?? ''),
        ),
    [clientes, planos],
  )

  const resumo = useMemo(() => {
    const soma = (lista: typeof linhas) => lista.reduce((s, l) => s + l.valor, 0)
    const vencidas = linhas.filter((l) => l.situacao === 'vencida')
    const semana = linhas.filter((l) => l.situacao === 'hoje' || l.situacao === 'semana')
    const mes30 = linhas.filter((l) => l.situacao === 'hoje' || l.situacao === 'semana' || l.situacao === 'mes')
    return {
      vencidas: { qtd: vencidas.length, valor: soma(vencidas) },
      semana: { qtd: semana.length, valor: soma(semana) },
      mes30: { qtd: mes30.length, valor: soma(mes30) },
      ativosSemPlano: clientes.filter((c) => c.status === 'ativo' && !c.plano_id).length,
    }
  }, [linhas, clientes])

  const contagem = useMemo(() => {
    const r = {} as Record<Filtro, number>
    for (const f of FILTROS) r[f.id] = linhas.filter((l) => passaNoFiltro(l.situacao, f.id)).length
    return r
  }, [linhas])

  const visiveis = useMemo(() => {
    const termo = normalizar(busca.trim())
    return linhas.filter((l) => {
      if (!passaNoFiltro(l.situacao, filtro)) return false
      if (!termo) return true
      const c = l.cliente
      return normalizar([c.razao_social, c.nome_fantasia, c.email, c.cidade, c.plano_nome].filter(Boolean).join(' ')).includes(termo)
    })
  }, [linhas, filtro, busca])

  const totalRecebido = (recebidos ?? []).reduce((s, p) => s + p.valor, 0)
  const clientePorId = useMemo(() => new Map(clientes.map((c) => [c.id, c])), [clientes])
  const nomeDoMes = new Date(`${mes}-15T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  if (carregando && clientes.length === 0) return <Carregando />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Mensalidades</h1>
          <p className="text-sm text-muted-foreground">
            Vencimentos dos clientes com plano. Ao registrar o pagamento, o vencimento avança um ciclo.
          </p>
        </div>
        <Button onClick={() => setNova(true)}>
          <Plus /> Nova mensalidade
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CartaoIndicador titulo="Vencidas" valor={resumo.vencidas.qtd} detalhe={`${formatarReais(resumo.vencidas.valor)} em atraso`}
          icone={<AlertOctagon className="h-5 w-5" />} cor={resumo.vencidas.qtd ? 'text-destructive' : 'text-foreground'} />
        <CartaoIndicador titulo="Vencem em 7 dias" valor={resumo.semana.qtd} detalhe={formatarReais(resumo.semana.valor)}
          icone={<CalendarClock className="h-5 w-5" />} cor={resumo.semana.qtd ? 'text-warning-foreground' : 'text-foreground'} />
        <CartaoIndicador titulo="A receber em 30 dias" valor={formatarReais(resumo.mes30.valor)} detalhe={`${resumo.mes30.qtd} mensalidade(s)`}
          icone={<CalendarDays className="h-5 w-5" />} />
        <CartaoIndicador titulo="Recebido no mês" valor={formatarReais(totalRecebido)} detalhe={`${recebidos?.length ?? 0} pagamento(s) em ${nomeDoMes}`}
          icone={<CircleDollarSign className="h-5 w-5" />} cor="text-success" />
      </div>

      {/* Vencimentos */}
      <section className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 flex flex-wrap items-center gap-3 border-b border-border">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="h-4 w-4 text-muted-foreground/70 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar cliente, cidade ou plano..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-muted/50 focus:bg-card focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              aria-label="Buscar mensalidades"
            />
          </div>
          <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Filtrar por vencimento">
            {FILTROS.map((f) => (
              <button
                key={f.id}
                role="radio"
                aria-checked={filtro === f.id}
                onClick={() => setFiltro(f.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer ${
                  filtro === f.id ? 'bg-primary/10 text-primary border-primary/30' : 'bg-card text-muted-foreground border-border hover:border-border-strong hover:text-foreground'
                }`}
              >
                {f.rotulo} <span className="tabular-nums opacity-70">({contagem[f.id]})</span>
              </button>
            ))}
          </div>
        </div>

        <div ref={tabelaRef} className="tabela-responsiva overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Cliente</th>
                <th className="text-left font-semibold px-4 py-3">Plano</th>
                <th className="text-left font-semibold px-4 py-3">Vencimento</th>
                <th className="text-right font-semibold px-4 py-3">Valor</th>
                <th className="text-left font-semibold px-4 py-3">Último pagamento</th>
                <th className="text-left font-semibold px-4 py-3">Status</th>
                <th className="text-right font-semibold px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visiveis.map(({ cliente: c, valor }) => {
                const ultimo = ultimos.get(c.id)
                const whatsapp = c.telefone ? linkWhatsAppLoja(c.telefone, mensagemCobranca(c, valor, c.vigencia_ate)) : null
                return (
                  <tr key={c.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3 min-w-[180px]">
                      <Link to={`/plataforma?busca=${encodeURIComponent(c.slug)}`} className="font-medium text-foreground hover:underline">
                        {nomeDoCliente(c)}
                      </Link>
                      {c.telefone && <span className="block text-xs text-muted-foreground">{c.telefone}</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-foreground/80">
                      {c.plano_nome} <span className="text-xs text-muted-foreground">· {c.ciclo === 'anual' ? 'anual' : 'mensal'}</span>
                    </td>
                    <td className="px-4 py-3"><TagSituacao vencimento={c.vigencia_ate} /></td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground">{formatarReais(valor)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {ultimo ? (
                        <>
                          {formatarData(ultimo.pago_em)}
                          <span className="block text-xs">{formatarReais(ultimo.valor)} · {ROTULO_FORMA[ultimo.forma]}</span>
                        </>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3"><StatusCliente cliente={c} /></td>
                    <td className="px-2 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {whatsapp && (
                          <a
                            href={whatsapp}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg hover:bg-accent text-success"
                            title="Cobrar pelo WhatsApp"
                            aria-label={`Cobrar ${nomeDoCliente(c)} pelo WhatsApp`}
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        )}
                        <button
                          onClick={() => setAberto({ acao: 'historico', cliente: c })}
                          className="p-2 rounded-lg hover:bg-accent text-foreground/80 cursor-pointer"
                          title="Pagamentos do cliente"
                          aria-label={`Pagamentos de ${nomeDoCliente(c)}`}
                        >
                          <History className="h-4 w-4" />
                        </button>
                        <Button size="sm" onClick={() => setAberto({ acao: 'pagar', cliente: c })}>
                          <Receipt /> Registrar pagamento
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {visiveis.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EstadoVazio
                      icone={CalendarCheck}
                      titulo={linhas.length === 0 ? 'Nenhum cliente com plano' : 'Nenhuma mensalidade nesse filtro'}
                      descricao={linhas.length === 0
                        ? 'Use o botão Nova mensalidade para vincular um plano a um cliente.'
                        : filtro === 'a_vencer' ? 'Nada vencido nem vencendo nos próximos 30 dias.' : 'Ajuste a busca ou o filtro.'}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-3 text-xs text-muted-foreground border-t border-border">
          {visiveis.length} de {linhas.length} cliente(s) com plano
          {resumo.ativosSemPlano > 0 && (
            <> · <Link to="/plataforma" className="underline">{resumo.ativosSemPlano} ativo(s) sem plano</Link> não aparecem aqui</>
          )}
        </p>
      </section>

      {/* Recebimentos do mês */}
      <section className="bg-card rounded-xl border border-border shadow-sm p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-foreground">Pagamentos recebidos</h2>
            <p className="text-xs text-muted-foreground">
              Total em {nomeDoMes}: <strong className="text-foreground">{formatarReais(totalRecebido)}</strong>
            </p>
          </div>
          <input
            type="month"
            value={mes}
            onChange={(e) => e.target.value && setMes(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-1.5 bg-card"
            aria-label="Mês dos recebimentos"
          />
        </div>
        {!recebidos ? (
          <div className="mt-3"><TabelaCarregando colunas={4} linhas={3} /></div>
        ) : recebidos.length === 0 ? (
          <EstadoVazio icone={Receipt} titulo="Nenhum pagamento neste mês" className="py-8" />
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {recebidos.map((p) => {
              const c = clientePorId.get(p.tenant_id)
              return (
                <li key={p.id} className="py-2.5 flex items-center gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    {c ? (
                      <button onClick={() => setAberto({ acao: 'historico', cliente: c })}
                        className="font-medium text-foreground hover:underline truncate block text-left cursor-pointer">
                        {nomeDoCliente(c)}
                      </button>
                    ) : (
                      <span className="font-medium text-muted-foreground">Cliente removido</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatarData(p.pago_em)} · {ROTULO_FORMA[p.forma]}
                      {p.periodos > 1 && ` · ${p.periodos} ${p.ciclo === 'anual' ? 'anos' : 'meses'}`}
                      {' · vencimento até '}{formatarData(p.vencimento_novo)}
                    </span>
                  </div>
                  <span className="tabular-nums text-foreground font-medium">{formatarReais(p.valor)}</span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {nova && (
        <ModalNovaMensalidade clientes={clientes} planos={planos} onFechar={() => setNova(false)} onAlterado={aposAlterar} />
      )}
      {aberto?.acao === 'pagar' && (
        <ModalRegistrarPagamento cliente={aberto.cliente} planos={planos} onFechar={() => setAberto(null)} onAlterado={aposAlterar} />
      )}
      {aberto?.acao === 'historico' && (
        <ModalPagamentosCliente cliente={aberto.cliente} onFechar={() => setAberto(null)} onAlterado={aposAlterar} />
      )}
    </div>
  )
}
