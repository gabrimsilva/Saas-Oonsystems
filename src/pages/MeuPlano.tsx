import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { BadgeCheck, CalendarClock, CreditCard, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alerta, CabecalhoPagina, Carregando, EstadoVazio } from '@/components/ui/feedback'
import { CONTATO_ASSINATURA } from '@/config/plataforma'
import {
  assinaturaService,
  type CicloAssinatura,
  type PlanoAssinatura,
  type ResumoAssinatura,
} from '@/services/assinaturaService'

const DIA_MS = 24 * 60 * 60 * 1000
const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const data = (d: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—')
const ROTULO_FORMA: Record<string, string> = {
  pix: 'PIX', boleto: 'Boleto', cartao: 'Cartão', transferencia: 'Transferência', dinheiro: 'Dinheiro', outro: 'Outro',
}

/** Situação em uma frase, com o tom do alerta */
function situacao(r: ResumoAssinatura): { tipo: 'info' | 'sucesso' | 'atencao' | 'erro'; texto: string } {
  const agora = Date.now()
  if (r.status === 'suspenso') return { tipo: 'erro', texto: 'Acesso bloqueado pela OonSystems. Fale conosco para reativar.' }
  if (r.status === 'cancelado') return { tipo: 'erro', texto: 'Assinatura inativa. Fale com a OonSystems para reativar.' }
  if (r.status === 'trial') {
    if (!r.trial_ate) return { tipo: 'info', texto: 'Você está no período de teste.' }
    return r.acesso_suspenso
      ? { tipo: 'erro', texto: `Seu período de teste terminou em ${data(r.trial_ate)}. Assine para continuar usando.` }
      : { tipo: 'info', texto: `Período de teste até ${data(r.trial_ate)}. Assine agora e os dias restantes do teste são mantidos.` }
  }
  if (!r.vigencia_ate) return { tipo: 'sucesso', texto: 'Assinatura ativa.' }
  const vencimento = new Date(r.vigencia_ate).getTime()
  if (r.acesso_suspenso) return { tipo: 'erro', texto: `Mensalidade vencida em ${data(r.vigencia_ate)}: acesso suspenso até o pagamento.` }
  if (vencimento < agora) {
    const bloqueio = new Date(vencimento + r.dias_tolerancia * DIA_MS).toLocaleDateString('pt-BR')
    return { tipo: 'atencao', texto: `Mensalidade vencida em ${data(r.vigencia_ate)}. Pague até ${bloqueio} para não ter o acesso suspenso.` }
  }
  return { tipo: 'sucesso', texto: `Assinatura em dia. Próximo vencimento: ${data(r.vigencia_ate)}.` }
}

const preco = (p: PlanoAssinatura, ciclo: CicloAssinatura) => Number(ciclo === 'anual' ? p.preco_anual : p.preco_mensal)

export default function MeuPlano() {
  const [params, setParams] = useSearchParams()
  const [resumo, setResumo] = useState<ResumoAssinatura | null>(null)
  const [erro, setErro] = useState('')
  const [planoId, setPlanoId] = useState<string>('')
  const [ciclo, setCiclo] = useState<CicloAssinatura>('mensal')
  const [pagando, setPagando] = useState(false)
  const [retorno, setRetorno] = useState<'' | 'pago' | 'pendente' | 'recusado'>('')

  const carregar = useCallback(async () => {
    try {
      const r = await assinaturaService.resumo()
      setResumo(r)
      setCiclo(r.ciclo)
      setPlanoId((atual) => atual || r.plano?.id || r.planos.find((p) => p.preco_mensal > 0)?.id || '')
    } catch (e) {
      setErro((e as Error).message)
    }
  }, [])

  // Volta do checkout: confirma o pagamento antes de carregar
  useEffect(() => {
    const cobranca = params.get('cobranca')
    if (!cobranca) {
      carregar()
      return
    }
    assinaturaService
      .confirmar(cobranca)
      .then((s) => setRetorno(s === 'pago' ? 'pago' : s === 'recusado' ? 'recusado' : 'pendente'))
      .catch(() => setRetorno('pendente'))
      .finally(() => {
        setParams({}, { replace: true })
        carregar()
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pagar = async () => {
    if (!resumo) return
    setPagando(true)
    try {
      const { checkout_url } = await assinaturaService.pagar(
        resumo.pode_escolher_plano ? { planoId, ciclo } : {},
      )
      window.location.href = checkout_url
    } catch (e) {
      toast.error((e as Error).message)
      setPagando(false)
    }
  }

  if (erro) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Alerta tipo="erro">{erro}</Alerta>
      </div>
    )
  }
  if (!resumo) return <Carregando />

  const s = situacao(resumo)
  const planoCobrado = resumo.pode_escolher_plano
    ? resumo.planos.find((p) => p.id === planoId) ?? null
    : resumo.plano
  const cicloCobrado = resumo.pode_escolher_plano ? ciclo : resumo.ciclo
  const valor = planoCobrado ? preco(planoCobrado, cicloCobrado) : 0
  const textoBotao = resumo.status === 'trial' ? 'Assinar agora' : `Pagar ${cicloCobrado === 'anual' ? 'anuidade' : 'mensalidade'}`

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <CabecalhoPagina titulo="Meu plano" descricao="Assinatura do OonSystems, vencimento e pagamentos." icone={BadgeCheck} />

      {retorno === 'pago' && <Alerta tipo="sucesso" titulo="Pagamento confirmado">Obrigado! Sua assinatura foi atualizada.</Alerta>}
      {retorno === 'pendente' && (
        <Alerta tipo="info" titulo="Pagamento em processamento">
          Assim que o Mercado Pago confirmar (PIX e cartão costumam levar poucos minutos; boleto até 3 dias úteis), o vencimento é atualizado aqui.
        </Alerta>
      )}
      {retorno === 'recusado' && <Alerta tipo="erro" titulo="Pagamento não aprovado">Tente novamente com outra forma de pagamento.</Alerta>}

      <Alerta tipo={s.tipo}>{s.texto}</Alerta>

      {/* Plano atual */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Plano</p>
            <p className="mt-1 font-medium text-foreground">{resumo.plano?.nome ?? (resumo.status === 'trial' ? 'Teste grátis' : '—')}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Ciclo</p>
            <p className="mt-1 font-medium text-foreground">{resumo.plano ? (resumo.ciclo === 'anual' ? 'Anual' : 'Mensal') : '—'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {resumo.status === 'trial' ? 'Fim do teste' : 'Próximo vencimento'}
            </p>
            <p className="mt-1 flex items-center gap-1.5 font-medium text-foreground">
              <CalendarClock className="size-4 text-muted-foreground" aria-hidden="true" />
              {data(resumo.status === 'trial' ? resumo.trial_ate : resumo.vigencia_ate)}
            </p>
          </div>
        </div>
      </section>

      {/* Pagamento */}
      {resumo.pode_pagar && (
        <section className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
          <h2 className="text-base font-semibold text-foreground">
            {resumo.status === 'trial' ? 'Escolha seu plano' : 'Pagamento'}
          </h2>

          {resumo.pode_escolher_plano && (
            <>
              <div className="inline-flex rounded-lg border border-border p-0.5" role="radiogroup" aria-label="Ciclo de cobrança">
                {(['mensal', 'anual'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={ciclo === c}
                    onClick={() => setCiclo(c)}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium ${ciclo === c ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {c === 'mensal' ? 'Mensal' : 'Anual'}
                  </button>
                ))}
              </div>

              {resumo.planos.length === 0 ? (
                <EstadoVazio titulo="Nenhum plano disponível" descricao="Fale com a OonSystems para assinar." />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Plano">
                  {resumo.planos.map((p) => {
                    const v = preco(p, ciclo)
                    const ativo = p.id === planoId
                    return (
                      <button
                        key={p.id}
                        type="button"
                        role="radio"
                        aria-checked={ativo}
                        disabled={!(v > 0)}
                        onClick={() => setPlanoId(p.id)}
                        className={`rounded-lg border p-4 text-left transition-colors disabled:opacity-50 ${ativo ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/50'}`}
                      >
                        <span className="block font-medium text-foreground">{p.nome}</span>
                        <span className="mt-1 block text-lg font-semibold text-foreground">
                          {v > 0 ? reais(v) : '—'}
                          <span className="text-sm font-normal text-muted-foreground">/{ciclo === 'anual' ? 'ano' : 'mês'}</span>
                        </span>
                        {p.descricao && <span className="mt-1 block text-sm text-muted-foreground">{p.descricao}</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {resumo.pagamento_online ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {planoCobrado && valor > 0
                  ? <>Total: <strong className="text-foreground">{reais(valor)}</strong> · PIX, cartão ou boleto pelo Mercado Pago</>
                  : 'Escolha um plano para continuar.'}
              </p>
              <Button onClick={pagar} loading={pagando} disabled={!planoCobrado || !(valor > 0)}>
                <CreditCard />
                {textoBotao}
                <ExternalLink className="opacity-70" />
              </Button>
            </div>
          ) : (
            <Alerta tipo="info">
              O pagamento online ainda não está disponível.{' '}
              <a href={CONTATO_ASSINATURA} className="font-medium underline underline-offset-4">Fale com a OonSystems</a> para pagar.
            </Alerta>
          )}
        </section>
      )}

      {!resumo.pode_pagar && (
        <a href={CONTATO_ASSINATURA} className="inline-flex text-sm font-medium text-primary hover:underline underline-offset-4">
          Falar com a OonSystems
        </a>
      )}

      {/* Histórico */}
      <section className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <h2 className="border-b border-border px-5 py-3 text-base font-semibold text-foreground">Pagamentos</h2>
        {resumo.pagamentos.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">Nenhum pagamento registrado ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-2 text-left font-medium">Pago em</th>
                <th className="px-5 py-2 text-left font-medium">Forma</th>
                <th className="px-5 py-2 text-right font-medium">Valor</th>
                <th className="hidden px-5 py-2 text-right font-medium sm:table-cell">Válido até</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {resumo.pagamentos.map((p) => (
                <tr key={p.id}>
                  <td className="px-5 py-2.5">{new Date(`${p.pago_em}T12:00:00`).toLocaleDateString('pt-BR')}</td>
                  <td className="px-5 py-2.5">{ROTULO_FORMA[p.forma] ?? p.forma}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{reais(p.valor)}</td>
                  <td className="hidden px-5 py-2.5 text-right sm:table-cell">{data(p.vencimento_novo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
