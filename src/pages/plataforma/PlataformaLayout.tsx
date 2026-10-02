/**
 * Administração da plataforma OonSystems: menu lateral, verificação de acesso
 * (só usuários em plataforma_admins) e dados compartilhados entre as telas.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, NavLink, Outlet, useOutletContext } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Bell,
  Building2,
  DollarSign,
  FileClock,
  LogOut,
  Menu,
  Package,
} from 'lucide-react'
import { authService, supabase } from '@/services'
import {
  calcularAlertas,
  plataformaService,
  type AlertaCliente,
  type ClientePlataforma,
  type Plano,
} from '@/services/plataformaService'
import { Carregando } from './comum'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'

export interface DadosPlataforma {
  clientes: ClientePlataforma[]
  planos: Plano[]
  alertas: AlertaCliente[]
  carregando: boolean
  recarregar: () => Promise<void>
}

export const useDadosPlataforma = () => useOutletContext<DadosPlataforma>()

const MENU = [
  { para: '/plataforma', rotulo: 'Clientes', icone: Building2, fim: true },
  { para: '/plataforma/financeiro', rotulo: 'Financeiro', icone: DollarSign },
  { para: '/plataforma/alertas', rotulo: 'Alertas', icone: Bell },
  { para: '/plataforma/planos', rotulo: 'Planos', icone: Package },
  { para: '/plataforma/auditoria', rotulo: 'Auditoria', icone: FileClock },
]

export default function PlataformaLayout() {
  const [autorizado, setAutorizado] = useState<boolean | null>(null)
  const [email, setEmail] = useState('')
  const [clientes, setClientes] = useState<ClientePlataforma[]>([])
  const [planos, setPlanos] = useState<Plano[]>([])
  const [carregando, setCarregando] = useState(true)
  const [menuAberto, setMenuAberto] = useState(false)

  const recarregar = useCallback(async () => {
    setCarregando(true)
    try {
      const [listaClientes, listaPlanos] = await Promise.all([
        plataformaService.listarClientes(),
        plataformaService.listarPlanos(),
      ])
      setClientes(listaClientes)
      setPlanos(listaPlanos)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar os dados da plataforma', {
        id: 'plataforma-carregar',
      })
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    plataformaService.ehAdminPlataforma().then(async (ok) => {
      setAutorizado(ok)
      if (!ok) return
      const { data } = await supabase.auth.getUser()
      setEmail(data.user?.email ?? '')
      recarregar()
    })
  }, [recarregar])

  const alertas = useMemo(() => calcularAlertas(clientes, planos), [clientes, planos])
  const alertasImportantes = alertas.filter((a) => a.gravidade !== 'info').length

  if (autorizado === null) return <div className="min-h-screen"><Carregando /></div>
  if (!autorizado) return <Navigate to="/sistema" replace />

  const sair = async () => {
    await authService.logout()
    window.location.href = '/login'
  }

  const menu = (
    <nav className="flex flex-col h-full">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-sidebar-border px-4">
        <img src="/logo-oonsystems-simbolo.png" alt="" className="h-7 w-auto shrink-0" aria-hidden="true" />
        <div className="leading-tight">
          <p className="text-sm font-semibold text-foreground">OonSystems</p>
          <p className="text-xs text-muted-foreground">Administração da plataforma</p>
        </div>
      </div>

      <p className="px-6 mt-5 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">Administração</p>
      <ul className="px-3 space-y-0.5">
        {MENU.map(({ para, rotulo, icone: Icone, fim }) => (
          <li key={para}>
            <NavLink
              to={para}
              end={fim}
              onClick={() => setMenuAberto(false)}
              className={({ isActive }) =>
                `relative flex h-9 items-center gap-3 rounded-md px-3 text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/10 font-semibold text-primary before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-r-full before:bg-primary'
                    : 'font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground'
                }`
              }
            >
              <Icone className="size-[18px]" />
              <span className="flex-1">{rotulo}</span>
              {para.endsWith('alertas') && alertasImportantes > 0 && (
                <span
                  className="min-w-5 h-5 px-1.5 rounded-full bg-warning/20 text-[11px] font-semibold text-warning-foreground flex items-center justify-center"
                  aria-label={`${alertasImportantes} alertas importantes`}
                >
                  {alertasImportantes}
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="mt-auto border-t border-sidebar-border p-3">
        <div className="mb-2 px-1">
          <p className="text-sm font-medium text-foreground">Administrador</p>
          <p className="truncate text-xs text-muted-foreground" title={email}>{email}</p>
        </div>
        <button
          onClick={sair}
          className="flex h-9 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-destructive/5 hover:text-destructive"
        >
          <LogOut className="size-[18px]" /> Sair
        </button>
      </div>
    </nav>
  )

  return (
    <div className="min-h-screen bg-background lg:flex">
      {/* Menu fixo (desktop) */}
      <aside className="hidden lg:block w-64 flex-shrink-0 border-r border-sidebar-border bg-sidebar sticky top-0 h-screen">{menu}</aside>

      {/* Menu deslizante (celular) */}
      <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
        <SheetContent side="left" className="flex w-72 max-w-[85vw] flex-col gap-0 bg-sidebar p-0 lg:hidden">
          <SheetTitle className="sr-only">Menu da plataforma</SheetTitle>
          <SheetDescription className="sr-only">Navegação da administração da plataforma</SheetDescription>
          {menu}
        </SheetContent>
      </Sheet>

      <div className="flex-1 min-w-0">
        <header className="lg:hidden sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card px-3">
          <button onClick={() => setMenuAberto(true)} className="rounded-md p-2 hover:bg-accent" aria-label="Abrir menu">
            <Menu className="size-5" />
          </button>
          <img src="/logo-oonsystems-simbolo.png" alt="" className="h-6 w-auto" aria-hidden="true" />
          <span className="text-sm font-semibold">OonSystems · Plataforma</span>
        </header>
        <main className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
          <Outlet context={{ clientes, planos, alertas, carregando, recarregar } satisfies DadosPlataforma} />
        </main>
      </div>
    </div>
  )
}
