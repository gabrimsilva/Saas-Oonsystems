/**
 * Página de gestão de Estabelecimentos (Configurações > Estabelecimentos).
 * Restrita a Administrador_Geral (Req 1).
 */

import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Building2, Plus, Pencil, Power, Copy, ExternalLink } from 'lucide-react'
import { estabelecimentoService, gerarSlug } from '@/services/estabelecimentoService'
import { usePermissoes } from '@/hooks/usePermissoes'
import { useEstabelecimento } from '@/contexts/EstabelecimentoContext'
import { auditoriaService } from '@/services'
import type { Estabelecimento } from '@/types/estabelecimento'
import { COR_TEMA_PADRAO_ANTIGA, corPersonalizada } from '@/utils/cor'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Store } from 'lucide-react'
import { EstadoVazio, TabelaCarregando } from '@/components/ui/feedback'
import { avisoComDesfazer } from '@/components/ui/desfazer'
import { useTabelaResponsiva } from '@/hooks/useTabelaResponsiva'

/** Cores sóbrias sugeridas para a identidade da loja */
const CORES_TEMA: Array<{ nome: string; valor: string; amostra?: string }> = [
  { nome: 'Padrão do sistema', valor: COR_TEMA_PADRAO_ANTIGA, amostra: 'oklch(0.50 0.15 258)' },
  { nome: 'Azul-marinho', valor: '#1E3A8A' },
  { nome: 'Índigo', valor: '#4338CA' },
  { nome: 'Petróleo', valor: '#0F766E' },
  { nome: 'Esmeralda', valor: '#047857' },
  { nome: 'Grafite', valor: '#334155' },
  { nome: 'Vinho', valor: '#9F1239' },
  { nome: 'Âmbar', valor: '#B45309' },
]

type FormState = {
  id?: string
  nome: string
  slug: string
  descricao: string
  cor_tema: string
  ativo: boolean
}

const FORM_VAZIO: FormState = {
  nome: '',
  slug: '',
  descricao: '',
  cor_tema: COR_TEMA_PADRAO_ANTIGA,
  ativo: true,
}

export default function Estabelecimentos() {
  const tabelaRef = useTabelaResponsiva()
  const { podeGerenciarEstabelecimentos } = usePermissoes()
  const { recarregar } = useEstabelecimento()
  const [lista, setLista] = useState<Estabelecimento[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState | null>(null)
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      setLista(await estabelecimentoService.buscarTodos())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar estabelecimentos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  if (!podeGerenciarEstabelecimentos) {
    return (
      <div className="p-6">
        <div className="max-w-md mx-auto bg-card rounded-xl border border-border shadow-xs p-8 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground/70 mx-auto mb-3" />
          <p className="text-muted-foreground">Apenas o Administrador Geral pode gerenciar estabelecimentos.</p>
        </div>
      </div>
    )
  }

  const abrirNovo = () => setForm({ ...FORM_VAZIO })
  const abrirEdicao = (e: Estabelecimento) => setForm({
    id: e.id,
    nome: e.nome,
    slug: e.slug,
    descricao: e.descricao ?? '',
    cor_tema: e.cor_tema,
    ativo: e.ativo,
  })

  const salvar = async () => {
    if (!form) return
    setSalvando(true)
    try {
      if (form.id) {
        await estabelecimentoService.atualizar(form.id, {
          nome: form.nome,
          slug: form.slug || gerarSlug(form.nome),
          descricao: form.descricao,
          cor_tema: form.cor_tema,
          ativo: form.ativo,
        })
        await auditoriaService.registrar({
          acao: 'estabelecimento.atualizar',
          descricao: `Estabelecimento "${form.nome}" atualizado`,
          estabelecimento_id: form.id,
        })
        toast.success('Estabelecimento atualizado')
      } else {
        const novo = await estabelecimentoService.criar({
          nome: form.nome,
          slug: form.slug || gerarSlug(form.nome),
          descricao: form.descricao,
          cor_tema: form.cor_tema,
          ativo: form.ativo,
        })
        await auditoriaService.registrar({
          acao: 'estabelecimento.criar',
          descricao: `Estabelecimento "${novo.nome}" criado`,
          estabelecimento_id: novo.id,
        })
        toast.success('Estabelecimento criado')
      }
      setForm(null)
      await carregar()
      await recarregar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  const alternarAtivo = async (e: Estabelecimento, desfazendo = false) => {
    try {
      await estabelecimentoService.definirAtivo(e.id, !e.ativo)
      const mensagem = !e.ativo ? 'Estabelecimento ativado' : 'Estabelecimento desativado'
      if (desfazendo) toast.success(mensagem)
      else avisoComDesfazer(mensagem, () => alternarAtivo({ ...e, ativo: !e.ativo }, true))
      await carregar()
      await recarregar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar status')
    }
  }

  /** Monta o link público (cardápio do cliente) do estabelecimento pelo slug. */
  const linkCliente = (e: Estabelecimento) => `${window.location.origin}/${e.slug}`

  const copiarLink = async (e: Estabelecimento) => {
    const url = linkCliente(e)
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link do cliente copiado!')
    } catch {
      // Fallback para navegadores/contextos sem permissão de clipboard
      window.prompt('Copie o link do cliente:', url)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Building2 className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Estabelecimentos</h1>
        </div>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 inline-flex h-9 items-center justify-center gap-2 px-4 rounded-md bg-primary text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" /> Novo
        </button>
      </div>

      {loading ? (
        <TabelaCarregando colunas={6} linhas={3} />
      ) : (
        <div ref={tabelaRef} className="tabela-responsiva bg-card rounded-xl border border-border shadow-xs overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-left px-4 py-3">Slug</th>
                <th className="text-left px-4 py-3">Link do cliente</th>
                <th className="text-left px-4 py-3">Cor</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((e) => (
                <tr key={e.id} className="border-t border-border transition-colors hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{e.nome}</td>
                  <td className="px-4 py-3 text-muted-foreground">/{e.slug}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <code className="text-xs text-muted-foreground bg-muted/50 border border-border rounded px-2 py-1 max-w-[220px] truncate inline-block align-middle" title={linkCliente(e)}>
                        {linkCliente(e)}
                      </code>
                      <button onClick={() => copiarLink(e)} className="p-1.5 rounded hover:bg-accent" title="Copiar link do cliente">
                        <Copy className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <a href={linkCliente(e)} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-accent" title="Abrir link do cliente">
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2 text-sm">
                      <span className="size-3.5 rounded-full ring-1 ring-border" style={{ backgroundColor: corPersonalizada(e.cor_tema) ?? 'var(--primary)' }} />
                      {corPersonalizada(e.cor_tema) ? (CORES_TEMA.find((c) => c.valor.toLowerCase() === e.cor_tema.toLowerCase())?.nome ?? e.cor_tema) : 'Padrão do sistema'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${e.ativo ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                      {e.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => abrirEdicao(e)} className="p-2 rounded hover:bg-accent" title="Editar">
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button onClick={() => alternarAtivo(e)} className="p-2 rounded hover:bg-accent" title={e.ativo ? 'Desativar' : 'Ativar'}>
                        <Power className={`h-4 w-4 ${e.ativo ? 'text-success' : 'text-muted-foreground/70'}`} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {lista.length === 0 && (
                <tr><td colSpan={6}><EstadoVazio icone={Store} titulo="Nenhum estabelecimento cadastrado" descricao="Use o botão Novo estabelecimento para cadastrar o primeiro." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(aberto) => { if (!aberto) setForm(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{form?.id ? 'Editar' : 'Novo'} estabelecimento</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="estab-nome">Nome *</Label>
                <Input
                  id="estab-nome"
                  value={form.nome}
                  maxLength={100}
                  onChange={(ev) => setForm({ ...form, nome: ev.target.value, slug: form.id ? form.slug : gerarSlug(ev.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="estab-slug">Slug (rota pública)</Label>
                <Input
                  id="estab-slug"
                  value={form.slug}
                  maxLength={60}
                  onChange={(ev) => setForm({ ...form, slug: ev.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="estab-descricao">Descrição</Label>
                <Textarea
                  id="estab-descricao"
                  value={form.descricao}
                  maxLength={500}
                  rows={2}
                  onChange={(ev) => setForm({ ...form, descricao: ev.target.value })}
                />
              </div>
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium text-foreground">Cor do tema *</legend>
                <p className="mb-2 text-xs text-muted-foreground">Aparece em botões, menu ativo e destaques desta loja.</p>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cor do tema">
                  {CORES_TEMA.map((c) => {
                    const selecionada = form.cor_tema.toLowerCase() === c.valor.toLowerCase()
                    return (
                      <button
                        key={c.valor}
                        type="button"
                        role="radio"
                        aria-checked={selecionada}
                        onClick={() => setForm({ ...form, cor_tema: c.valor })}
                        className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium ${
                          selecionada ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
                        }`}
                      >
                        <span className="size-3.5 rounded-full" style={{ backgroundColor: c.amostra ?? c.valor }} aria-hidden="true" />
                        {c.nome}
                      </button>
                    )
                  })}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="color"
                    value={corPersonalizada(form.cor_tema) ?? '#2459C4'}
                    onChange={(ev) => setForm({ ...form, cor_tema: ev.target.value })}
                    className="h-9 w-12 cursor-pointer rounded-md border border-input bg-card p-1"
                    aria-label="Escolher outra cor"
                  />
                  <span className="text-xs text-muted-foreground">Ou escolha outra cor</span>
                </div>
              </fieldset>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v === true })} />
                Ativo
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            <Button onClick={salvar} loading={salvando}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
