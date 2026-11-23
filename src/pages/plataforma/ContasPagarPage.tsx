/**
 * Plataforma > Contas a pagar: custos da OonSystems (hospedagem, ferramentas,
 * impostos...). Contas recorrentes geram a próxima ao serem pagas. O Financeiro
 * usa o que foi pago para calcular o lucro real.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  AlertOctagon,
  CalendarClock,
  CheckCircle2,
  Pencil,
  Plus,
  Repeat,
  Search,
  Trash2,
  Undo2,
  Wallet,
  WalletCards,
} from 'lucide-react'
import {
  diasParaVencer,
  plataformaService,
  resumoContas,
  ROTULO_CATEGORIA_CONTA,
  ROTULO_RECORRENCIA,
  situacaoConta,
  type CategoriaConta,
  type ContaPagar,
  type DadosConta,
  type FormaPagamento,
  type RecorrenciaConta,
  type SituacaoConta,
} from '@/services/plataformaService'
import { Button } from '@/components/ui/button'
import { confirmar } from '@/components/ui/confirmar'
import { InputMoeda } from '@/components/ui/input-moeda'
import { avisoComDesfazer } from '@/components/ui/desfazer'
import { EstadoVazio, TabelaCarregando } from '@/components/ui/feedback'
import { useTabelaResponsiva } from '@/hooks/useTabelaResponsiva'
import { useDadosPlataforma } from './PlataformaLayout'
import {
  BotaoPrimario,
  BotaoSecundario,
  Campo,
  CartaoIndicador,
  classeInput,
  formatarData,
  formatarReais,
  Modal,
  paraInputData,
  ROTULO_FORMA,
} from './comum'

type Filtro = 'abertas' | 'vencidas' | 'pagas' | 'todas'

const FILTROS: Array<{ id: Filtro; rotulo: string }> = [
  { id: 'abertas', rotulo: 'A pagar' },
  { id: 'vencidas', rotulo: 'Vencidas' },
  { id: 'pagas', rotulo: 'Pagas' },
  { id: 'todas', rotulo: 'Todas' },
]

/** Pagas dos últimos 12 meses (as em aberto vêm todas) */
const pagasDesde = () => {
  const d = new Date()
  return paraInputData(new Date(d.getFullYear() - 1, d.getMonth(), 1))
}

function passa(s: SituacaoConta, filtro: Filtro) {
  if (filtro === 'todas') return true
  if (filtro === 'pagas') return s === 'paga'
  if (filtro === 'vencidas') return s === 'vencida'
  return s !== 'paga'
}

function TagVencimento({ conta }: { conta: ContaPagar }) {
  const s = situacaoConta(conta)
  if (s === 'paga') {
    return (
      <span className="text-success text-xs font-medium inline-flex items-center gap-1">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Paga em {formatarData(conta.pago_em)}
      </span>
    )
  }
  const dias = diasParaVencer(conta.vencimento)
  return (
    <span className="whitespace-nowrap">
      <span className="text-foreground">{formatarData(conta.vencimento)}</span>
      <span className={`block text-xs font-medium ${
        s === 'vencida' ? 'text-destructive' : s === 'hoje' || dias <= 7 ? 'text-warning-foreground' : 'text-muted-foreground'
      }`}>
        {s === 'vencida' ? `vencida há ${-dias}d` : s === 'hoje' ? 'vence hoje' : `em ${dias}d`}
      </span>
    </span>
  )
}

export default function ContasPagarPage() {
  const [contas, setContas] = useState<ContaPagar[] | null>(null)
  const [filtro, setFiltro] = useState<Filtro>('abertas')
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState<ContaPagar | 'nova' | null>(null)
  const [pagando, setPagando] = useState<ContaPagar | null>(null)
  const tabelaRef = useTabelaResponsiva()
  const { recarregarContas } = useDadosPlataforma()

  const carregar = useCallback(async () => {
    recarregarContas() // número do menu e página Alertas
    try {
      setContas(await plataformaService.listarContas(pagasDesde()))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar as contas', { id: 'contas-pagar' })
      setContas([])
    }
  }, [recarregarContas])

  useEffect(() => { carregar() }, [carregar])

  const mesAtual = paraInputData(new Date()).slice(0, 7)
  const resumo = useMemo(() => resumoContas(contas ?? [], mesAtual), [contas, mesAtual])

  const contagem = useMemo(() => {
    const r = { abertas: 0, vencidas: 0, pagas: 0, todas: 0 } as Record<Filtro, number>
    for (const c of contas ?? []) {
      const s = situacaoConta(c)
      for (const f of FILTROS) if (passa(s, f.id)) r[f.id]++
    }
    return r
  }, [contas])

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return (contas ?? [])
      .filter((c) => passa(situacaoConta(c), filtro))
      .filter((c) => !termo || [c.descricao, c.fornecedor, ROTULO_CATEGORIA_CONTA[c.categoria]]
        .some((t) => t?.toLowerCase().includes(termo)))
      .sort((a, b) => filtro === 'pagas'
        ? (b.pago_em ?? '').localeCompare(a.pago_em ?? '')
        : a.vencimento.localeCompare(b.vencimento))
  }, [contas, filtro, busca])

  const excluir = async (c: ContaPagar) => {
    const ok = await confirmar({
      titulo: `Excluir "${c.descricao}"?`,
      descricao: c.recorrencia !== 'unica' && !c.pago_em
        ? 'É a próxima conta desta recorrência: excluindo, a recorrência termina aqui.'
        : 'Esta ação não pode ser desfeita.',
      perigo: true,
    })
    if (!ok) return
    try {
      await plataformaService.excluirConta(c.id)
      toast.success('Conta excluída')
      carregar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir')
    }
  }

  const desfazer = async (c: ContaPagar) => {
    const ok = await confirmar({
      titulo: `Desfazer o pagamento de "${c.descricao}"?`,
      descricao: c.recorrencia !== 'unica'
        ? 'A conta volta a ficar em aberto e a próxima da recorrência, ainda não paga, é removida.'
        : 'A conta volta a ficar em aberto.',
    })
    if (!ok) return
    try {
      await plataformaService.desfazerPagamentoConta(c.id)
      toast.success('Pagamento desfeito')
      carregar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao desfazer')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Contas a pagar</h1>
          <p className="text-sm text-muted-foreground">
            Custos da plataforma. Contas mensais e anuais geram a próxima automaticamente ao serem pagas.
          </p>
        </div>
        <Button onClick={() => setEditando('nova')}>
          <Plus /> Nova conta
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CartaoIndicador titulo="Vencidas" valor={resumo.vencidas.qtd} detalhe={`${formatarReais(resumo.vencidas.valor)} em atraso`}
          icone={<AlertOctagon className="h-5 w-5" />} cor={resumo.vencidas.qtd ? 'text-destructive' : 'text-foreground'} />
        <CartaoIndicador titulo="A pagar em 30 dias" valor={formatarReais(resumo.aPagar30.valor)} detalhe={`${resumo.aPagar30.qtd} conta(s)`}
          icone={<CalendarClock className="h-5 w-5" />} />
        <CartaoIndicador titulo="Pago no mês" valor={formatarReais(resumo.pagoNoMes)} detalhe={`${resumo.qtdPagoNoMes} conta(s)`}
          icone={<Wallet className="h-5 w-5" />} />
        <CartaoIndicador titulo="Custo fixo mensal" valor={formatarReais(resumo.custoFixoMensal)} detalhe="contas recorrentes (anuais ÷ 12)"
          icone={<Repeat className="h-5 w-5" />} />
      </div>

      <section className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 flex flex-wrap items-center gap-3 border-b border-border">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="h-4 w-4 text-muted-foreground/70 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar conta, fornecedor ou categoria..."
              className={`${classeInput} w-full pl-9`}
              aria-label="Buscar contas"
            />
          </div>
          <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Filtrar contas">
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

        {!contas ? (
          <TabelaCarregando />
        ) : visiveis.length === 0 ? (
          <EstadoVazio
            icone={WalletCards}
            titulo={contas.length === 0 ? 'Nenhuma conta cadastrada' : 'Nenhuma conta neste filtro'}
            descricao={contas.length === 0 ? 'Cadastre os custos da plataforma para acompanhar o lucro real no Financeiro.' : undefined}
            className="py-12"
          />
        ) : (
          <div ref={tabelaRef} className="tabela-responsiva overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">Conta</th>
                  <th className="text-left font-semibold px-4 py-3">Categoria</th>
                  <th className="text-left font-semibold px-4 py-3">Vencimento</th>
                  <th className="text-right font-semibold px-4 py-3">Valor</th>
                  <th className="text-left font-semibold px-4 py-3">Recorrência</th>
                  <th className="text-right font-semibold px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visiveis.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 min-w-[180px]">
                      <span className="font-medium text-foreground">{c.descricao}</span>
                      {(c.fornecedor || c.observacao) && (
                        <span className="block text-xs text-muted-foreground">
                          {[c.fornecedor, c.observacao].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-foreground/80">{ROTULO_CATEGORIA_CONTA[c.categoria].split(' (')[0]}</td>
                    <td className="px-4 py-3"><TagVencimento conta={c} /></td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground whitespace-nowrap">
                      {formatarReais(c.pago_em ? c.valor_pago ?? c.valor : c.valor)}
                      {c.pago_em && c.forma && <span className="block text-xs text-muted-foreground">{ROTULO_FORMA[c.forma]}</span>}
                    </td>
                    <td className="px-4 py-3 text-foreground/80">{ROTULO_RECORRENCIA[c.recorrencia]}</td>
                    <td className="px-2 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {c.pago_em ? (
                          <Button size="sm" variant="outline" onClick={() => desfazer(c)} aria-label={`Desfazer pagamento de ${c.descricao}`}>
                            <Undo2 /> Desfazer
                          </Button>
                        ) : (
                          <>
                            <button onClick={() => setEditando(c)} className="p-2 rounded-lg hover:bg-accent text-foreground/80 cursor-pointer"
                              title="Editar" aria-label={`Editar ${c.descricao}`}>
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button onClick={() => excluir(c)} className="p-2 rounded-lg hover:bg-accent text-destructive cursor-pointer"
                              title="Excluir" aria-label={`Excluir ${c.descricao}`}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                            {diasParaVencer(c.vencimento) > DIAS_PAGAMENTO_ADIANTADO ? (
                              // Ainda longe do vencimento (ex.: a próxima criada ao pagar a anterior)
                              <Button size="sm" variant="outline" onClick={() => setPagando(c)} title="Vence daqui a mais de 7 dias">
                                <CheckCircle2 /> Adiantar
                              </Button>
                            ) : (
                              <Button size="sm" onClick={() => setPagando(c)}>
                                <CheckCircle2 /> Pagar
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editando && (
        <ModalConta conta={editando === 'nova' ? null : editando} onFechar={() => setEditando(null)} onSalvo={carregar} />
      )}
      {pagando && <ModalPagarConta conta={pagando} onFechar={() => setPagando(null)} onPago={carregar} />}
    </div>
  )
}

// ------------------------------------------------------------------ modais
function ModalConta({ conta, onFechar, onSalvo }: { conta: ContaPagar | null; onFechar: () => void; onSalvo: () => void }) {
  const [dados, setDados] = useState<DadosConta>(() => ({
    descricao: conta?.descricao ?? '',
    categoria: conta?.categoria ?? 'infraestrutura',
    fornecedor: conta?.fornecedor ?? '',
    valor: conta?.valor ?? 0,
    vencimento: conta?.vencimento ?? paraInputData(new Date()),
    recorrencia: conta?.recorrencia ?? 'mensal',
    observacao: conta?.observacao ?? '',
  }))
  const [valor, setValor] = useState<number>(conta?.valor ?? 0)
  const [salvando, setSalvando] = useState(false)
  const muda = <K extends keyof DadosConta>(campo: K, valor: DadosConta[K]) => setDados((d) => ({ ...d, [campo]: valor }))

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dados.descricao.trim()) return toast.error('Informe a descrição')
    if (!(valor > 0)) return toast.error('Informe o valor')
    if (!dados.vencimento) return toast.error('Informe o vencimento')
    setSalvando(true)
    try {
      await plataformaService.salvarConta({ ...dados, valor }, conta?.id)
      toast.success(conta ? 'Conta atualizada' : 'Conta cadastrada')
      onSalvo()
      onFechar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      aberto
      onFechar={onFechar}
      titulo={conta ? 'Editar conta' : 'Nova conta a pagar'}
      descricao="Contas mensais e anuais criam a próxima automaticamente quando são pagas."
      rodape={
        <>
          <BotaoSecundario onClick={onFechar}>Cancelar</BotaoSecundario>
          <BotaoPrimario type="submit" form="form-conta" carregando={salvando}>Salvar</BotaoPrimario>
        </>
      }
    >
      <form id="form-conta" onSubmit={salvar} className="space-y-4">
        <Campo rotulo="Descrição">
          <input className={`${classeInput} w-full`} value={dados.descricao} maxLength={120} autoFocus
            placeholder="Ex.: Hospedagem Hostinger" onChange={(e) => muda('descricao', e.target.value)} />
        </Campo>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo rotulo="Categoria">
            <select className={`${classeInput} w-full`} value={dados.categoria}
              onChange={(e) => muda('categoria', e.target.value as CategoriaConta)}>
              {Object.entries(ROTULO_CATEGORIA_CONTA).map(([id, rotulo]) => <option key={id} value={id}>{rotulo}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Fornecedor (opcional)">
            <input className={`${classeInput} w-full`} value={dados.fornecedor ?? ''} maxLength={120}
              onChange={(e) => muda('fornecedor', e.target.value)} />
          </Campo>
          <Campo rotulo="Valor">
            <InputMoeda className={`${classeInput} w-full tabular-nums`} value={valor} onChange={setValor} />
          </Campo>
          <Campo rotulo="Vencimento">
            <input type="date" className={`${classeInput} w-full`} value={dados.vencimento}
              onChange={(e) => muda('vencimento', e.target.value)} />
          </Campo>
          <Campo rotulo="Recorrência">
            <select className={`${classeInput} w-full`} value={dados.recorrencia}
              onChange={(e) => muda('recorrencia', e.target.value as RecorrenciaConta)}>
              {Object.entries(ROTULO_RECORRENCIA).map(([id, rotulo]) => <option key={id} value={id}>{rotulo}</option>)}
            </select>
          </Campo>
        </div>
        <Campo rotulo="Observação (opcional)">
          <input className={`${classeInput} w-full`} value={dados.observacao ?? ''} maxLength={300}
            onChange={(e) => muda('observacao', e.target.value)} />
        </Campo>
      </form>
    </Modal>
  )
}

/** Pagar com mais que isto de antecedência pede confirmação (evita pagar a do mês seguinte por engano) */
const DIAS_PAGAMENTO_ADIANTADO = 7

function ModalPagarConta({ conta, onFechar, onPago }: { conta: ContaPagar; onFechar: () => void; onPago: () => void }) {
  const [pagoEm, setPagoEm] = useState(paraInputData(new Date()))
  const [valor, setValor] = useState<number>(conta.valor)
  const [forma, setForma] = useState<FormaPagamento>('pix')
  const [salvando, setSalvando] = useState(false)
  const diasAteVencer = diasParaVencer(conta.vencimento)
  const adiantada = diasAteVencer > DIAS_PAGAMENTO_ADIANTADO
  const [confirmouAdiantado, setConfirmouAdiantado] = useState(false)

  const pagar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (salvando) return
    if (!(valor > 0)) return toast.error('Informe o valor pago')
    if (!pagoEm) return toast.error('Informe a data do pagamento')
    if (adiantada && !confirmouAdiantado) return toast.error('Confirme que é um pagamento adiantado')
    setSalvando(true)
    try {
      const proxima = await plataformaService.pagarConta(conta.id, pagoEm, valor, forma)
      // Desfazer na hora, sem precisar procurar em "Pagas"
      avisoComDesfazer(
        proxima ? `"${conta.descricao}" paga. A próxima já foi criada.` : `"${conta.descricao}" paga.`,
        async () => {
          try {
            await plataformaService.desfazerPagamentoConta(conta.id)
            toast.success('Pagamento desfeito')
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao desfazer')
          }
          onPago()
        },
        10000,
      )
      onPago()
      onFechar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar o pagamento')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      aberto
      onFechar={onFechar}
      titulo={`Pagar "${conta.descricao}"`}
      descricao={`Vencimento ${formatarData(conta.vencimento)} · ${formatarReais(conta.valor)}${
        conta.recorrencia !== 'unica' ? ` · a próxima (${ROTULO_RECORRENCIA[conta.recorrencia].toLowerCase()}) será criada` : ''
      }`}
      rodape={
        <>
          <BotaoSecundario onClick={onFechar}>Cancelar</BotaoSecundario>
          <BotaoPrimario type="submit" form="form-pagar-conta" carregando={salvando} disabled={adiantada && !confirmouAdiantado}>
            Registrar pagamento
          </BotaoPrimario>
        </>
      }
    >
      {adiantada && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground" role="alert">
          <p className="font-medium">
            Esta conta só vence em {formatarData(conta.vencimento)} (daqui a {diasAteVencer} dias).
          </p>
          <p className="mt-1 text-muted-foreground">
            Confira se não é a do próximo {conta.recorrencia === 'anual' ? 'ano' : 'mês'}, criada quando a anterior foi paga.
          </p>
          <label className="mt-2 flex items-center gap-2 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={confirmouAdiantado}
              onChange={(e) => setConfirmouAdiantado(e.target.checked)}
              className="size-4 accent-[var(--primary)]"
            />
            Sim, quero pagar adiantado
          </label>
        </div>
      )}
      <form id="form-pagar-conta" onSubmit={pagar} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Campo rotulo="Pago em">
          <input type="date" className={`${classeInput} w-full`} value={pagoEm} onChange={(e) => setPagoEm(e.target.value)} />
        </Campo>
        <Campo rotulo="Valor pago">
          <InputMoeda className={`${classeInput} w-full tabular-nums`} value={valor} onChange={setValor} />
        </Campo>
        <Campo rotulo="Forma">
          <select className={`${classeInput} w-full`} value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento)}>
            {Object.entries(ROTULO_FORMA).map(([id, rotulo]) => <option key={id} value={id}>{rotulo}</option>)}
          </select>
        </Campo>
      </form>
    </Modal>
  )
}
