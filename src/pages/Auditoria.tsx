/**
 * Página de Auditoria (Configurações > Auditoria).
 * Consulta paginada de logs_auditoria, escopada por estabelecimentos
 * autorizados via RLS. Acesso negado a Operador (Req 9.4, 9.5, 9.8).
 */

import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { ScrollText, ShieldAlert, ChevronLeft, ChevronRight } from 'lucide-react'
import { auditoriaService, usuarioService } from '@/services'
import { usePermissoes } from '@/hooks/usePermissoes'
import type { LogAuditoria } from '@/types/estabelecimento'
import { History } from 'lucide-react'
import { EstadoVazio, TabelaCarregando } from '@/components/ui/feedback'
import { useTabelaResponsiva } from '@/hooks/useTabelaResponsiva'

function formatarDataHora(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' })
  } catch {
    return iso
  }
}

export default function Auditoria() {
  const tabelaRef = useTabelaResponsiva()
  const { podeVerAuditoria } = usePermissoes()
  const [registros, setRegistros] = useState<LogAuditoria[]>([])
  const [pagina, setPagina] = useState(0)
  const [temMais, setTemMais] = useState(false)
  const [loading, setLoading] = useState(true)

  // Mapa user_id -> nome, para exibir quem executou a ação.
  // A RLS de usuarios_estabelecimento já limita aos usuários que o perfil pode ver.
  const [nomesUsuarios, setNomesUsuarios] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!podeVerAuditoria) return
    usuarioService
      .listar()
      .then((usuarios) => {
        const mapa: Record<string, string> = {}
        usuarios.forEach((u) => {
          if (u.user_id) mapa[u.user_id] = u.nome || u.email || ''
        })
        setNomesUsuarios(mapa)
      })
      .catch((e) => console.warn('Não foi possível carregar nomes de usuários:', e))
  }, [podeVerAuditoria])

  /**
   * Nome do autor da ação. Prioriza o cadastro de usuários; se o usuário não
   * estiver mais visível (removido ou fora do escopo), cai para o nome gravado
   * no metadata no momento da ação e, por último, para o id abreviado.
   */
  const nomeAutor = (r: LogAuditoria): string => {
    if (r.usuario_id && nomesUsuarios[r.usuario_id]) {
      return nomesUsuarios[r.usuario_id]
    }

    const meta = r.metadata as Record<string, unknown> | null
    const doMetadata = (meta?.usuario_nome ?? meta?.usuario_email) as string | undefined
    if (doMetadata) return doMetadata

    if (r.usuario_id) return `${r.usuario_id.slice(0, 8)}…`
    return 'Sistema'
  }

  const carregar = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const res = await auditoriaService.listar(p)
      setRegistros(res.registros)
      setTemMais(res.temMais)
      setPagina(res.pagina)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar auditoria')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (podeVerAuditoria) carregar(0) }, [podeVerAuditoria, carregar])

  if (!podeVerAuditoria) {
    return (
      <div className="p-6">
        <div className="max-w-md mx-auto bg-card rounded-xl border border-border shadow-xs p-8 text-center">
          <ShieldAlert className="h-12 w-12 text-muted-foreground/70 mx-auto mb-3" />
          <p className="text-muted-foreground">Seu perfil não tem permissão para visualizar a auditoria.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <ScrollText className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-semibold text-foreground">Auditoria</h1>
      </div>

      {loading ? (
        <TabelaCarregando colunas={4} />
      ) : (
        <div ref={tabelaRef} className="tabela-responsiva bg-card rounded-xl border border-border shadow-xs overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Data/Hora</th>
                <th className="text-left px-4 py-3">Usuário</th>
                <th className="text-left px-4 py-3">Ação</th>
                <th className="text-left px-4 py-3">Descrição</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id} className="border-t border-border transition-colors hover:bg-muted/40">
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatarDataHora(r.criado_em)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{nomeAutor(r)}</td>
                  <td className="px-4 py-3"><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{r.acao}</code></td>
                  <td className="px-4 py-3">{r.descricao}</td>
                </tr>
              ))}
              {registros.length === 0 && (
                <tr><td colSpan={4}><EstadoVazio icone={History} titulo="Nenhum registro de auditoria" descricao="As ações feitas no sistema aparecem aqui." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 mt-4">
        <button
          onClick={() => carregar(pagina - 1)}
          disabled={pagina === 0 || loading}
          className="flex items-center gap-1 px-3 py-2 rounded-lg border border-input disabled:opacity-50 hover:bg-accent"
        >
          <ChevronLeft className="h-4 w-4" /> Anterior
        </button>
        <span className="text-sm text-muted-foreground">Página {pagina + 1}</span>
        <button
          onClick={() => carregar(pagina + 1)}
          disabled={!temMais || loading}
          className="flex items-center gap-1 px-3 py-2 rounded-lg border border-input disabled:opacity-50 hover:bg-accent"
        >
          Próxima <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
