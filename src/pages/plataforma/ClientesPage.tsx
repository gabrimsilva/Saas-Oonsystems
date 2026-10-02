/**
 * Plataforma > Clientes: indicadores, busca e a lista de clientes com as ações
 * de gestão (editar, plano, prazos, bloquear, inativar, usuários, módulos,
 * histórico e excluir).
 */

import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Ban,
  Blocks,
  Building2,
  CalendarClock,
  FileText,
  Hourglass,
  Package,
  Pencil,
  Plus,
  Power,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Trash2,
  Users,
} from 'lucide-react'
import {
  diasAte,
  formatarDocumento,
  nomeDoCliente,
  testeExpirado,
  type ClientePlataforma,
} from '@/services/plataformaService'
import { Button } from '@/components/ui/button'
import { useDadosPlataforma } from './PlataformaLayout'
import { CartaoIndicador, Carregando, StatusCliente, tempoDesde, Vencimento, formatarDataHora } from './comum'
import {
  ModalAtivacao,
  ModalBloqueio,
  ModalDetalhes,
  ModalEditarCliente,
  ModalExcluir,
  ModalModulos,
  ModalNovoCliente,
  ModalPlanoCliente,
  ModalPrazos,
  ModalUsuarios,
} from './ModaisCliente'
import { EstadoVazio } from '@/components/ui/feedback'
import { useTabelaResponsiva } from '@/hooks/useTabelaResponsiva'

type FiltroStatus = 'todos' | 'ativo' | 'trial' | 'expirado' | 'suspenso' | 'cancelado'

type Acao = 'editar' | 'plano' | 'prazos' | 'bloqueio' | 'ativacao' | 'usuarios' | 'modulos' | 'detalhes' | 'excluir'

const FILTROS: Array<{ id: FiltroStatus; rotulo: string }> = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'ativo', rotulo: 'Ativos' },
  { id: 'trial', rotulo: 'Em teste' },
  { id: 'expirado', rotulo: 'Teste expirado' },
  { id: 'suspenso', rotulo: 'Bloqueados' },
  { id: 'cancelado', rotulo: 'Inativos' },
]

function passaNoFiltro(c: ClientePlataforma, filtro: FiltroStatus): boolean {
  if (filtro === 'todos') return true
  if (filtro === 'expirado') return testeExpirado(c)
  if (filtro === 'trial') return c.status === 'trial' && !testeExpirado(c)
  return c.status === filtro
}

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function ClientesPage() {
  const tabelaRef = useTabelaResponsiva()
  const { clientes, planos, carregando, recarregar } = useDadosPlataforma()
  const [params, setParams] = useSearchParams()
  const busca = params.get('busca') ?? ''
  const [filtro, setFiltro] = useState<FiltroStatus>('todos')
  const [planoFiltro, setPlanoFiltro] = useState('')
  const [novo, setNovo] = useState(false)
  const [aberto, setAberto] = useState<{ acao: Acao; cliente: ClientePlataforma } | null>(null)

  const indicadores = useMemo(() => ({
    ativos: clientes.filter((c) => c.status === 'ativo').length,
    emTeste: clientes.filter((c) => c.status === 'trial' && !testeExpirado(c)).length,
    bloqueados: clientes.filter((c) => c.status === 'suspenso').length,
    testesExpirando: clientes.filter((c) => {
      const dias = diasAte(c.trial_ate)
      return c.status === 'trial' && dias !== null && dias > 0 && dias <= 3
    }).length,
    usuarios: clientes.reduce((soma, c) => soma + c.qtd_usuarios, 0),
  }), [clientes])

  const lista = useMemo(() => {
    const termo = normalizar(busca.trim())
    const digitos = busca.replace(/\D/g, '')
    return clientes.filter((c) => {
      if (!passaNoFiltro(c, filtro)) return false
      if (planoFiltro === 'sem' ? !!c.plano_id : planoFiltro && c.plano_id !== planoFiltro) return false
      if (!termo) return true
      const texto = normalizar([c.razao_social, c.nome_fantasia, c.email, c.cidade, c.uf, c.slug].filter(Boolean).join(' '))
      return texto.includes(termo) || (digitos.length >= 3 && (c.documento.includes(digitos) || (c.telefone ?? '').replace(/\D/g, '').includes(digitos)))
    })
  }, [clientes, busca, filtro, planoFiltro])

  const abrir = (acao: Acao, cliente: ClientePlataforma) => setAberto({ acao, cliente })
  const fechar = () => setAberto(null)

  const acoes = (c: ClientePlataforma) => {
    const bloqueado = c.status === 'suspenso'
    const inativo = c.status === 'cancelado'
    const itens: Array<{ acao: Acao; titulo: string; icone: React.ReactNode; cor: string }> = [
      { acao: 'editar', titulo: 'Editar cliente', icone: <Pencil className="h-4 w-4" />, cor: 'text-foreground/80' },
      { acao: 'plano', titulo: 'Plano e cobrança', icone: <SlidersHorizontal className="h-4 w-4" />, cor: 'text-primary' },
      { acao: 'prazos', titulo: 'Prazos (teste e vigência)', icone: <CalendarClock className="h-4 w-4" />, cor: 'text-warning-foreground' },
      {
        acao: 'bloqueio',
        titulo: bloqueado ? 'Desbloquear' : 'Bloquear',
        icone: bloqueado ? <ShieldCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />,
        cor: bloqueado ? 'text-success' : 'text-destructive',
      },
      {
        acao: 'ativacao',
        titulo: inativo ? 'Reativar' : 'Inativar',
        icone: <Power className="h-4 w-4" />,
        cor: inativo ? 'text-success' : 'text-muted-foreground',
      },
      { acao: 'usuarios', titulo: 'Usuários', icone: <Users className="h-4 w-4" />, cor: 'text-sky-600' },
      { acao: 'modulos', titulo: 'Módulos', icone: <Blocks className="h-4 w-4" />, cor: 'text-foreground/80' },
      { acao: 'detalhes', titulo: 'Detalhes e histórico', icone: <FileText className="h-4 w-4" />, cor: 'text-foreground/80' },
      { acao: 'excluir', titulo: 'Excluir', icone: <Trash2 className="h-4 w-4" />, cor: 'text-destructive' },
    ]
    return itens
  }

  const planoDe = (c: ClientePlataforma) => planos.find((p) => p.id === c.plano_id)
  const acimaDoLimite = (c: ClientePlataforma, tipo: 'usuarios' | 'estabelecimentos') => {
    const plano = planoDe(c)
    if (!plano) return false
    return tipo === 'usuarios'
      ? !!plano.max_usuarios && c.qtd_usuarios > plano.max_usuarios
      : !!plano.max_estabelecimentos && c.qtd_estabelecimentos > plano.max_estabelecimentos
  }

  return (
    <div className="space-y-6">
      {/* Indicadores */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <CartaoIndicador titulo="Clientes ativos" valor={indicadores.ativos} icone={<Building2 className="h-5 w-5" />} cor="text-success" />
        <CartaoIndicador titulo="Em teste" valor={indicadores.emTeste} icone={<Hourglass className="h-5 w-5" />} cor="text-sky-700" />
        <CartaoIndicador titulo="Bloqueados" valor={indicadores.bloqueados} icone={<ShieldAlert className="h-5 w-5" />} cor="text-destructive" />
        <CartaoIndicador titulo="Testes expirando" valor={indicadores.testesExpirando} detalhe="Próximos 3 dias"
          icone={<CalendarClock className="h-5 w-5" />} cor="text-warning-foreground" />
        <CartaoIndicador titulo="Total de usuários" valor={indicadores.usuarios} icone={<Users className="h-5 w-5" />} />
      </div>

      {/* Lista */}
      <section className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
            <Store className="size-5" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <h1 className="text-lg font-semibold text-foreground">Gerenciamento de clientes</h1>
            <p className="text-sm text-muted-foreground">Clientes da plataforma, planos, prazos e acessos</p>
          </div>
          <Button onClick={() => setNovo(true)}>
            <Plus /> Novo cliente
          </Button>
        </div>

        <div className="p-4 flex flex-wrap items-center gap-3 border-b border-border">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="h-4 w-4 text-muted-foreground/70 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              value={busca}
              onChange={(e) => setParams(e.target.value ? { busca: e.target.value } : {}, { replace: true })}
              placeholder="Buscar por nome, e-mail, cidade, CPF/CNPJ ou WhatsApp..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-muted/50 focus:bg-card focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              aria-label="Buscar clientes"
            />
          </div>
          <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Filtrar por status">
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
                {f.rotulo}
              </button>
            ))}
          </div>
          <select
            value={planoFiltro}
            onChange={(e) => setPlanoFiltro(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-1.5 bg-card"
            aria-label="Filtrar por plano"
          >
            <option value="">Todos os planos</option>
            <option value="sem">Sem plano</option>
            {planos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>

        {carregando && clientes.length === 0 ? (
          <Carregando />
        ) : (
          <div ref={tabelaRef} className="tabela-responsiva overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">Cliente</th>
                  <th className="text-left font-semibold px-4 py-3">E-mail</th>
                  <th className="text-left font-semibold px-4 py-3">Cidade/UF</th>
                  <th className="text-left font-semibold px-4 py-3">WhatsApp</th>
                  <th className="text-left font-semibold px-4 py-3">Plano</th>
                  <th className="text-left font-semibold px-4 py-3">Ciclo</th>
                  <th className="text-left font-semibold px-4 py-3">Vencimento</th>
                  <th className="text-left font-semibold px-4 py-3">Status</th>
                  <th className="text-center font-semibold px-3 py-3" title="Produtos">Produtos</th>
                  <th className="text-center font-semibold px-3 py-3" title="Usuários">Usuários</th>
                  <th className="text-center font-semibold px-3 py-3" title="Estabelecimentos">Lojas</th>
                  <th className="text-left font-semibold px-4 py-3">Último acesso</th>
                  <th className="text-right font-semibold px-4 py-3 sticky right-0 bg-muted/50">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lista.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/60 group">
                    <td className="px-4 py-3 min-w-[180px]">
                      <button onClick={() => abrir('detalhes', c)} className="text-left cursor-pointer">
                        <span className="block font-medium text-foreground hover:underline">{nomeDoCliente(c)}</span>
                        <span className="block text-xs text-muted-foreground font-mono">{formatarDocumento(c.documento)}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-foreground/80">{c.email ?? <span className="text-muted-foreground/70">—</span>}</td>
                    <td className="px-4 py-3 text-foreground/80 whitespace-nowrap">
                      {[c.cidade, c.uf].filter(Boolean).join('/') || <span className="text-muted-foreground/70">—</span>}
                    </td>
                    <td className="px-4 py-3 text-foreground/80 whitespace-nowrap">{c.telefone ?? <span className="text-muted-foreground/70">—</span>}</td>
                    <td className="px-4 py-3">
                      {c.plano_nome ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/5 text-primary border border-primary/20 whitespace-nowrap">
                          {c.plano_nome}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/70 whitespace-nowrap">Sem plano</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-foreground/80 border border-border">
                        {c.ciclo === 'anual' ? 'Anual' : 'Mensal'}
                      </span>
                    </td>
                    <td className="px-4 py-3"><Vencimento cliente={c} /></td>
                    <td className="px-4 py-3"><StatusCliente cliente={c} /></td>
                    <td className="px-3 py-3 text-center tabular-nums text-foreground/80">
                      <span className="inline-flex items-center gap-1"><Package className="h-3.5 w-3.5 text-muted-foreground/70" />{c.qtd_produtos}</span>
                    </td>
                    <td className={`px-3 py-3 text-center tabular-nums ${acimaDoLimite(c, 'usuarios') ? 'text-warning-foreground font-semibold' : 'text-foreground/80'}`}
                      title={acimaDoLimite(c, 'usuarios') ? 'Acima do limite do plano' : undefined}>
                      <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5 text-muted-foreground/70" />{c.qtd_usuarios}</span>
                    </td>
                    <td className={`px-3 py-3 text-center tabular-nums ${acimaDoLimite(c, 'estabelecimentos') ? 'text-warning-foreground font-semibold' : 'text-foreground/80'}`}
                      title={acimaDoLimite(c, 'estabelecimentos') ? 'Acima do limite do plano' : undefined}>
                      <span className="inline-flex items-center gap-1"><Store className="h-3.5 w-3.5 text-muted-foreground/70" />{c.qtd_estabelecimentos}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap" title={formatarDataHora(c.ultimo_acesso)}>
                      {tempoDesde(c.ultimo_acesso)}
                    </td>
                    <td className="px-2 py-2 sticky right-0 bg-card group-hover:bg-accent">
                      <div className="flex items-center justify-end">
                        {acoes(c).map((a) => (
                          <button
                            key={a.acao}
                            onClick={() => abrir(a.acao, c)}
                            className={`p-2 rounded-lg hover:bg-accent cursor-pointer ${a.cor}`}
                            title={a.titulo}
                            aria-label={`${a.titulo}: ${nomeDoCliente(c)}`}
                          >
                            {a.icone}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {lista.length === 0 && (
                  <tr>
                    <td colSpan={13}>
                      <EstadoVazio
                        icone={Building2}
                        titulo={clientes.length === 0 ? 'Nenhum cliente cadastrado' : 'Nenhum cliente encontrado'}
                        descricao={clientes.length === 0 ? 'Use o botão Novo cliente para cadastrar o primeiro.' : 'Ajuste a busca ou os filtros.'}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <p className="px-4 py-3 text-xs text-muted-foreground border-t border-border">
          {lista.length} de {clientes.length} cliente(s)
        </p>
      </section>

      {novo && <ModalNovoCliente onFechar={() => setNovo(false)} onAlterado={recarregar} />}
      {aberto?.acao === 'editar' && <ModalEditarCliente cliente={aberto.cliente} onFechar={fechar} onAlterado={recarregar} />}
      {aberto?.acao === 'plano' && <ModalPlanoCliente cliente={aberto.cliente} planos={planos} onFechar={fechar} onAlterado={recarregar} />}
      {aberto?.acao === 'prazos' && <ModalPrazos cliente={aberto.cliente} onFechar={fechar} onAlterado={recarregar} />}
      {aberto?.acao === 'bloqueio' && <ModalBloqueio cliente={aberto.cliente} onFechar={fechar} onAlterado={recarregar} />}
      {aberto?.acao === 'ativacao' && <ModalAtivacao cliente={aberto.cliente} onFechar={fechar} onAlterado={recarregar} />}
      {aberto?.acao === 'usuarios' && <ModalUsuarios cliente={aberto.cliente} onFechar={fechar} onAlterado={recarregar} />}
      {aberto?.acao === 'modulos' && <ModalModulos cliente={aberto.cliente} onFechar={fechar} />}
      {aberto?.acao === 'detalhes' && <ModalDetalhes cliente={aberto.cliente} planos={planos} onFechar={fechar} />}
      {aberto?.acao === 'excluir' && <ModalExcluir cliente={aberto.cliente} onFechar={fechar} onAlterado={recarregar} />}
    </div>
  )
}
