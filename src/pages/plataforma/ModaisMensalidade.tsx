/**
 * Modais do controle de mensalidades: registrar pagamento e histórico de
 * pagamentos do cliente (com estorno do último).
 */

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowRight, Receipt, Undo2 } from 'lucide-react'
import {
  nomeDoCliente,
  plataformaService,
  valorDoCiclo,
  vencimentoAposPagamento,
  type ClientePlataforma,
  type FormaPagamento,
  type PagamentoMensalidade,
  type Plano,
} from '@/services/plataformaService'
import { confirmar } from '@/components/ui/confirmar'
import { ModalPlanoCliente } from './ModaisCliente'
import { EstadoVazio, TabelaCarregando } from '@/components/ui/feedback'
import {
  BotaoPrimario,
  BotaoSecundario,
  Campo,
  classeInput,
  deInputData,
  formatarData,
  formatarDataHora,
  formatarReais,
  Modal,
  paraInputData,
  ROTULO_FORMA,
  StatusCliente,
} from './comum'

interface PropsModal {
  cliente: ClientePlataforma
  onFechar: () => void
  onAlterado: () => void
}

// ---------------------------------------------------------------------------
// Registrar pagamento
// ---------------------------------------------------------------------------
export function ModalRegistrarPagamento({ cliente, planos, onFechar, onAlterado }: PropsModal & { planos: Plano[] }) {
  const valorCiclo = valorDoCiclo(cliente, planos)
  const anual = cliente.ciclo === 'anual'
  const hoje = paraInputData(new Date())

  const [periodos, setPeriodos] = useState(1)
  const [valor, setValor] = useState(valorCiclo ? valorCiclo.toFixed(2) : '')
  const [pagoEm, setPagoEm] = useState(hoje)
  const [forma, setForma] = useState<FormaPagamento>('pix')
  const [observacao, setObservacao] = useState('')
  const [liberar, setLiberar] = useState(cliente.status !== 'ativo')
  const [salvando, setSalvando] = useState(false)

  const sugerido = useMemo(() => {
    const [a, m, d] = (pagoEm || hoje).split('-').map(Number)
    return paraInputData(vencimentoAposPagamento(cliente.vigencia_ate, cliente.ciclo, periodos, new Date(a, m - 1, d)))
  }, [cliente.vigencia_ate, cliente.ciclo, periodos, pagoEm, hoje])
  const [vencimento, setVencimento] = useState(sugerido)
  const [vencimentoEditado, setVencimentoEditado] = useState(false)

  // Acompanha a sugestão até o admin mexer na data
  useEffect(() => {
    if (!vencimentoEditado) setVencimento(sugerido)
  }, [sugerido, vencimentoEditado])

  const alterarPeriodos = (n: number) => {
    setPeriodos(n)
    if (valorCiclo) setValor((valorCiclo * n).toFixed(2))
  }

  const salvar = async () => {
    const valorNum = Number(valor.replace(',', '.'))
    if (!Number.isFinite(valorNum) || valorNum < 0) return toast.error('Informe um valor válido')
    if (!pagoEm) return toast.error('Informe a data do pagamento')
    const vencimentoNovo = deInputData(vencimento)
    if (!vencimentoNovo) return toast.error('Informe o próximo vencimento')

    setSalvando(true)
    try {
      await plataformaService.registrarPagamento({
        tenantId: cliente.id,
        valor: valorNum,
        pagoEm,
        forma,
        periodos,
        vencimentoNovo,
        observacao,
        liberarAcesso: liberar,
      })
      toast.success('Pagamento registrado')
      onAlterado()
      onFechar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível registrar o pagamento')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      aberto
      onFechar={onFechar}
      titulo="Registrar pagamento"
      descricao={`${nomeDoCliente(cliente)} · ${cliente.plano_nome ?? 'sem plano'} · ${anual ? 'anual' : 'mensal'}`}
      rodape={
        <>
          <BotaoSecundario onClick={onFechar}>Cancelar</BotaoSecundario>
          <BotaoPrimario onClick={salvar} carregando={salvando}>Confirmar pagamento</BotaoPrimario>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo={anual ? 'Anos pagos' : 'Meses pagos'}>
            <select className={classeInput} value={periodos} onChange={(e) => alterarPeriodos(Number(e.target.value))}>
              {Array.from({ length: anual ? 3 : 12 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Valor recebido (R$)" ajuda={valorCiclo ? `${formatarReais(valorCiclo)} por ${anual ? 'ano' : 'mês'}` : 'Cliente sem plano com preço'}>
            <input className={classeInput} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
          </Campo>
          <Campo rotulo="Pago em">
            <input type="date" className={classeInput} value={pagoEm} max={hoje} onChange={(e) => setPagoEm(e.target.value)} />
          </Campo>
          <Campo rotulo="Forma">
            <select className={classeInput} value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento)}>
              {Object.entries(ROTULO_FORMA).map(([id, rotulo]) => <option key={id} value={id}>{rotulo}</option>)}
            </select>
          </Campo>
        </div>

        <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-2">
          <p className="text-sm font-medium text-foreground">Vencimento</p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground line-through">{formatarData(cliente.vigencia_ate)}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <input
              type="date"
              className={`${classeInput} w-auto`}
              value={vencimento}
              onChange={(e) => {
                setVencimento(e.target.value)
                setVencimentoEditado(true)
              }}
              aria-label="Próximo vencimento"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {cliente.vigencia_ate
              ? 'O próximo vencimento mantém o dia de vencimento atual, mesmo com pagamento em atraso.'
              : 'Cliente sem vencimento definido: conta a partir da data do pagamento.'}
          </p>
        </div>

        <Campo rotulo="Observação (opcional)">
          <input className={classeInput} maxLength={300} value={observacao} onChange={(e) => setObservacao(e.target.value)}
            placeholder="Ex.: comprovante enviado pelo WhatsApp" />
        </Campo>

        {cliente.status !== 'ativo' && (
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={liberar} onChange={(e) => setLiberar(e.target.checked)} />
            <span>
              Liberar o acesso do cliente (hoje: <StatusCliente cliente={cliente} />)
            </span>
          </label>
        )}
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Histórico de pagamentos do cliente
// ---------------------------------------------------------------------------
export function ModalPagamentosCliente({ cliente, onFechar, onAlterado }: PropsModal) {
  const [pagamentos, setPagamentos] = useState<PagamentoMensalidade[] | null>(null)
  const [estornando, setEstornando] = useState<string | null>(null)

  const carregar = () =>
    plataformaService
      .listarPagamentos({ tenantId: cliente.id, incluirEstornados: true })
      .then(setPagamentos)
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : 'Erro ao carregar os pagamentos')
        setPagamentos([])
      })

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente.id])

  // Só o último pagamento válido pode ser estornado
  const ultimoValido = useMemo(
    () =>
      (pagamentos ?? [])
        .filter((p) => !p.estornado_em)
        .sort((a, b) => b.criado_em.localeCompare(a.criado_em))[0]?.id,
    [pagamentos],
  )
  const totalPago = (pagamentos ?? []).filter((p) => !p.estornado_em).reduce((s, p) => s + p.valor, 0)

  const estornar = async (p: PagamentoMensalidade) => {
    const ok = await confirmar({
      titulo: `Estornar o pagamento de ${formatarReais(p.valor)}?`,
      descricao: `O vencimento volta para ${formatarData(p.vencimento_anterior)}. O status do cliente não muda.`,
      confirmar: 'Estornar',
      perigo: true,
    })
    if (!ok) return
    setEstornando(p.id)
    try {
      await plataformaService.estornarPagamento(p.id)
      toast.success('Pagamento estornado')
      onAlterado()
      await carregar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível estornar')
    } finally {
      setEstornando(null)
    }
  }

  return (
    <Modal
      aberto
      onFechar={onFechar}
      titulo="Pagamentos"
      descricao={`${nomeDoCliente(cliente)} · total recebido ${formatarReais(totalPago)}`}
      largura="sm:max-w-2xl"
    >
      {!pagamentos ? (
        <TabelaCarregando colunas={4} linhas={3} />
      ) : pagamentos.length === 0 ? (
        <EstadoVazio icone={Receipt} titulo="Nenhum pagamento registrado" className="py-8" />
      ) : (
        <ul className="divide-y divide-border">
          {pagamentos.map((p) => (
            <li key={p.id} className={`py-3 flex items-start gap-3 text-sm ${p.estornado_em ? 'opacity-60' : ''}`}>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">
                  <span className={p.estornado_em ? 'line-through' : ''}>{formatarReais(p.valor)}</span>
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {ROTULO_FORMA[p.forma]} · pago em {formatarData(p.pago_em)}
                    {p.periodos > 1 && ` · ${p.periodos} ${p.ciclo === 'anual' ? 'anos' : 'meses'}`}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Vencimento {formatarData(p.vencimento_anterior)} → {formatarData(p.vencimento_novo)}
                </p>
                {p.observacao && <p className="text-xs text-muted-foreground italic">{p.observacao}</p>}
                {p.estornado_em && (
                  <p className="text-xs text-destructive">
                    Estornado em {formatarDataHora(p.estornado_em)}{p.motivo_estorno ? ` · ${p.motivo_estorno}` : ''}
                  </p>
                )}
              </div>
              {p.id === ultimoValido && (
                <BotaoSecundario onClick={() => estornar(p)} disabled={estornando !== null} title="Estornar este pagamento">
                  <Undo2 className="h-4 w-4" /> Estornar
                </BotaoSecundario>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Nova mensalidade: escolhe o cliente e define plano, ciclo e 1º vencimento
// ---------------------------------------------------------------------------
export function ModalNovaMensalidade({
  clientes,
  planos,
  onFechar,
  onAlterado,
}: Omit<PropsModal, 'cliente'> & { clientes: ClientePlataforma[]; planos: Plano[] }) {
  const [busca, setBusca] = useState('')
  const [escolhido, setEscolhido] = useState<ClientePlataforma | null>(null)

  // Inativos ficam de fora; quem ainda não tem plano aparece primeiro
  const candidatos = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return clientes
      .filter((c) => c.status !== 'cancelado')
      .filter((c) => !termo || [c.razao_social, c.nome_fantasia, c.documento, c.email].filter(Boolean).join(' ').toLowerCase().includes(termo))
      .sort((a, b) => Number(!!a.plano_id) - Number(!!b.plano_id) || nomeDoCliente(a).localeCompare(nomeDoCliente(b)))
  }, [clientes, busca])

  if (escolhido) {
    return <ModalPlanoCliente cliente={escolhido} planos={planos} onFechar={onFechar} onAlterado={onAlterado} />
  }

  return (
    <Modal
      aberto
      onFechar={onFechar}
      titulo="Nova mensalidade"
      descricao="Escolha o cliente. Em seguida defina o plano (valor), o ciclo e a data de adesão."
      rodape={<BotaoSecundario onClick={onFechar}>Cancelar</BotaoSecundario>}
    >
      <div className="space-y-3">
        <input
          className={classeInput}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, CPF/CNPJ ou e-mail..."
          aria-label="Buscar cliente"
          autoFocus
        />
        {candidatos.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhum cliente encontrado.</p>
        ) : (
          <ul className="max-h-80 overflow-y-auto divide-y divide-border rounded-lg border border-border">
            {candidatos.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setEscolhido(c)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-accent cursor-pointer"
                >
                  <span className="flex-1 min-w-0">
                    <span className="block font-medium text-foreground truncate">{nomeDoCliente(c)}</span>
                    <span className="block text-xs text-muted-foreground">
                      {c.plano_nome
                        ? `Já tem mensalidade: ${c.plano_nome} · ${c.ciclo} · vence ${formatarData(c.vigencia_ate)}`
                        : 'Sem mensalidade'}
                    </span>
                  </span>
                  <StatusCliente cliente={c} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}
