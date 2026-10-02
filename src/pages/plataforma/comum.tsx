/**
 * Peças compartilhadas pelas telas da administração da plataforma.
 */

import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { campoBase } from '@/components/ui/estilos'
import { Carregando as CarregandoPadrao } from '@/components/ui/feedback'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  diasAte,
  testeExpirado,
  vencimentoDoCliente,
  type ClientePlataforma,
  type StatusCliente,
  type UsuarioCliente,
} from '@/services/plataformaService'

// ----------------------------------------------------------------- formatos
export const formatarReais = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const formatarData = (data: string | null | undefined) =>
  data ? new Date(data).toLocaleDateString('pt-BR') : '—'

export const formatarDataHora = (data: string | null | undefined) =>
  data ? new Date(data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'

/** "hoje", "ontem", "há 5 dias", "há 3 meses" */
export function tempoDesde(data: string | null | undefined): string {
  if (!data) return 'nunca'
  const dias = Math.floor((Date.now() - new Date(data).getTime()) / (24 * 60 * 60 * 1000))
  if (dias <= 0) return 'hoje'
  if (dias === 1) return 'ontem'
  if (dias < 30) return `há ${dias} dias`
  const meses = Math.floor(dias / 30)
  return meses < 12 ? `há ${meses} ${meses === 1 ? 'mês' : 'meses'}` : `há ${Math.floor(meses / 12)} ano(s)`
}

/** Data para <input type="date"> (yyyy-mm-dd, fuso local) */
export function paraInputData(data: string | Date | null | undefined): string {
  if (!data) return ''
  const d = new Date(data)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** <input type="date"> → ISO no fim do dia local (o prazo vale o dia inteiro) */
export function deInputData(valor: string): string | null {
  if (!valor) return null
  const [a, m, d] = valor.split('-').map(Number)
  return new Date(a, m - 1, d, 23, 59, 59).toISOString()
}

// ----------------------------------------------------------------- rótulos
const STATUS: Record<StatusCliente, { texto: string; classe: string }> = {
  trial: { texto: 'Em teste', classe: 'bg-info/10 text-info border-info/25' },
  ativo: { texto: 'Ativo', classe: 'bg-success/10 text-success border-success/25' },
  suspenso: { texto: 'Bloqueado', classe: 'bg-destructive/10 text-destructive border-destructive/20' },
  cancelado: { texto: 'Inativo', classe: 'bg-muted text-muted-foreground border-border' },
}

export function StatusCliente({ cliente }: { cliente: ClientePlataforma }) {
  const rotulo = testeExpirado(cliente)
    ? { texto: 'Teste expirado', classe: 'bg-destructive/10 text-destructive border-destructive/20' }
    : STATUS[cliente.status]
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium whitespace-nowrap ${rotulo.classe}`}
      title={cliente.status === 'suspenso' && cliente.motivo_bloqueio ? `Motivo: ${cliente.motivo_bloqueio}` : undefined}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {rotulo.texto}
    </span>
  )
}

/** Data de vencimento que vale para o cliente (teste ou vigência) com destaque de prazo */
export function Vencimento({ cliente }: { cliente: ClientePlataforma }) {
  const { tipo, data } = vencimentoDoCliente(cliente)
  if (!data) return <span className="text-muted-foreground">—</span>
  const dias = diasAte(data) ?? 0
  const cor = dias < 0 ? 'text-destructive' : dias <= 7 ? 'text-warning-foreground' : 'text-muted-foreground'
  return (
    <div className="leading-tight whitespace-nowrap">
      <div className="text-foreground">{formatarData(data)}</div>
      <div className={`text-xs ${cor}`}>
        {tipo === 'teste' ? 'Teste' : 'Vigência'}
        {' · '}
        {dias < 0 ? 'vencido' : dias === 0 ? 'vence hoje' : `${dias} dia(s)`}
      </div>
    </div>
  )
}

export const ROTULO_PERFIL: Record<UsuarioCliente['perfil'], string> = {
  administrador_geral: 'Administrador geral',
  administrador_estabelecimento: 'Admin. do estabelecimento',
  operador: 'Operador',
}

export const ROTULO_ACAO: Record<string, string> = {
  cliente_criado: 'Cliente criado',
  cliente_excluido: 'Cliente excluído',
  status_alterado: 'Status alterado',
  plano_alterado: 'Plano alterado',
  teste_alterado: 'Teste alterado',
  dados_alterados: 'Dados alterados',
  modulo_ligado: 'Módulo ligado',
  modulo_desligado: 'Módulo desligado',
  senha_redefinida: 'Senha redefinida',
  usuario_bloqueado: 'Usuário bloqueado',
  usuario_liberado: 'Usuário liberado',
  logins_nao_removidos: 'Logins não removidos',
}

export const ROTULO_CAMPO: Record<string, string> = {
  status: 'Status',
  plano_id: 'Plano',
  ciclo: 'Ciclo',
  vigencia_ate: 'Vigência até',
  trial_ate: 'Teste até',
  motivo_bloqueio: 'Motivo do bloqueio',
  razao_social: 'Razão social',
  nome_fantasia: 'Nome fantasia',
  documento: 'CPF/CNPJ',
  email: 'E-mail',
  telefone: 'WhatsApp',
  cidade: 'Cidade',
  uf: 'UF',
  slug: 'Identificador',
  observacoes: 'Observações',
  origem: 'Origem',
  modulo: 'Módulo',
  usuario: 'Usuário',
  nome: 'Nome',
}

export const ROTULO_STATUS_TEXTO: Record<string, string> = {
  trial: 'Em teste',
  ativo: 'Ativo',
  suspenso: 'Bloqueado',
  cancelado: 'Inativo',
}

// ------------------------------------------------------------------ layout
export function CartaoIndicador({
  titulo,
  valor,
  detalhe,
  icone,
  cor = 'text-foreground',
}: {
  titulo: string
  valor: ReactNode
  detalhe?: string
  icone: ReactNode
  cor?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{titulo}</p>
        <span className="text-muted-foreground" aria-hidden="true">{icone}</span>
      </div>
      <p className={`mt-2 text-2xl font-semibold tracking-tight tabular-nums ${cor}`}>{valor}</p>
      {detalhe && <p className="mt-0.5 text-xs text-muted-foreground">{detalhe}</p>}
    </div>
  )
}

export function Carregando() {
  return <CarregandoPadrao />
}

export function Modal({
  aberto,
  onFechar,
  titulo,
  descricao,
  children,
  rodape,
  largura = 'sm:max-w-lg',
}: {
  aberto: boolean
  onFechar: () => void
  titulo: string
  descricao?: ReactNode
  children: ReactNode
  rodape?: ReactNode
  largura?: string
}) {
  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className={`${largura} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descricao && <DialogDescription>{descricao}</DialogDescription>}
        </DialogHeader>
        {children}
        {rodape && <DialogFooter className="gap-2">{rodape}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}

export function Campo({
  rotulo,
  children,
  ajuda,
}: {
  rotulo: string
  children: ReactNode
  ajuda?: string
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-foreground mb-1.5">{rotulo}</span>
      {children}
      {ajuda && <span className="block text-xs text-muted-foreground mt-1">{ajuda}</span>}
    </label>
  )
}

export const classeInput = `${campoBase} min-h-9 px-3 py-2`

export function BotaoPrimario({
  carregando,
  perigo,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { carregando?: boolean; perigo?: boolean }) {
  return <Button variant={perigo ? 'destructive' : 'default'} loading={carregando} {...props} />
}

export function BotaoSecundario(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <Button type="button" variant="outline" {...props} />
}
