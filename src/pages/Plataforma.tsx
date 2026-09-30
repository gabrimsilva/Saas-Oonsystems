/**
 * Administração da plataforma OonSystems: clientes (tenants) do SaaS.
 * Restrita a usuários em plataforma_admins.
 */

import { useEffect, useState, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Briefcase, Plus, Loader2, LogOut, PauseCircle, PlayCircle } from 'lucide-react'
import { authService } from '@/services'
import {
  plataformaService,
  formatarDocumento,
  type ClientePlataforma,
  type NovoCliente,
  type StatusCliente,
} from '@/services/plataformaService'

const ROTULO_STATUS: Record<StatusCliente, { texto: string; classe: string }> = {
  trial: { texto: 'Teste', classe: 'bg-blue-100 text-blue-700' },
  ativo: { texto: 'Ativo', classe: 'bg-green-100 text-green-700' },
  suspenso: { texto: 'Suspenso', classe: 'bg-amber-100 text-amber-700' },
  cancelado: { texto: 'Cancelado', classe: 'bg-gray-100 text-gray-500' },
}

const FORM_VAZIO: NovoCliente = {
  documento: '',
  razao_social: '',
  nome_fantasia: '',
  estabelecimento_nome: 'Matriz',
  admin_nome: '',
  admin_email: '',
  admin_senha: '',
  status: 'trial',
}

export default function Plataforma() {
  const [autorizado, setAutorizado] = useState<boolean | null>(null)
  const [lista, setLista] = useState<ClientePlataforma[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<NovoCliente | null>(null)
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      setLista(await plataformaService.listarClientes())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar clientes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    plataformaService.ehAdminPlataforma().then((ok) => {
      setAutorizado(ok)
      if (ok) carregar()
    })
  }, [carregar])

  if (autorizado === null) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
  }
  if (!autorizado) {
    return <Navigate to="/sistema" replace />
  }

  const sair = async () => {
    await authService.logout()
    window.location.href = '/login'
  }

  const salvar = async () => {
    if (!form) return
    setSalvando(true)
    try {
      await plataformaService.criarCliente(form)
      toast.success('Cliente cadastrado')
      setForm(null)
      await carregar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao cadastrar cliente')
    } finally {
      setSalvando(false)
    }
  }

  const alternarSuspensao = async (c: ClientePlataforma) => {
    const novoStatus: StatusCliente = c.status === 'suspenso' ? 'ativo' : 'suspenso'
    const acao = novoStatus === 'suspenso' ? 'Suspender' : 'Reativar'
    if (!window.confirm(`${acao} o cliente "${c.nome_fantasia || c.razao_social}"?`)) return
    try {
      await plataformaService.definirStatus(c.id, novoStatus)
      toast.success(novoStatus === 'suspenso' ? 'Cliente suspenso' : 'Cliente reativado')
      await carregar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao alterar status')
    }
  }

  const campo = (rotulo: string, chave: keyof NovoCliente, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{rotulo}</label>
      <input
        className="w-full border border-gray-300 rounded-lg px-3 py-2"
        value={(form?.[chave] as string) ?? ''}
        onChange={(ev) => form && setForm({ ...form, [chave]: ev.target.value })}
        {...props}
      />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Briefcase className="h-6 w-6 text-gray-900" />
            <span className="font-bold text-gray-900">OonSystems · Plataforma</span>
          </div>
          <button onClick={sair} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </header>

      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <button
            onClick={() => setForm({ ...FORM_VAZIO })}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Novo cliente
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3">Cliente</th>
                  <th className="text-left px-4 py-3">CPF/CNPJ</th>
                  <th className="text-left px-4 py-3">Slug</th>
                  <th className="text-right px-4 py-3">Estab.</th>
                  <th className="text-right px-4 py-3">Usuários</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Desde</th>
                  <th className="text-right px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((c) => (
                  <tr key={c.id} className="border-t border-gray-100">
                    <td className="px-4 py-3">
                      <div className="font-medium">{c.nome_fantasia || c.razao_social}</div>
                      {c.nome_fantasia && <div className="text-xs text-gray-500">{c.razao_social}</div>}
                      {c.email && <div className="text-xs text-gray-500">{c.email}</div>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {formatarDocumento(c.documento)} <span className="text-gray-400">({c.tipo_pessoa})</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">/{c.slug}</td>
                    <td className="px-4 py-3 text-right">{c.qtd_estabelecimentos}</td>
                    <td className="px-4 py-3 text-right">{c.qtd_usuarios}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${ROTULO_STATUS[c.status].classe}`}>
                        {ROTULO_STATUS[c.status].texto}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{new Date(c.criado_em).toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3 text-right">
                      {c.status !== 'cancelado' && (
                        <button
                          onClick={() => alternarSuspensao(c)}
                          className="p-2 rounded hover:bg-gray-100"
                          title={c.status === 'suspenso' ? 'Reativar' : 'Suspender'}
                        >
                          {c.status === 'suspenso'
                            ? <PlayCircle className="h-4 w-4 text-green-600" />
                            : <PauseCircle className="h-4 w-4 text-amber-600" />}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {lista.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Nenhum cliente cadastrado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-white rounded-lg shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">Novo cliente</h2>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase text-gray-500">Cliente</p>
              {campo('CPF ou CNPJ *', 'documento', { placeholder: '000.000.000-00 ou 00.000.000/0000-00', maxLength: 18 })}
              {campo('Razão social / nome completo *', 'razao_social', { maxLength: 150 })}
              {campo('Nome fantasia', 'nome_fantasia', { maxLength: 150 })}
              {campo('Primeiro estabelecimento', 'estabelecimento_nome', { maxLength: 100 })}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Situação inicial</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={form.status}
                  onChange={(ev) => setForm({ ...form, status: ev.target.value as 'trial' | 'ativo' })}
                >
                  <option value="trial">Teste</option>
                  <option value="ativo">Ativo</option>
                </select>
              </div>

              <p className="text-xs font-semibold uppercase text-gray-500 pt-2">Administrador do cliente</p>
              {campo('Nome *', 'admin_nome', { maxLength: 120 })}
              {campo('Email *', 'admin_email', { type: 'email', maxLength: 255 })}
              {campo('Senha inicial *', 'admin_senha', { type: 'password', minLength: 8, autoComplete: 'new-password' })}
              <p className="text-xs text-gray-500">Mínimo de 8 caracteres. Repasse ao cliente por um canal seguro.</p>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setForm(null)} className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">Cancelar</button>
              <button onClick={salvar} disabled={salvando} className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:opacity-90 disabled:opacity-60 flex items-center gap-2">
                {salvando && <Loader2 className="h-4 w-4 animate-spin" />} Cadastrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
