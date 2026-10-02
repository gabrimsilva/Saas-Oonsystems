/**
 * Plataforma > Planos: preços (mensal e anual), limites de estabelecimentos e
 * usuários e os módulos liberados por plano.
 */

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Check, Package, Pencil, Plus, Store, Trash2, Users } from 'lucide-react'
import { InputMoeda } from '@/components/ui/input-moeda'
import { moduloService, type Modulo } from '@/services/moduloService'
import { plataformaService, type DadosPlano, type Plano } from '@/services/plataformaService'
import { useDadosPlataforma } from './PlataformaLayout'
import { BotaoPrimario, BotaoSecundario, Campo, Carregando, classeInput, formatarReais, Modal } from './comum'
import { confirmar } from '@/components/ui/confirmar'
import { Layers } from 'lucide-react'
import { EstadoVazio } from '@/components/ui/feedback'

const PLANO_VAZIO: DadosPlano = {
  nome: '',
  descricao: '',
  preco_mensal: 0,
  preco_anual: 0,
  max_estabelecimentos: null,
  max_usuarios: null,
  ativo: true,
  ordem: 0,
  modulos: [],
}

function ModalPlano({
  plano,
  catalogo,
  onFechar,
  onSalvo,
}: {
  plano: Plano | null
  catalogo: Modulo[]
  onFechar: () => void
  onSalvo: () => void
}) {
  const [form, setForm] = useState<DadosPlano>(plano ? { ...plano } : { ...PLANO_VAZIO, modulos: catalogo.map((m) => m.codigo) })
  const [salvando, setSalvando] = useState(false)

  const limite = (valor: string) => (valor.trim() === '' ? null : Math.max(1, Math.floor(Number(valor) || 1)))
  const alternarModulo = (codigo: string) =>
    setForm({
      ...form,
      modulos: form.modulos.includes(codigo) ? form.modulos.filter((m) => m !== codigo) : [...form.modulos, codigo],
    })

  const salvar = async () => {
    if (!form.nome.trim()) {
      toast.error('Informe o nome do plano')
      return
    }
    setSalvando(true)
    try {
      await plataformaService.salvarPlano(form, plano?.id)
      toast.success(plano ? 'Plano atualizado' : 'Plano criado')
      onSalvo()
      onFechar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar o plano')
    } finally {
      setSalvando(false)
    }
  }

  const descontoAnual = form.preco_mensal > 0 && form.preco_anual > 0
    ? Math.round((1 - form.preco_anual / (form.preco_mensal * 12)) * 100)
    : null

  return (
    <Modal
      aberto
      onFechar={onFechar}
      titulo={plano ? 'Editar plano' : 'Novo plano'}
      descricao={plano ? 'A mudança de módulos vale para quem trocar para este plano (clientes atuais mantêm os módulos que têm).' : undefined}
      rodape={
        <>
          <BotaoSecundario onClick={onFechar}>Cancelar</BotaoSecundario>
          <BotaoPrimario onClick={salvar} carregando={salvando}>Salvar</BotaoPrimario>
        </>
      }
    >
      <div className="space-y-3">
        <Campo rotulo="Nome *">
          <input className={classeInput} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} maxLength={60} />
        </Campo>
        <Campo rotulo="Descrição">
          <input className={classeInput} value={form.descricao ?? ''} onChange={(e) => setForm({ ...form, descricao: e.target.value })} maxLength={300} />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Preço mensal">
            <InputMoeda value={form.preco_mensal} onChange={(v) => setForm({ ...form, preco_mensal: v })} />
          </Campo>
          <Campo rotulo="Preço anual" ajuda={descontoAnual !== null && descontoAnual > 0 ? `${descontoAnual}% de desconto sobre 12 meses` : undefined}>
            <InputMoeda value={form.preco_anual} onChange={(v) => setForm({ ...form, preco_anual: v })} />
          </Campo>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Máx. estabelecimentos" ajuda="Em branco = ilimitado">
            <input className={classeInput} type="number" min={1} value={form.max_estabelecimentos ?? ''}
              onChange={(e) => setForm({ ...form, max_estabelecimentos: limite(e.target.value) })} />
          </Campo>
          <Campo rotulo="Máx. usuários" ajuda="Em branco = ilimitado">
            <input className={classeInput} type="number" min={1} value={form.max_usuarios ?? ''}
              onChange={(e) => setForm({ ...form, max_usuarios: limite(e.target.value) })} />
          </Campo>
        </div>
        <fieldset>
          <legend className="text-sm font-medium text-foreground/80 mb-1">Módulos incluídos</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {catalogo.map((m) => (
              <label key={m.codigo} className="flex items-center gap-2 p-2 rounded-lg border border-border text-sm cursor-pointer hover:bg-accent">
                <input type="checkbox" checked={form.modulos.includes(m.codigo)} onChange={() => alternarModulo(m.codigo)} />
                {m.nome}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
          Disponível para novos clientes
        </label>
      </div>
    </Modal>
  )
}

export default function PlanosPage() {
  const { planos, clientes, carregando, recarregar } = useDadosPlataforma()
  const [catalogo, setCatalogo] = useState<Modulo[]>([])
  const [editando, setEditando] = useState<Plano | null | 'novo'>(null)

  useEffect(() => {
    moduloService.listarCatalogo().then(setCatalogo).catch(() => setCatalogo([]))
  }, [])

  const nomeModulo = (codigo: string) => catalogo.find((m) => m.codigo === codigo)?.nome ?? codigo
  const clientesDoPlano = (id: string) => clientes.filter((c) => c.plano_id === id)

  const excluir = async (plano: Plano) => {
    const qtd = clientesDoPlano(plano.id).length
    if (qtd > 0) {
      toast.error(`${qtd} cliente(s) usam este plano. Troque o plano deles ou desative o plano.`)
      return
    }
    if (!(await confirmar({ titulo: `Excluir o plano "${plano.nome}"?`, descricao: 'Esta ação não pode ser desfeita.', perigo: true }))) return
    try {
      await plataformaService.excluirPlano(plano.id)
      toast.success('Plano excluído')
      await recarregar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir o plano')
    }
  }

  if (carregando && planos.length === 0) return <Carregando />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Planos</h1>
          <p className="text-sm text-muted-foreground">Preços, limites e módulos de cada plano.</p>
        </div>
        <BotaoPrimario onClick={() => setEditando('novo')}><Plus className="h-4 w-4" /> Novo plano</BotaoPrimario>
      </div>

      {planos.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EstadoVazio icone={Layers} titulo="Nenhum plano cadastrado" descricao="Crie um plano para definir preço e módulos liberados." />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {planos.map((p) => {
            const usando = clientesDoPlano(p.id)
            return (
              <article key={p.id} className={`bg-card rounded-xl border shadow-sm p-5 flex flex-col ${p.ativo ? 'border-border' : 'border-dashed border-input opacity-75'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <Package className="h-5 w-5 text-muted-foreground/70" aria-hidden="true" />
                      {p.nome}
                    </h2>
                    {p.descricao && <p className="text-sm text-muted-foreground">{p.descricao}</p>}
                  </div>
                  {!p.ativo && <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">Inativo</span>}
                </div>

                <div className="mt-4 flex items-baseline gap-4">
                  <p><span className="text-2xl font-bold tabular-nums text-foreground">{formatarReais(p.preco_mensal)}</span><span className="text-sm text-muted-foreground">/mês</span></p>
                  <p className="text-sm text-muted-foreground tabular-nums">{formatarReais(p.preco_anual)}/ano</p>
                </div>

                <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Store className="h-4 w-4 text-muted-foreground/70" />{p.max_estabelecimentos ?? '∞'} loja(s)</span>
                  <span className="inline-flex items-center gap-1"><Users className="h-4 w-4 text-muted-foreground/70" />{p.max_usuarios ?? '∞'} usuário(s)</span>
                </div>

                <ul className="mt-3 space-y-1 text-sm text-foreground/80 flex-1">
                  {p.modulos.length === 0 && <li className="text-muted-foreground/70">Nenhum módulo</li>}
                  {p.modulos.map((m) => (
                    <li key={m} className="flex items-center gap-2"><Check className="h-4 w-4 text-success" />{nomeModulo(m)}</li>
                  ))}
                </ul>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{usando.length} cliente(s)</span>
                  <div className="flex gap-1">
                    <button onClick={() => setEditando(p)} className="p-2 rounded-lg hover:bg-accent text-foreground/80 cursor-pointer" title="Editar plano" aria-label={`Editar ${p.nome}`}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => excluir(p)} className="p-2 rounded-lg hover:bg-accent text-destructive cursor-pointer" title="Excluir plano" aria-label={`Excluir ${p.nome}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {editando && (
        <ModalPlano
          plano={editando === 'novo' ? null : editando}
          catalogo={catalogo}
          onFechar={() => setEditando(null)}
          onSalvo={recarregar}
        />
      )}
    </div>
  )
}
