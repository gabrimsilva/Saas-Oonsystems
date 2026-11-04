/**
 * Plataforma > Planos > Serviços: cria, edita e exclui os serviços que aparecem
 * como opção nos planos e nos clientes.
 */

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { liberaFuncao, mesmoNomeDeServico, moduloService, type Modulo } from '@/services/moduloService'
import type { Plano } from '@/services/plataformaService'
import { BotaoPrimario, BotaoSecundario, Campo, classeInput, Modal } from './comum'

export function ModalServicos({
  catalogo,
  planos,
  onFechar,
  onAlterado,
}: {
  catalogo: Modulo[]
  planos: Plano[]
  onFechar: () => void
  onAlterado: () => Promise<void>
}) {
  const [editando, setEditando] = useState<Modulo | null>(null)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [excluindo, setExcluindo] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const limpar = () => {
    setEditando(null)
    setNome('')
    setDescricao('')
  }

  const editar = (m: Modulo) => {
    setExcluindo(null)
    setEditando(m)
    setNome(m.nome)
    setDescricao(m.descricao ?? '')
  }

  const executar = async (acao: () => Promise<void>, sucesso: string): Promise<boolean> => {
    setSalvando(true)
    try {
      await acao()
      await onAlterado()
      toast.success(sucesso)
      return true
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar o serviço')
      return false
    } finally {
      setSalvando(false)
    }
  }

  const salvar = async () => {
    if (!nome.trim()) {
      toast.error('Informe o nome do serviço')
      return
    }
    if (catalogo.some((m) => m.codigo !== editando?.codigo && mesmoNomeDeServico(m.nome, nome))) {
      toast.error('Já existe um serviço com esse nome')
      return
    }
    const ok = await executar(
      () => editando
        ? moduloService.atualizarServico(editando.codigo, nome, descricao)
        : moduloService.criarServico(nome, descricao, catalogo),
      editando ? 'Serviço atualizado' : 'Serviço criado',
    )
    if (ok) limpar()
  }

  const excluir = async (m: Modulo) => {
    const ok = await executar(() => moduloService.excluirServico(m.codigo), 'Serviço excluído')
    if (ok) {
      setExcluindo(null)
      if (editando?.codigo === m.codigo) limpar()
    }
  }

  return (
    <Modal
      aberto
      onFechar={onFechar}
      titulo="Serviços"
      descricao="Os serviços daqui viram as opções de marcar em cada plano."
      rodape={<BotaoSecundario onClick={onFechar}>Fechar</BotaoSecundario>}
    >
      <div className="space-y-4">
        <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs text-muted-foreground space-y-1">
          <p><strong className="text-foreground">Libera função:</strong> mostra ou bloqueia telas no sistema do cliente. Pode ser renomeado, mas não excluído.</p>
          <p><strong className="text-foreground">Informativo:</strong> aparece no plano e no cliente, mas não libera nem bloqueia nenhuma tela.</p>
        </div>

        <ul className="space-y-2">
          {catalogo.map((m) => {
            const qtdPlanos = planos.filter((p) => p.modulos.includes(m.codigo)).length
            return (
              <li key={m.codigo} className="p-3 rounded-lg border border-border">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-sm text-foreground">{m.nome}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                        {liberaFuncao(m) ? 'Libera função' : 'Informativo'}
                      </span>
                    </div>
                    {m.descricao && <p className="text-xs text-muted-foreground break-words">{m.descricao}</p>}
                    <p className="text-xs text-muted-foreground/70">{qtdPlanos} plano(s)</p>
                  </div>
                  <button type="button" onClick={() => editar(m)} className="p-2 rounded-lg hover:bg-accent text-foreground/80 cursor-pointer" title="Editar serviço" aria-label={`Editar ${m.nome}`}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  {!liberaFuncao(m) && (
                    <button
                      type="button"
                      onClick={() => setExcluindo(m.codigo)}
                      disabled={qtdPlanos > 0}
                      className="p-2 rounded-lg hover:bg-accent text-destructive cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      title={qtdPlanos > 0 ? 'Tire este serviço dos planos para poder excluir' : 'Excluir serviço'}
                      aria-label={`Excluir ${m.nome}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {excluindo === m.codigo && (
                  <div className="mt-2 pt-2 border-t border-border flex flex-wrap items-center gap-2">
                    <p className="text-xs text-destructive flex-1">Excluir? O serviço também sai dos clientes que o têm.</p>
                    <BotaoSecundario onClick={() => setExcluindo(null)} disabled={salvando}>Cancelar</BotaoSecundario>
                    <BotaoPrimario perigo onClick={() => excluir(m)} carregando={salvando}>Excluir</BotaoPrimario>
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        <section className="space-y-3 border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-foreground">{editando ? `Editar "${editando.nome}"` : 'Novo serviço'}</h3>
          <Campo rotulo="Nome *">
            <input className={classeInput} value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} />
          </Campo>
          <Campo rotulo="Descrição">
            <input className={classeInput} value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={300} />
          </Campo>
          <div className="flex justify-end gap-2">
            {editando && <BotaoSecundario onClick={limpar} disabled={salvando}>Cancelar edição</BotaoSecundario>}
            <BotaoPrimario onClick={salvar} carregando={salvando}>
              {editando ? 'Salvar serviço' : <><Plus className="h-4 w-4" /> Adicionar serviço</>}
            </BotaoPrimario>
          </div>
        </section>
      </div>
    </Modal>
  )
}
