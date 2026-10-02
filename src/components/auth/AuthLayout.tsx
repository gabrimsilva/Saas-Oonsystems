/**
 * Layout das telas de autenticação (login e cadastro): painel de marca à
 * esquerda (desktop) e formulário à direita, mais campos padronizados.
 */

import { useState, type ReactNode } from 'react'
import { BarChart3, Boxes, Eye, EyeOff, Globe, ShieldCheck, Store, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { campoBase } from '@/components/ui/estilos'

const RECURSOS: Array<{ icone: LucideIcon; titulo: string; texto: string }> = [
  { icone: Store, titulo: 'PDV e comandas', texto: 'Vendas no balcão e nas mesas, com pagamento dividido.' },
  { icone: Boxes, titulo: 'Estoque', texto: 'Variantes, alertas de reposição e movimentações.' },
  { icone: Globe, titulo: 'Loja online', texto: 'Catálogo com carrinho e pagamento pelo Mercado Pago.' },
  { icone: BarChart3, titulo: 'Métricas', texto: 'Faturamento, lucro e produtos mais vendidos.' },
]

/**
 * Logo OonSystems. Em fundo escuro (`claro`) usa a logo completa, cujo nome é
 * branco; em fundo claro usa só o símbolo com o nome em texto escuro.
 */
export function MarcaOon({ claro = false }: { claro?: boolean }) {
  if (claro) {
    return <img src="/logo-oonsystems.png" alt="OonSystems" className="h-12 w-auto xl:h-14" />
  }
  return (
    <div className="flex items-center gap-2.5">
      <img src="/logo-oonsystems-simbolo.png" alt="" className="h-8 w-auto" aria-hidden="true" />
      <span className="text-lg font-semibold tracking-tight">
        <span className="text-[#f07c12]">Oon</span>
        <span className="text-slate-900">Systems</span>
      </span>
    </div>
  )
}

export function AuthLayout({
  titulo,
  subtitulo,
  destaque,
  children,
  rodape,
}: {
  titulo: string
  subtitulo?: ReactNode
  /** Frase de destaque no painel de marca */
  destaque?: string
  children: ReactNode
  rodape?: ReactNode
}) {
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[minmax(420px,5fr)_7fr]">
      {/* Painel de marca (desktop) */}
      <aside className="relative hidden overflow-hidden bg-slate-950 text-white lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(ellipse at 30% 40%, black 30%, transparent 75%)',
          }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-32 -top-32 size-[420px] rounded-full bg-primary/25 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative">
          <MarcaOon claro />
        </div>

        <div className="relative max-w-md">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight xl:text-[34px]">
            {destaque ?? 'A gestão do seu negócio, organizada em um só lugar.'}
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-300">
            Vendas, estoque, pedidos online e indicadores com a segurança de dados separados por cliente.
          </p>

          <ul className="mt-10 grid gap-5">
            {RECURSOS.map(({ icone: Icone, titulo: t, texto }) => (
              <li key={t} className="flex items-start gap-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                  <Icone className="size-[18px] text-slate-200" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">{t}</span>
                  <span className="block text-sm text-slate-400">{texto}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="size-4" aria-hidden="true" />
          Conexão segura · © {new Date().getFullYear()} OonSystems
        </div>
      </aside>

      {/* Formulário */}
      <main className="flex min-h-screen flex-col px-5 py-8 sm:px-8 lg:min-h-0 lg:px-12">
        <div className="lg:hidden">
          <MarcaOon />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px]">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">{titulo}</h2>
              {subtitulo && <p className="mt-1.5 text-sm text-muted-foreground">{subtitulo}</p>}
            </div>
            {children}
            {rodape && <div className="mt-8 space-y-2 text-center text-sm text-muted-foreground">{rodape}</div>}
          </div>
        </div>
      </main>
    </div>
  )
}

/** Campo de texto com rótulo e ícone à esquerda */
export function CampoAuth({
  id,
  rotulo,
  icone: Icone,
  ajuda,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string
  rotulo: string
  icone?: LucideIcon
  ajuda?: string
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">{rotulo}</label>
      <div className="relative">
        {Icone && (
          <Icone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        )}
        <input id={id} className={cn(campoBase, 'h-10 px-3', Icone && 'pl-9', className)} {...props} />
      </div>
      {ajuda && <p className="text-xs text-muted-foreground">{ajuda}</p>}
    </div>
  )
}

/** Campo de senha com mostrar/ocultar */
export function CampoSenha({
  id,
  rotulo,
  icone: Icone,
  mostrar: mostrarControlado,
  onAlternar,
  acessorio,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string
  rotulo: string
  icone?: LucideIcon
  /** Controle externo (ex.: mesmo estado para senha e confirmação) */
  mostrar?: boolean
  onAlternar?: () => void
  /** Elemento à direita do rótulo (ex.: link "Esqueceu a senha?") */
  acessorio?: ReactNode
}) {
  const [mostrarInterno, setMostrarInterno] = useState(false)
  const mostrar = mostrarControlado ?? mostrarInterno
  const alternar = onAlternar ?? (() => setMostrarInterno((v) => !v))

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="block text-sm font-medium text-foreground">{rotulo}</label>
        {acessorio}
      </div>
      <div className="relative">
        {Icone && (
          <Icone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        )}
        <input
          id={id}
          type={mostrar ? 'text' : 'password'}
          className={cn(campoBase, 'h-10 pr-10', Icone ? 'pl-9' : 'pl-3')}
          {...props}
        />
        <button
          type="button"
          onClick={alternar}
          className="absolute right-1.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={mostrar ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={mostrar}
        >
          {mostrar ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  )
}
