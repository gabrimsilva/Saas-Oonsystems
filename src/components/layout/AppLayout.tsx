import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronRight, LogOut, PanelLeftClose, PanelLeftOpen, Store } from "lucide-react"
import MobileAdminHeader from "../MobileAdminHeader"
import { useConfig } from "@/contexts/ConfigContext"
import { usePermissoes } from "@/hooks/usePermissoes"
import { useEstabelecimento } from "@/contexts/EstabelecimentoContext"
import { configuracaoService } from "@/services"
import SeletorEstabelecimento from "@/components/estabelecimento/SeletorEstabelecimento"
import AvisoTeste from "@/components/AvisoTeste"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import MenuLateral from "./MenuLateral"
import MenuUsuario from "./MenuUsuario"
import { filtrarMenu, localizarPagina } from "./navegacao"
import { BotaoBusca, BuscaGlobal, useAtalhoBusca } from "./BuscaGlobal"
import { useAplicarTema } from "@/hooks/useTema"

interface AppLayoutProps {
  children: React.ReactNode
  onLogout?: () => void
  /** Mantido por compatibilidade (o catálogo agora abre pelo menu do usuário) */
  onToggleView?: () => void
  currentPage?: string
}

const CHAVE_RECOLHIDO = "oonsystems_menu_recolhido"

/** Logo e nome da loja (configurados em Configurações), por estabelecimento */
function useMarcaDaLoja() {
  const { logoUrl: logoGlobal, nomeEstabelecimento: nomeGlobal } = useConfig()
  const { estabelecimentoAtual } = useEstabelecimento()
  const [logoUrl, setLogoUrl] = useState("")
  const [nome, setNome] = useState("")

  useEffect(() => {
    let ativo = true
    const estabId = estabelecimentoAtual?.id
    if (!estabId) {
      setLogoUrl("")
      setNome("")
      return
    }
    // Garante leitura fresca do estabelecimento ativo (evita cache de outro tenant)
    configuracaoService.limparCache()
    Promise.all([
      configuracaoService.buscarPorChave("logo_url").catch(() => null),
      configuracaoService.buscarPorChave("nome_loja").catch(() => null),
    ]).then(([logo, nomeLoja]) => {
      if (!ativo) return
      setLogoUrl(logo?.valor || logoGlobal || "")
      setNome(nomeLoja?.valor || estabelecimentoAtual?.nome || nomeGlobal || "")
    })
    return () => { ativo = false }
  }, [estabelecimentoAtual?.id, estabelecimentoAtual?.nome, logoGlobal, nomeGlobal])

  return { logoUrl, nome }
}

export function MarcaDaLoja({ logoUrl, nome, compacta = false }: { logoUrl: string; nome: string; compacta?: boolean }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", compacta && "justify-center")}>
      {logoUrl ? (
        <img src={logoUrl} alt="" className="size-9 shrink-0 rounded-lg border border-border bg-card object-cover" />
      ) : (
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Store className="size-[18px]" />
        </div>
      )}
      {!compacta && (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold text-foreground" title={nome}>{nome || "Minha loja"}</p>
          <p className="text-xs text-muted-foreground">Painel de gestão</p>
        </div>
      )}
    </div>
  )
}

export default function AppLayout({ children, onLogout, currentPage = "dashboard" }: AppLayoutProps) {
  const navigate = useNavigate()
  const { podeAcessarPagina } = usePermissoes()
  const { logoUrl, nome } = useMarcaDaLoja()
  const [recolhido, setRecolhido] = useState(() => {
    try { return localStorage.getItem(CHAVE_RECOLHIDO) === "1" } catch { return false }
  })

  const grupos = useMemo(() => filtrarMenu(podeAcessarPagina), [podeAcessarPagina])
  const { titulo, trilha } = localizarPagina(currentPage)

  const alternarRecolhido = () => {
    setRecolhido((v) => {
      try { localStorage.setItem(CHAVE_RECOLHIDO, v ? "0" : "1") } catch { /* sem storage */ }
      return !v
    })
  }

  const navegar = (pagina: string) => navigate(`/sistema/${pagina}`)
  useAplicarTema()
  const [buscaAberta, setBuscaAberta] = useState(false)
  const abrirBusca = useCallback(() => setBuscaAberta(true), [])
  useAtalhoBusca(abrirBusca)

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Menu lateral (desktop) */}
      <aside
        className={cn(
          "hidden md:flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out",
          recolhido ? "w-16" : "w-64",
        )}
      >
        <div className={cn("flex h-14 shrink-0 items-center border-b border-sidebar-border", recolhido ? "justify-center px-2" : "px-4")}>
          <MarcaDaLoja logoUrl={logoUrl} nome={nome} compacta={recolhido} />
        </div>

        <div className={cn("min-h-0 flex-1 overflow-y-auto py-4", recolhido ? "px-2" : "px-3")}>
          <MenuLateral grupos={grupos} paginaAtual={currentPage} onNavegar={navegar} recolhido={recolhido} />
        </div>

        <div className={cn("shrink-0 space-y-0.5 border-t border-sidebar-border p-2", recolhido && "flex flex-col items-center")}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={alternarRecolhido}
                className={cn(
                  "flex h-9 items-center gap-3 rounded-md text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                  recolhido ? "w-9 justify-center" : "w-full px-3",
                )}
                aria-label={recolhido ? "Expandir menu" : "Recolher menu"}
              >
                {recolhido ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
                {!recolhido && <span>Recolher menu</span>}
              </button>
            </TooltipTrigger>
            {recolhido && <TooltipContent side="right" sideOffset={8}>Expandir menu</TooltipContent>}
          </Tooltip>
          {onLogout && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onLogout}
                  className={cn(
                    "flex h-9 items-center gap-3 rounded-md text-sm font-medium text-muted-foreground hover:bg-destructive/5 hover:text-destructive",
                    recolhido ? "w-9 justify-center" : "w-full px-3",
                  )}
                  aria-label="Sair"
                >
                  <LogOut className="size-[18px]" />
                  {!recolhido && <span>Sair</span>}
                </button>
              </TooltipTrigger>
              {recolhido && <TooltipContent side="right" sideOffset={8}>Sair</TooltipContent>}
            </Tooltip>
          )}
          {!recolhido && (
            <p className="flex items-center gap-1.5 px-3 pt-2 pb-1 text-[11px] text-muted-foreground">
              <img src="/logo-oonsystems-simbolo.png" alt="" className="h-3 w-auto" aria-hidden="true" />
              por OonSystems
            </p>
          )}
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <MobileAdminHeader onLogout={onLogout} currentPage={currentPage} onBuscar={abrirBusca} />
        <BuscaGlobal aberto={buscaAberta} onAbertoChange={setBuscaAberta} />

        {/* Topo (desktop): título/trilha, estabelecimento e usuário */}
        <header className="hidden h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-6 md:flex">
          <div className="min-w-0">
            {trilha.length > 0 && (
              <nav aria-label="Trilha" className="flex items-center gap-1 text-xs text-muted-foreground">
                {trilha.map((parte, i) => (
                  <span key={parte} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight className="size-3" aria-hidden="true" />}
                    {parte}
                  </span>
                ))}
              </nav>
            )}
            <p className="truncate text-[15px] font-semibold leading-tight text-foreground">{titulo}</p>
          </div>
          <div className="flex items-center gap-2">
            <BotaoBusca onClick={abrirBusca} className="w-56" />
            <SeletorEstabelecimento />
            <div className="mx-1 h-6 w-px bg-border" aria-hidden="true" />
            <MenuUsuario onSair={onLogout} />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto pt-14 md:pt-0">
          <AvisoTeste />
          {children}
        </div>
      </main>
    </div>
  )
}
