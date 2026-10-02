/**
 * Modais da tela de clientes da plataforma.
 */

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Copy, KeyRound, Loader2, Lock, RefreshCw, Unlock } from 'lucide-react'
import {
  formatarDocumento,
  nomeDoCliente,
  plataformaService,
  proximaVigencia,
  testeExpirado,
  type CicloCobranca,
  type ClientePlataforma,
  type DadosCadastraisCliente,
  type NovoCliente,
  type Plano,
  type RegistroAuditoria,
  type StatusCliente,
  type UsuarioCliente,
} from '@/services/plataformaService'
import { moduloService, type CodigoModulo, type Modulo } from '@/services/moduloService'
import DetalhesAuditoria from './DetalhesAuditoria'
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
  ROTULO_ACAO,
  ROTULO_PERFIL,
  StatusCliente as BadgeStatus,
  tempoDesde,
  Vencimento,
} from './comum'
import { confirmar } from '@/components/ui/confirmar'
import { TabelaCarregando } from '@/components/ui/feedback'
import { Users } from 'lucide-react'
import { EstadoVazio } from '@/components/ui/feedback'

interface PropsModal {
  cliente: ClientePlataforma
  onFechar: () => void
  /** Chamado depois de uma alteração salva (recarrega a lista) */
  onAlterado: () => void
}

/** Executa uma ação com toast de sucesso/erro e controle de "salvando" */
function useAcao() {
  const [salvando, setSalvando] = useState(false)
  const executar = async (acao: () => Promise<unknown>, sucesso: string): Promise<boolean> => {
    setSalvando(true)
    try {
      await acao()
      toast.success(sucesso)
      return true
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível concluir a ação')
      return false
    } finally {
      setSalvando(false)
    }
  }
  return { salvando, executar }
}

/** Status ao liberar o acesso de novo: volta ao teste se ainda está no prazo e sem plano */
function statusAoLiberar(c: ClientePlataforma): StatusCliente {
  const testeVigente = !!c.trial_ate && new Date(c.trial_ate).getTime() > Date.now()
  return testeVigente && !c.plano_id ? 'trial' : 'ativo'
}

/** Senha aleatória legível (sem caracteres ambíguos) */
function gerarSenha(tamanho = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%'
  const valores = crypto.getRandomValues(new Uint32Array(tamanho))
  return Array.from(valores, (v) => chars[v % chars.length]).join('')
}

// ---------------------------------------------------------------------------
// Novo cliente
// ---------------------------------------------------------------------------
const NOVO_VAZIO: NovoCliente & { telefone: string; cidade: string; uf: string } = {
  documento: '',
  razao_social: '',
  nome_fantasia: '',
  estabelecimento_nome: 'Matriz',
  admin_nome: '',
  admin_email: '',
  admin_senha: '',
  status: 'trial',
  telefone: '',
  cidade: '',
  uf: '',
}

export function ModalNovoCliente({ onFechar, onAlterado }: Omit<PropsModal, 'cliente'>) {
  const [form, setForm] = useState({ ...NOVO_VAZIO })
  const { salvando, executar } = useAcao()
  const set = (campo: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [campo]: e.target.value })

  const salvar = async () => {
    const ok = await executar(async () => {
      const { telefone, cidade, uf, ...dados } = form
      const id = await plataformaService.criarCliente(dados)
      if (id && (telefone || cidade || uf)) {
        await plataformaService.atualizarCliente(id, { telefone, cidade, uf })
      }
    }, 'Cliente cadastrado')
    if (ok) {
      onAlterado()
      onFechar()
    }
  }

  return (
    <Modal
      aberto
      onFechar={onFechar}
      titulo="Novo cliente"
      descricao="Cria o cliente, o primeiro estabelecimento e o login do administrador."
      rodape={
        <>
          <BotaoSecundario onClick={onFechar}>Cancelar</BotaoSecundario>
          <BotaoPrimario onClick={salvar} carregando={salvando}>Cadastrar</BotaoPrimario>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Cliente</p>
        <Campo rotulo="CPF ou CNPJ *">
          <input className={classeInput} value={form.documento} onChange={set('documento')} maxLength={18}
            placeholder="000.000.000-00 ou 00.000.000/0000-00" />
        </Campo>
        <Campo rotulo="Razão social / nome completo *">
          <input className={classeInput} value={form.razao_social} onChange={set('razao_social')} maxLength={150} />
        </Campo>
        <Campo rotulo="Nome fantasia">
          <input className={classeInput} value={form.nome_fantasia} onChange={set('nome_fantasia')} maxLength={150} />
        </Campo>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_80px] gap-3">
          <Campo rotulo="WhatsApp">
            <input className={classeInput} value={form.telefone} onChange={set('telefone')} maxLength={20} inputMode="tel" />
          </Campo>
          <Campo rotulo="Cidade">
            <input className={classeInput} value={form.cidade} onChange={set('cidade')} maxLength={100} />
          </Campo>
          <Campo rotulo="UF">
            <input className={classeInput} value={form.uf} onChange={set('uf')} maxLength={2} />
          </Campo>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Campo rotulo="Primeiro estabelecimento">
            <input className={classeInput} value={form.estabelecimento_nome} onChange={set('estabelecimento_nome')} maxLength={100} />
          </Campo>
          <Campo rotulo="Situação inicial">
            <select className={classeInput} value={form.status} onChange={set('status')}>
              <option value="trial">Em teste (14 dias)</option>
              <option value="ativo">Ativo</option>
            </select>
          </Campo>
        </div>

        <p className="text-xs font-semibold uppercase text-muted-foreground pt-2">Administrador do cliente</p>
        <Campo rotulo="Nome *">
          <input className={classeInput} value={form.admin_nome} onChange={set('admin_nome')} maxLength={120} />
        </Campo>
        <Campo rotulo="E-mail *">
          <input className={classeInput} type="email" value={form.admin_email} onChange={set('admin_email')} maxLength={255} />
        </Campo>
        <Campo rotulo="Senha inicial *" ajuda="Mínimo de 8 caracteres. Repasse ao cliente por um canal seguro.">
          <input className={classeInput} type="password" autoComplete="new-password" minLength={8}
            value={form.admin_senha} onChange={set('admin_senha')} />
        </Campo>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Editar cliente
// ---------------------------------------------------------------------------
export function ModalEditarCliente({ cliente, onFechar, onAlterado }: PropsModal) {
  const [form, setForm] = useState<DadosCadastraisCliente>({
    razao_social: cliente.razao_social,
    nome_fantasia: cliente.nome_fantasia ?? '',
    email: cliente.email ?? '',
    telefone: cliente.telefone ?? '',
    cidade: cliente.cidade ?? '',
    uf: cliente.uf ?? '',
    observacoes: cliente.observacoes ?? '',
  })
  const { salvando, executar } = useAcao()
  const set = (campo: keyof DadosCadastraisCliente) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [campo]: e.target.value })

  const salvar = async () => {
    if (!form.razao_social.trim()) {
      toast.error('Informe a razão social')
      return
    }
    if (await executar(() => plataformaService.atualizarCliente(cliente.id, form), 'Cliente atualizado')) {
      onAlterado()
      onFechar()
    }
  }

  return (
    <Modal
      aberto
      onFechar={onFechar}
      titulo="Editar cliente"
      descricao={`${formatarDocumento(cliente.documento)} · /${cliente.slug}`}
      rodape={
        <>
          <BotaoSecundario onClick={onFechar}>Cancelar</BotaoSecundario>
          <BotaoPrimario onClick={salvar} carregando={salvando}>Salvar</BotaoPrimario>
        </>
      }
    >
      <div className="space-y-3">
        <Campo rotulo="Razão social / nome completo *">
          <input className={classeInput} value={form.razao_social} onChange={set('razao_social')} maxLength={150} />
        </Campo>
        <Campo rotulo="Nome fantasia">
          <input className={classeInput} value={form.nome_fantasia ?? ''} onChange={set('nome_fantasia')} maxLength={150} />
        </Campo>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Campo rotulo="E-mail de contato">
            <input className={classeInput} type="email" value={form.email ?? ''} onChange={set('email')} maxLength={255} />
          </Campo>
          <Campo rotulo="WhatsApp">
            <input className={classeInput} value={form.telefone ?? ''} onChange={set('telefone')} maxLength={20} inputMode="tel" />
          </Campo>
        </div>
        <div className="grid grid-cols-[1fr_80px] gap-3">
          <Campo rotulo="Cidade">
            <input className={classeInput} value={form.cidade ?? ''} onChange={set('cidade')} maxLength={100} />
          </Campo>
          <Campo rotulo="UF">
            <input className={classeInput} value={form.uf ?? ''} onChange={set('uf')} maxLength={2} />
          </Campo>
        </div>
        <Campo rotulo="Observações internas" ajuda="Visível só para a OonSystems.">
          <textarea className={`${classeInput} resize-none`} rows={3} value={form.observacoes ?? ''}
            onChange={set('observacoes')} maxLength={2000} />
        </Campo>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Plano do cliente
// ---------------------------------------------------------------------------
export function ModalPlanoCliente({ cliente, planos, onFechar, onAlterado }: PropsModal & { planos: Plano[] }) {
  const [planoId, setPlanoId] = useState(cliente.plano_id ?? '')
  const [ciclo, setCiclo] = useState<CicloCobranca>(cliente.ciclo)
  const [vigencia, setVigencia] = useState(
    paraInputData(cliente.vigencia_ate ?? (cliente.plano_id ? null : proximaVigencia(null, cliente.ciclo))),
  )
  const [aplicarModulos, setAplicarModulos] = useState(true)
  const [ativar, setAtivar] = useState(cliente.status === 'trial' || cliente.status === 'cancelado')
  const { salvando, executar } = useAcao()

  const disponiveis = planos.filter((p) => p.ativo || p.id === cliente.plano_id)
  const plano = planos.find((p) => p.id === planoId)
  const preco = plano ? (ciclo === 'anual' ? plano.preco_anual : plano.preco_mensal) : 0

  const salvar = async () => {
    const ok = await executar(async () => {
      await plataformaService.definirPlano(cliente.id, planoId || null, ciclo, deInputData(vigencia), aplicarModulos)
      if (ativar && planoId && cliente.status !== 'ativo') {
        await plataformaService.definirStatus(cliente.id, 'ativo')
      }
    }, 'Plano atualizado')
    if (ok) {
      onAlterado()
      onFechar()
    }
  }

  return (
    <Modal
      aberto
      onFechar={onFechar}
      titulo="Plano e cobrança"
      descricao={nomeDoCliente(cliente)}
      rodape={
        <>
          <BotaoSecundario onClick={onFechar}>Cancelar</BotaoSecundario>
          <BotaoPrimario onClick={salvar} carregando={salvando}>Salvar</BotaoPrimario>
        </>
      }
    >
      <div className="space-y-4">
        <Campo rotulo="Plano">
          <select className={classeInput} value={planoId} onChange={(e) => setPlanoId(e.target.value)}>
            <option value="">Sem plano</option>
            {disponiveis.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}{!p.ativo ? ' (inativo)' : ''}
              </option>
            ))}
          </select>
        </Campo>

        <fieldset>
          <legend className="text-sm font-medium text-foreground/80 mb-1">Ciclo de cobrança</legend>
          <div className="flex gap-2">
            {(['mensal', 'anual'] as const).map((c) => (
              <label key={c} className={`flex-1 flex items-center gap-2 border rounded-lg px-3 py-2 text-sm cursor-pointer ${
                ciclo === c ? 'border-gray-900 bg-muted/50' : 'border-border'
              }`}>
                <input type="radio" name="ciclo" checked={ciclo === c} onChange={() => setCiclo(c)} className="accent-gray-900" />
                <span className="flex-1">{c === 'mensal' ? 'Mensal' : 'Anual'}</span>
                {plano && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatarReais(c === 'anual' ? plano.preco_anual : plano.preco_mensal)}
                  </span>
                )}
              </label>
            ))}
          </div>
        </fieldset>

        <Campo rotulo="Vigência até" ajuda="Fim do período pago. Gera alertas de renovação (não bloqueia sozinho).">
          <div className="flex gap-2">
            <input type="date" className={classeInput} value={vigencia} onChange={(e) => setVigencia(e.target.value)} />
            <BotaoSecundario
              onClick={() => setVigencia(paraInputData(proximaVigencia(deInputData(vigencia), ciclo)))}
              title="Soma um ciclo à vigência"
              className="whitespace-nowrap"
            >
              <RefreshCw className="h-4 w-4" /> +1 {ciclo === 'anual' ? 'ano' : 'mês'}
            </BotaoSecundario>
          </div>
        </Campo>

        {plano && (
          <div className="rounded-lg bg-muted/50 border border-border p-3 text-sm space-y-1">
            <p><span className="text-muted-foreground">Valor:</span> <strong>{formatarReais(preco)}</strong> / {ciclo === 'anual' ? 'ano' : 'mês'}</p>
            <p className="text-muted-foreground">
              Limites: {plano.max_estabelecimentos ?? '∞'} estabelecimento(s) · {plano.max_usuarios ?? '∞'} usuário(s)
            </p>
            <label className="flex items-center gap-2 pt-1 cursor-pointer">
              <input type="checkbox" checked={aplicarModulos} onChange={(e) => setAplicarModulos(e.target.checked)} />
              Aplicar os módulos do plano ({plano.modulos.length})
            </label>
            {cliente.status !== 'ativo' && cliente.status !== 'suspenso' && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={ativar} onChange={(e) => setAtivar(e.target.checked)} />
                Marcar como cliente ativo (assinatura paga)
              </label>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Prazos: teste e vigência
// ---------------------------------------------------------------------------
export function ModalPrazos({ cliente, onFechar, onAlterado }: PropsModal) {
  const [vigencia, setVigencia] = useState(paraInputData(cliente.vigencia_ate))
  const [teste, setTeste] = useState(paraInputData(cliente.trial_ate))
  const { salvando, executar } = useAcao()
  const emTeste = cliente.status === 'trial'

  const estender = async (dias: number) => {
    if (await executar(() => plataformaService.estenderTeste(cliente, dias), `Teste estendido em ${dias} dias`)) {
      onAlterado()
      onFechar()
    }
  }

  const salvar = async () => {
    const ok = await executar(async () => {
      if (emTeste && teste !== paraInputData(cliente.trial_ate)) {
        const prazo = deInputData(teste)
        if (!prazo) throw new Error('Informe a data final do teste')
        await plataformaService.definirFimDoTeste(cliente.id, prazo)
      }
      if (vigencia !== paraInputData(cliente.vigencia_ate)) {
        await plataformaService.definirVigencia(cliente.id, deInputData(vigencia))
      }
    }, 'Prazos atualizados')
    if (ok) {
      onAlterado()
      onFechar()
    }
  }

  return (
    <Modal
      aberto
      onFechar={onFechar}
      titulo="Prazos"
      descricao={nomeDoCliente(cliente)}
      rodape={
        <>
          <BotaoSecundario onClick={onFechar}>Cancelar</BotaoSecundario>
          <BotaoPrimario onClick={salvar} carregando={salvando}>Salvar datas</BotaoPrimario>
        </>
      }
    >
      <div className="space-y-5">
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Período de teste</h3>
          {emTeste ? (
            <>
              <p className="text-sm text-muted-foreground">
                {testeExpirado(cliente) ? 'Expirado em ' : 'Termina em '}
                <strong>{formatarData(cliente.trial_ate)}</strong>
              </p>
              <div className="flex flex-wrap gap-2">
                {[7, 14, 30].map((d) => (
                  <BotaoSecundario key={d} onClick={() => estender(d)} disabled={salvando}>+{d} dias</BotaoSecundario>
                ))}
              </div>
              <Campo rotulo="Ou defina a data final">
                <input type="date" className={classeInput} value={teste} onChange={(e) => setTeste(e.target.value)} />
              </Campo>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-muted-foreground flex-1">O cliente não está em teste.</p>
              <BotaoSecundario onClick={() => estender(7)} disabled={salvando}>Colocar em teste por 7 dias</BotaoSecundario>
            </div>
          )}
        </section>

        <section className="space-y-2 border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-foreground">Vigência do plano</h3>
          <div className="flex gap-2">
            <input type="date" className={classeInput} value={vigencia} onChange={(e) => setVigencia(e.target.value)} />
            <BotaoSecundario
              onClick={() => setVigencia(paraInputData(proximaVigencia(deInputData(vigencia), cliente.ciclo)))}
              className="whitespace-nowrap"
            >
              <RefreshCw className="h-4 w-4" /> Renovar {cliente.ciclo === 'anual' ? '1 ano' : '1 mês'}
            </BotaoSecundario>
          </div>
          <p className="text-xs text-muted-foreground">Renovar soma um ciclo ({cliente.ciclo}) a partir do fim atual ou de hoje, se já venceu.</p>
        </section>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Bloquear / desbloquear e inativar / reativar
// ---------------------------------------------------------------------------
export function ModalBloqueio({ cliente, onFechar, onAlterado }: PropsModal) {
  const bloqueado = cliente.status === 'suspenso'
  const [motivo, setMotivo] = useState('')
  const { salvando, executar } = useAcao()

  const confirmar = async () => {
    if (!bloqueado && !motivo.trim()) {
      toast.error('Informe o motivo do bloqueio')
      return
    }
    const ok = await executar(
      () => bloqueado
        ? plataformaService.definirStatus(cliente.id, statusAoLiberar(cliente))
        : plataformaService.definirStatus(cliente.id, 'suspenso', motivo.trim()),
      bloqueado ? 'Cliente desbloqueado' : 'Cliente bloqueado',
    )
    if (ok) {
      onAlterado()
      onFechar()
    }
  }

  return (
    <Modal
      aberto
      onFechar={onFechar}
      titulo={bloqueado ? 'Desbloquear cliente' : 'Bloquear cliente'}
      descricao={nomeDoCliente(cliente)}
      rodape={
        <>
          <BotaoSecundario onClick={onFechar}>Cancelar</BotaoSecundario>
          <BotaoPrimario onClick={confirmar} carregando={salvando} perigo={!bloqueado}>
            {bloqueado ? 'Desbloquear' : 'Bloquear'}
          </BotaoPrimario>
        </>
      }
    >
      {bloqueado ? (
        <div className="space-y-2 text-sm text-muted-foreground">
          {cliente.motivo_bloqueio && <p><strong>Motivo do bloqueio:</strong> {cliente.motivo_bloqueio}</p>}
          <p>Os usuários do cliente voltam a acessar o sistema e o catálogo volta a receber pedidos.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Os usuários perdem o acesso na hora e o catálogo para de receber pedidos. Os dados são mantidos.
          </p>
          <Campo rotulo="Motivo *" ajuda="Fica registrado no histórico e aparece para a equipe da OonSystems.">
            <input className={classeInput} value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={300}
              placeholder="Ex.: pagamento em atraso" autoFocus />
          </Campo>
        </div>
      )}
    </Modal>
  )
}

export function ModalAtivacao({ cliente, onFechar, onAlterado }: PropsModal) {
  const inativo = cliente.status === 'cancelado'
  const { salvando, executar } = useAcao()

  const confirmar = async () => {
    const ok = await executar(
      () => plataformaService.definirStatus(cliente.id, inativo ? statusAoLiberar(cliente) : 'cancelado'),
      inativo ? 'Cliente reativado' : 'Cliente inativado',
    )
    if (ok) {
      onAlterado()
      onFechar()
    }
  }

  return (
    <Modal
      aberto
      onFechar={onFechar}
      titulo={inativo ? 'Reativar cliente' : 'Inativar cliente'}
      descricao={nomeDoCliente(cliente)}
      rodape={
        <>
          <BotaoSecundario onClick={onFechar}>Cancelar</BotaoSecundario>
          <BotaoPrimario onClick={confirmar} carregando={salvando} perigo={!inativo}>
            {inativo ? 'Reativar' : 'Inativar'}
          </BotaoPrimario>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">
        {inativo
          ? 'O cliente volta a acessar o sistema.'
          : 'Use quando o cliente encerrou a assinatura. O acesso é cortado, mas os dados ficam guardados e o cliente pode ser reativado depois.'}
      </p>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Usuários do cliente
// ---------------------------------------------------------------------------
export function ModalUsuarios({ cliente, onFechar, onAlterado }: PropsModal) {
  const [usuarios, setUsuarios] = useState<UsuarioCliente[] | null>(null)
  const [senhaDe, setSenhaDe] = useState<string | null>(null)
  const [novaSenha, setNovaSenha] = useState('')
  const { salvando, executar } = useAcao()

  const carregar = async () => {
    try {
      setUsuarios(await plataformaService.listarUsuarios(cliente.id))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar usuários')
      setUsuarios([])
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente.id])

  const abrirSenha = (u: UsuarioCliente) => {
    setSenhaDe(senhaDe === u.user_id ? null : u.user_id)
    setNovaSenha(gerarSenha())
  }

  const salvarSenha = async (u: UsuarioCliente) => {
    if (novaSenha.length < 8) {
      toast.error('A senha precisa ter pelo menos 8 caracteres')
      return
    }
    if (await executar(() => plataformaService.redefinirSenha(u.user_id, novaSenha), `Senha de ${u.nome} alterada`)) {
      setSenhaDe(null)
    }
  }

  const alternarAcesso = async (u: UsuarioCliente) => {
    const ok = await confirmar(
      u.ativo
        ? { titulo: `Bloquear o acesso de ${u.nome}?`, descricao: 'O usuário não consegue mais entrar até ser liberado.', confirmar: 'Bloquear', perigo: true }
        : { titulo: `Liberar o acesso de ${u.nome}?`, confirmar: 'Liberar' },
    )
    if (!ok) return
    if (await executar(() => plataformaService.alterarAcessoUsuario(u.user_id, !u.ativo), u.ativo ? 'Acesso bloqueado' : 'Acesso liberado')) {
      await carregar()
      onAlterado()
    }
  }

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(novaSenha)
      toast.success('Senha copiada')
    } catch {
      toast.error('Não foi possível copiar')
    }
  }

  return (
    <Modal aberto onFechar={onFechar} titulo="Usuários do cliente" descricao={nomeDoCliente(cliente)} largura="sm:max-w-3xl">
      {!usuarios ? (
        <TabelaCarregando colunas={4} linhas={3} />
      ) : usuarios.length === 0 ? (
        <EstadoVazio icone={Users} titulo="Nenhum usuário cadastrado" className="py-8" />
      ) : (
        <ul className="divide-y divide-border border border-border rounded-lg">
          {usuarios.map((u) => (
            <li key={u.user_id} className="p-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <p className="font-medium text-foreground flex items-center gap-2">
                    {u.nome}
                    {!u.ativo && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-destructive/5 text-destructive border border-destructive/30">Sem acesso</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {ROTULO_PERFIL[u.perfil] ?? u.perfil} · {u.estabelecimento_nome}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground text-right">
                  <p title={formatarDataHora(u.ultimo_acesso)}>Último acesso: {tempoDesde(u.ultimo_acesso)}</p>
                  <p>Desde {formatarData(u.criado_em)}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => abrirSenha(u)}
                    className="p-2 rounded-lg hover:bg-accent text-foreground/80 cursor-pointer"
                    title="Redefinir senha"
                    aria-label={`Redefinir senha de ${u.nome}`}
                  >
                    <KeyRound className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => alternarAcesso(u)}
                    disabled={salvando}
                    className={`p-2 rounded-lg hover:bg-accent cursor-pointer ${u.ativo ? 'text-destructive' : 'text-success'}`}
                    title={u.ativo ? 'Bloquear acesso' : 'Liberar acesso'}
                    aria-label={`${u.ativo ? 'Bloquear' : 'Liberar'} acesso de ${u.nome}`}
                  >
                    {u.ativo ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {senhaDe === u.user_id && (
                <div className="mt-3 rounded-lg bg-muted/50 border border-border p-3 space-y-2">
                  <label className="block text-sm font-medium text-foreground/80" htmlFor={`senha-${u.user_id}`}>Nova senha</label>
                  <div className="flex flex-wrap gap-2">
                    <input
                      id={`senha-${u.user_id}`}
                      className={`${classeInput} font-mono flex-1 min-w-[180px]`}
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      autoComplete="new-password"
                    />
                    <BotaoSecundario onClick={() => setNovaSenha(gerarSenha())} title="Gerar outra">
                      <RefreshCw className="h-4 w-4" />
                    </BotaoSecundario>
                    <BotaoSecundario onClick={copiar} title="Copiar"><Copy className="h-4 w-4" /></BotaoSecundario>
                    <BotaoPrimario onClick={() => salvarSenha(u)} carregando={salvando}>Salvar senha</BotaoPrimario>
                  </div>
                  <p className="text-xs text-muted-foreground">Copie a senha antes de salvar e repasse ao usuário por um canal seguro.</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Módulos (ajuste fino além do plano)
// ---------------------------------------------------------------------------
export function ModalModulos({ cliente, onFechar }: Omit<PropsModal, 'onAlterado'>) {
  const [catalogo, setCatalogo] = useState<Modulo[]>([])
  const [ligados, setLigados] = useState<string[] | null>(null)
  const [alternando, setAlternando] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([moduloService.listarCatalogo(), moduloService.modulosDoCliente(cliente.id)])
      .then(([cat, lig]) => {
        setCatalogo(cat)
        setLigados(lig)
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Erro ao carregar módulos'))
  }, [cliente.id])

  const alternar = async (codigo: CodigoModulo) => {
    if (!ligados) return
    const ligar = !ligados.includes(codigo)
    setAlternando(codigo)
    try {
      await moduloService.definirModulo(cliente.id, codigo, ligar)
      setLigados(ligar ? [...ligados, codigo] : ligados.filter((m) => m !== codigo))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao alterar módulo')
    } finally {
      setAlternando(null)
    }
  }

  return (
    <Modal
      aberto
      onFechar={onFechar}
      titulo="Módulos"
      descricao={`${nomeDoCliente(cliente)}${cliente.plano_nome ? ` · plano ${cliente.plano_nome}` : ''}`}
      rodape={<BotaoSecundario onClick={onFechar}>Fechar</BotaoSecundario>}
    >
      {!ligados ? (
        <TabelaCarregando colunas={4} linhas={3} />
      ) : (
        <div className="space-y-2">
          {catalogo.map((m) => (
            <label key={m.codigo} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                checked={ligados.includes(m.codigo)}
                disabled={alternando !== null}
                onChange={() => alternar(m.codigo)}
              />
              <div className="flex-1">
                <div className="font-medium text-sm flex items-center gap-2">
                  {m.nome}
                  {alternando === m.codigo && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground/70" />}
                </div>
                {m.descricao && <div className="text-xs text-muted-foreground">{m.descricao}</div>}
              </div>
            </label>
          ))}
          <p className="text-xs text-muted-foreground pt-2">
            Ajuste fino além do plano. Trocar o plano (com "aplicar módulos") volta aos módulos do plano.
            Produtos, categorias, configurações, usuários e o catálogo ficam sempre disponíveis.
          </p>
        </div>
      )}
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Detalhes e histórico
// ---------------------------------------------------------------------------
export function ModalDetalhes({ cliente, planos, onFechar }: Omit<PropsModal, 'onAlterado'> & { planos: Plano[] }) {
  const [historico, setHistorico] = useState<RegistroAuditoria[] | null>(null)

  useEffect(() => {
    plataformaService
      .listarAuditoria({ tenantId: cliente.id, limite: 100 })
      .then(setHistorico)
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : 'Erro ao carregar o histórico')
        setHistorico([])
      })
  }, [cliente.id])

  const dados = useMemo(() => [
    ['CPF/CNPJ', `${formatarDocumento(cliente.documento)} (${cliente.tipo_pessoa})`],
    ['Razão social', cliente.razao_social],
    ['Identificador', `/${cliente.slug}`],
    ['E-mail', cliente.email ?? '—'],
    ['WhatsApp', cliente.telefone ?? '—'],
    ['Cidade/UF', [cliente.cidade, cliente.uf].filter(Boolean).join('/') || '—'],
    ['Origem', cliente.origem === 'site' ? 'Autocadastro pelo site' : 'Cadastrado pela plataforma'],
    ['Cliente desde', formatarData(cliente.criado_em)],
    ['Plano', cliente.plano_nome ? `${cliente.plano_nome} · ${cliente.ciclo}` : 'Sem plano'],
    ['Uso', `${cliente.qtd_estabelecimentos} estabelecimento(s) · ${cliente.qtd_usuarios} usuário(s) · ${cliente.qtd_produtos} produto(s)`],
    ['Último acesso', `${tempoDesde(cliente.ultimo_acesso)} (${formatarDataHora(cliente.ultimo_acesso)})`],
  ], [cliente])

  return (
    <Modal aberto onFechar={onFechar} titulo={nomeDoCliente(cliente)} largura="sm:max-w-3xl"
      descricao={<span className="inline-flex items-center gap-2"><BadgeStatus cliente={cliente} /></span>}>
      <div className="space-y-5">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {dados.map(([rotulo, valor]) => (
            <div key={rotulo} className="flex gap-2">
              <dt className="text-muted-foreground w-28 flex-shrink-0">{rotulo}</dt>
              <dd className="text-foreground break-words min-w-0">{valor}</dd>
            </div>
          ))}
          <div className="flex gap-2">
            <dt className="text-muted-foreground w-28 flex-shrink-0">Vencimento</dt>
            <dd><Vencimento cliente={cliente} /></dd>
          </div>
        </dl>

        {cliente.status === 'suspenso' && cliente.motivo_bloqueio && (
          <p className="text-sm rounded-lg bg-destructive/5 border border-destructive/30 text-destructive p-3">
            <strong>Bloqueado:</strong> {cliente.motivo_bloqueio}
          </p>
        )}
        {cliente.observacoes && (
          <div className="text-sm rounded-lg bg-warning/10 border border-warning/30 text-warning-foreground p-3 whitespace-pre-wrap">
            <strong className="block mb-1">Observações internas</strong>
            {cliente.observacoes}
          </div>
        )}

        <section>
          <h3 className="text-sm font-semibold text-foreground mb-2">Histórico</h3>
          {!historico ? (
            <TabelaCarregando colunas={3} linhas={2} />
          ) : historico.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum registro.</p>
          ) : (
            <ol className="border-l border-border ml-2 space-y-3">
              {historico.map((r) => (
                <li key={r.id} className="pl-4 relative">
                  <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-gray-300" aria-hidden="true" />
                  <p className="text-sm font-medium text-foreground">
                    {ROTULO_ACAO[r.acao] ?? r.acao}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {formatarDataHora(r.criado_em)} · {r.autor_email ?? 'sistema'}
                    </span>
                  </p>
                  <DetalhesAuditoria registro={r} planos={planos} />
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Excluir cliente
// ---------------------------------------------------------------------------
export function ModalExcluir({ cliente, onFechar, onAlterado }: PropsModal) {
  const [confirmacao, setConfirmacao] = useState('')
  const { salvando, executar } = useAcao()
  const confere = confirmacao.trim().toLowerCase() === cliente.slug

  const excluir = async () => {
    if (await executar(() => plataformaService.excluirCliente(cliente.id, confirmacao), 'Cliente excluído')) {
      onAlterado()
      onFechar()
    }
  }

  return (
    <Modal
      aberto
      onFechar={onFechar}
      titulo="Excluir cliente"
      descricao={nomeDoCliente(cliente)}
      rodape={
        <>
          <BotaoSecundario onClick={onFechar}>Cancelar</BotaoSecundario>
          <BotaoPrimario onClick={excluir} carregando={salvando} disabled={!confere} perigo>
            Excluir definitivamente
          </BotaoPrimario>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <p className="rounded-lg bg-destructive/5 border border-destructive/30 text-destructive p-3">
          Apaga o cliente, os {cliente.qtd_estabelecimentos} estabelecimento(s), todos os produtos, vendas, pedidos e
          estoque, e os logins dos {cliente.qtd_usuarios} usuário(s). <strong>Não dá para desfazer.</strong>
        </p>
        <p className="text-muted-foreground">
          Se o cliente só encerrou a assinatura, prefira <strong>Inativar</strong>: o acesso é cortado e os dados ficam guardados.
        </p>
        <Campo rotulo={`Para confirmar, digite o identificador: ${cliente.slug}`}>
          <input className={classeInput} value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)}
            autoComplete="off" placeholder={cliente.slug} />
        </Campo>
      </div>
    </Modal>
  )
}
