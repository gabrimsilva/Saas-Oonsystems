/**
 * Página de gestão de Usuários (Configurações > Usuários).
 * Admin Geral gerencia todos; Admin de Estabelecimento gerencia o próprio prédio
 * e não pode conceder o perfil Administrador Geral (Req 2).
 */

import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Users, Plus, Power, ShieldAlert, Pencil, Trash2, KeyRound } from 'lucide-react'
import { usuarioService, estabelecimentoService, auditoriaService } from '@/services'
import { usePermissoes } from '@/hooks/usePermissoes'
import type { Estabelecimento, PerfilUsuario, UsuarioEstabelecimento } from '@/types/estabelecimento'
import { confirmar } from '@/components/ui/confirmar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { campoBase, textoErro } from '@/components/ui/estilos'
import { cn } from '@/lib/utils'
import { EstadoVazio, TabelaCarregando } from '@/components/ui/feedback'
import { avisoComDesfazer } from '@/components/ui/desfazer'
import { useTabelaResponsiva } from '@/hooks/useTabelaResponsiva'

const ROTULO_PERFIL: Record<PerfilUsuario, string> = {
  administrador_geral: 'Administrador Geral',
  administrador_estabelecimento: 'Administrador do Estabelecimento',
  operador: 'Operador',
}

type FormState = {
  nome: string
  email: string
  senha: string
  perfil: PerfilUsuario
  estabelecimento_id: string | null
  ativo: boolean
}

const FORM_VAZIO: FormState = {
  nome: '',
  email: '',
  senha: '',
  perfil: 'operador',
  estabelecimento_id: null,
  ativo: true,
}

export default function Usuarios() {
  const tabelaRef = useTabelaResponsiva()
  const { podeGerenciarUsuarios, perfil, estabelecimentoId } = usePermissoes()
  const [lista, setLista] = useState<UsuarioEstabelecimento[]>([])
  const [estabs, setEstabs] = useState<Estabelecimento[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  
  // Estado para modal de reset de senha
  const [resetSenhaUsuario, setResetSenhaUsuario] = useState<UsuarioEstabelecimento | null>(null)
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmaSenha, setConfirmaSenha] = useState('')
  const [resetando, setResetando] = useState(false)

  const ehAdminGeral = perfil === 'administrador_geral'

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [us, es] = await Promise.all([
        usuarioService.listar(),
        estabelecimentoService.buscarAtivos(),
      ])
      setLista(us)
      setEstabs(es)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  if (!podeGerenciarUsuarios) {
    return (
      <div className="p-6">
        <div className="max-w-md mx-auto bg-card rounded-xl border border-border shadow-xs p-8 text-center">
          <ShieldAlert className="h-12 w-12 text-muted-foreground/70 mx-auto mb-3" />
          <p className="text-muted-foreground">Seu perfil não tem permissão para gerenciar usuários.</p>
        </div>
      </div>
    )
  }

  const abrirNovo = () => {
    setEditId(null)
    setForm({
      ...FORM_VAZIO,
      // Admin de estabelecimento já vincula ao próprio prédio
      estabelecimento_id: ehAdminGeral ? null : estabelecimentoId,
    })
  }

  const abrirEdicao = (u: UsuarioEstabelecimento) => {
    setEditId(u.id)
    setForm({
      nome: u.nome,
      email: u.email,
      senha: '',
      perfil: u.perfil,
      estabelecimento_id: u.estabelecimento_id,
      ativo: u.ativo,
    })
  }

  const salvar = async () => {
    if (!form) return
    // Admin de estabelecimento não pode criar/definir admin geral (Req 2.8)
    if (!ehAdminGeral && form.perfil === 'administrador_geral') {
      toast.error('Você não pode definir um Administrador Geral.')
      return
    }
    setSalvando(true)
    try {
      if (editId) {
        // Edição: atualiza perfil/estabelecimento/ativo/nome (sem alterar email/senha aqui)
        await usuarioService.atualizar(editId, {
          nome: form.nome,
          perfil: form.perfil,
          estabelecimento_id: form.perfil === 'administrador_geral'
            ? null
            : (ehAdminGeral ? form.estabelecimento_id : estabelecimentoId),
          ativo: form.ativo,
        })
        await auditoriaService.registrar({
          acao: 'usuario.atualizar',
          descricao: `Usuário "${form.nome}" (${ROTULO_PERFIL[form.perfil]}) atualizado`,
          estabelecimento_id: form.estabelecimento_id,
        })
        toast.success('Usuário atualizado')
      } else {
        const novo = await usuarioService.criar({
          nome: form.nome,
          email: form.email,
          senha: form.senha,
          perfil: form.perfil,
          estabelecimento_id: form.perfil === 'administrador_geral'
            ? null
            : (ehAdminGeral ? form.estabelecimento_id : estabelecimentoId),
          ativo: form.ativo,
        })
        await auditoriaService.registrar({
          acao: 'usuario.criar',
          descricao: `Usuário "${form.nome}" (${ROTULO_PERFIL[form.perfil]}) criado`,
          estabelecimento_id: novo.estabelecimento_id,
        })
        toast.success('Usuário criado')
      }
      setForm(null)
      setEditId(null)
      await carregar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar usuário')
    } finally {
      setSalvando(false)
    }
  }

  const alternarAtivo = async (u: UsuarioEstabelecimento, desfazendo = false) => {
    try {
      await usuarioService.definirAtivo(u.id, !u.ativo)
      const mensagem = !u.ativo ? 'Usuário ativado' : 'Usuário desativado'
      if (desfazendo) toast.success(mensagem)
      else avisoComDesfazer(mensagem, () => alternarAtivo({ ...u, ativo: !u.ativo }, true))
      await carregar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar status')
    }
  }

  const excluirUsuario = async (u: UsuarioEstabelecimento) => {
    const confirmacao = await confirmar({
      titulo: `Excluir o usuário "${u.nome}"?`,
      descricao:
        'Esta ação é irreversível: todos os dados deste usuário serão removidos. Para apenas impedir o acesso, use Desativar.',
      confirmar: 'Excluir permanentemente',
      perigo: true,
    })
    
    if (!confirmacao) return
    
    try {
      await usuarioService.excluir(u.id)
      await auditoriaService.registrar({
        acao: 'usuario.excluir',
        descricao: `Usuário "${u.nome}" (${u.email}) excluído permanentemente`,
        estabelecimento_id: u.estabelecimento_id,
      })
      toast.success('Usuário excluído permanentemente')
      await carregar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir usuário')
    }
  }

  const abrirResetSenha = (u: UsuarioEstabelecimento) => {
    setResetSenhaUsuario(u)
    setNovaSenha('')
    setConfirmaSenha('')
  }

  const fecharResetSenha = () => {
    setResetSenhaUsuario(null)
    setNovaSenha('')
    setConfirmaSenha('')
  }

  const resetarSenha = async () => {
    if (!resetSenhaUsuario) return

    // Validações
    if (!novaSenha || novaSenha.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres')
      return
    }
    if (novaSenha !== confirmaSenha) {
      toast.error('As senhas não coincidem')
      return
    }

    setResetando(true)
    try {
      await usuarioService.resetarSenha(resetSenhaUsuario.id, novaSenha)
      await auditoriaService.registrar({
        acao: 'usuario.reset_senha',
        descricao: `Senha do usuário "${resetSenhaUsuario.nome}" (${resetSenhaUsuario.email}) foi resetada`,
        estabelecimento_id: resetSenhaUsuario.estabelecimento_id,
      })
      toast.success('Senha resetada com sucesso')
      fecharResetSenha()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao resetar senha')
    } finally {
      setResetando(false)
    }
  }

  const nomeEstab = (id: string | null) => estabs.find((e) => e.id === id)?.nome ?? (id ? '—' : 'Todos')

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Usuários</h1>
        </div>
        <button onClick={abrirNovo} className="flex items-center gap-2 inline-flex h-9 items-center justify-center gap-2 px-4 rounded-md bg-primary text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary-hover">
          <Plus className="h-4 w-4" /> Novo
        </button>
      </div>

      {loading ? (
        <TabelaCarregando colunas={6} linhas={4} />
      ) : (
        <div ref={tabelaRef} className="tabela-responsiva bg-card rounded-xl border border-border shadow-xs overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Perfil</th>
                <th className="text-left px-4 py-3">Estabelecimento</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((u) => (
                <tr key={u.id} className="border-t border-border transition-colors hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{u.nome}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">{ROTULO_PERFIL[u.perfil]}</td>
                  <td className="px-4 py-3">{nomeEstab(u.estabelecimento_id)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${u.ativo ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => abrirEdicao(u)} className="p-2 rounded hover:bg-accent" title="Editar usuário">
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </button>
                      {(perfil === 'administrador_geral' || perfil === 'administrador_estabelecimento') && (
                        <button onClick={() => abrirResetSenha(u)} className="p-2 rounded hover:bg-primary/5" title="Resetar senha">
                          <KeyRound className="h-4 w-4 text-primary" />
                        </button>
                      )}
                      <button onClick={() => alternarAtivo(u)} className="p-2 rounded hover:bg-accent" title={u.ativo ? 'Desativar usuário' : 'Ativar usuário'}>
                        <Power className={`h-4 w-4 ${u.ativo ? 'text-success' : 'text-muted-foreground/70'}`} />
                      </button>
                      <button onClick={() => excluirUsuario(u)} className="p-2 rounded hover:bg-destructive/5" title="Excluir permanentemente (irreversível)">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {lista.length === 0 && (
                <tr><td colSpan={6}><EstadoVazio icone={Users} titulo="Nenhum usuário cadastrado" descricao="Use o botão Novo usuário para dar acesso à sua equipe." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(aberto) => { if (!aberto) { setForm(null); setEditId(null) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar usuário' : 'Novo usuário'}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="usuario-nome">Nome *</Label>
                <Input id="usuario-nome" value={form.nome} maxLength={120}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              {!editId && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="usuario-email">E-mail *</Label>
                    <Input id="usuario-email" type="email" value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="usuario-senha">Senha *</Label>
                    <Input id="usuario-senha" type="password" value={form.senha}
                      onChange={(e) => setForm({ ...form, senha: e.target.value })} />
                  </div>
                </>
              )}
              {editId && (
                <div className="space-y-1.5">
                  <Label htmlFor="usuario-email-fixo">E-mail</Label>
                  <Input id="usuario-email-fixo" disabled value={form.email} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="usuario-perfil">Perfil *</Label>
                <select id="usuario-perfil" className={cn(campoBase, 'h-9 px-3')} value={form.perfil}
                  onChange={(e) => setForm({ ...form, perfil: e.target.value as PerfilUsuario })}>
                  {ehAdminGeral && <option value="administrador_geral">Administrador Geral</option>}
                  <option value="administrador_estabelecimento">Administrador do Estabelecimento</option>
                  <option value="operador">Operador</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="usuario-estab">Estabelecimento *</Label>
                {form.perfil === 'administrador_geral' ? (
                  <Input id="usuario-estab" disabled value="Todos os estabelecimentos" />
                ) : ehAdminGeral ? (
                  <select id="usuario-estab" className={cn(campoBase, 'h-9 px-3')} value={form.estabelecimento_id ?? ''}
                    onChange={(e) => setForm({ ...form, estabelecimento_id: e.target.value || null })}>
                    <option value="">Selecione…</option>
                    {estabs.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                ) : (
                  <Input id="usuario-estab" disabled value={nomeEstab(estabelecimentoId)} />
                )}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v === true })} /> Ativo
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setForm(null); setEditId(null) }}>Cancelar</Button>
            <Button onClick={salvar} loading={salvando}>{editId ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetSenhaUsuario} onOpenChange={(aberto) => { if (!aberto) fecharResetSenha() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
            {resetSenhaUsuario && (
              <DialogDescription>
                Usuário: <strong className="text-foreground">{resetSenhaUsuario.nome}</strong> ({resetSenhaUsuario.email})
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nova-senha">Nova senha *</Label>
              <Input
                id="nova-senha"
                type="password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                aria-invalid={!!novaSenha && novaSenha.length < 6}
              />
              {novaSenha && novaSenha.length < 6 && (
                <p className={textoErro}>A senha deve ter no mínimo 6 caracteres</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirma-senha">Confirmar senha *</Label>
              <Input
                id="confirma-senha"
                type="password"
                value={confirmaSenha}
                onChange={(e) => setConfirmaSenha(e.target.value)}
                placeholder="Digite a senha novamente"
                aria-invalid={!!confirmaSenha && novaSenha !== confirmaSenha}
              />
              {confirmaSenha && novaSenha !== confirmaSenha && (
                <p className={textoErro}>As senhas não coincidem</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={fecharResetSenha}>Cancelar</Button>
            <Button
              onClick={resetarSenha}
              loading={resetando}
              disabled={!novaSenha || novaSenha.length < 6 || novaSenha !== confirmaSenha}
            >
              Redefinir senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
