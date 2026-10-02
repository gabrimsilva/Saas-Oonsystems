/**
 * Plataforma > Auditoria: histórico de tudo o que mudou nos clientes
 * (status, plano, prazos, dados, módulos, usuários, exclusões).
 */

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { RefreshCw } from 'lucide-react'
import { nomeDoCliente, plataformaService, type RegistroAuditoria } from '@/services/plataformaService'
import { useDadosPlataforma } from './PlataformaLayout'
import DetalhesAuditoria from './DetalhesAuditoria'
import { BotaoSecundario, Carregando, deInputData, formatarDataHora, ROTULO_ACAO } from './comum'
import { History } from 'lucide-react'
import { EstadoVazio } from '@/components/ui/feedback'
import { useTabelaResponsiva } from '@/hooks/useTabelaResponsiva'

export default function AuditoriaPage() {
  const tabelaRef = useTabelaResponsiva()
  const { clientes, planos } = useDadosPlataforma()
  const [registros, setRegistros] = useState<RegistroAuditoria[] | null>(null)
  const [tenantId, setTenantId] = useState('')
  const [acao, setAcao] = useState('')
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')

  const carregar = useCallback(async () => {
    setRegistros(null)
    try {
      const inicio = de ? new Date(`${de}T00:00:00`).toISOString() : undefined
      setRegistros(await plataformaService.listarAuditoria({
        tenantId: tenantId || undefined,
        acao: acao || undefined,
        de: inicio,
        ate: deInputData(ate) ?? undefined,
      }))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar o histórico')
      setRegistros([])
    }
  }, [tenantId, acao, de, ate])

  useEffect(() => {
    carregar()
  }, [carregar])

  const classeFiltro = 'text-sm border border-border rounded-lg px-3 py-2 bg-card'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Auditoria</h1>
        <p className="text-sm text-muted-foreground">
          Histórico das alterações nos clientes, com quem fez e o que mudou. Os registros continuam depois que um cliente é excluído.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-muted-foreground">
          Cliente
          <select className={`${classeFiltro} block mt-1 min-w-[200px]`} value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
            <option value="">Todos</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{nomeDoCliente(c)}</option>)}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          Ação
          <select className={`${classeFiltro} block mt-1`} value={acao} onChange={(e) => setAcao(e.target.value)}>
            <option value="">Todas</option>
            {Object.entries(ROTULO_ACAO).map(([codigo, rotulo]) => <option key={codigo} value={codigo}>{rotulo}</option>)}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          De
          <input type="date" className={`${classeFiltro} block mt-1`} value={de} onChange={(e) => setDe(e.target.value)} />
        </label>
        <label className="text-xs text-muted-foreground">
          Até
          <input type="date" className={`${classeFiltro} block mt-1`} value={ate} onChange={(e) => setAte(e.target.value)} />
        </label>
        <BotaoSecundario onClick={carregar}><RefreshCw className="h-4 w-4" /> Atualizar</BotaoSecundario>
      </div>

      <section className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {!registros ? (
          <Carregando />
        ) : registros.length === 0 ? (
          <EstadoVazio icone={History} titulo="Nenhum registro" descricao="Nenhuma ação encontrada com esses filtros." />
        ) : (
          <div ref={tabelaRef} className="tabela-responsiva overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">Quando</th>
                  <th className="text-left font-semibold px-4 py-3">Cliente</th>
                  <th className="text-left font-semibold px-4 py-3">Ação</th>
                  <th className="text-left font-semibold px-4 py-3">O que mudou</th>
                  <th className="text-left font-semibold px-4 py-3">Por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {registros.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatarDataHora(r.criado_em)}</td>
                    <td className="px-4 py-3 text-foreground">{r.tenant_nome ?? '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-foreground/80 border border-border">
                        {ROTULO_ACAO[r.acao] ?? r.acao}
                      </span>
                    </td>
                    <td className="px-4 py-3 min-w-[260px]"><DetalhesAuditoria registro={r} planos={planos} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{r.autor_email ?? 'Sistema'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {registros.length >= 300 && (
              <p className="px-4 py-3 text-xs text-muted-foreground border-t border-border">
                Mostrando os 300 registros mais recentes. Use os filtros para refinar.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
