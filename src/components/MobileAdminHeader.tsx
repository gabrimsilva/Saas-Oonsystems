import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { LogOut, Menu, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { configuracaoService } from "@/services"
import { usePermissoes } from "@/hooks/usePermissoes"
import { useEstabelecimento } from "@/contexts/EstabelecimentoContext"
import IndicadorEstabelecimento from "@/components/estabelecimento/IndicadorEstabelecimento"
import MenuLateral from "@/components/layout/MenuLateral"
import { Avatar } from "@/components/layout/MenuUsuario"
import { filtrarMenu, localizarPagina } from "@/components/layout/navegacao"

interface MobileAdminHeaderProps {
  onLogout?: () => void
  /** Mantido por compatibilidade */
  onToggleView?: () => void
  currentPage?: string
  /** Abre a busca global */
  onBuscar?: () => void
}

/** Topo e menu do sistema no celular (o menu é o mesmo do desktop). */
export default function MobileAdminHeader({ onLogout, currentPage = "dashboard", onBuscar }: MobileAdminHeaderProps) {
  const navigate = useNavigate()
  const { podeAcessarPagina } = usePermissoes()
  const { estabelecimentoAtual, usuario } = useEstabelecimento()
  const [nomeEstabelecimento, setNomeEstabelecimento] = useState("")
  const [aberto, setAberto] = useState(false)

  const grupos = useMemo(() => filtrarMenu(podeAcessarPagina), [podeAcessarPagina])
  const { titulo } = localizarPagina(currentPage)

  useEffect(() => {
    let ativo = true
    configuracaoService
      .buscarPorChave("nome_loja")
      .then((config) => ativo && setNomeEstabelecimento(config?.valor || estabelecimentoAtual?.nome || ""))
      .catch(() => ativo && setNomeEstabelecimento(estabelecimentoAtual?.nome || ""))
    return () => { ativo = false }
  }, [estabelecimentoAtual?.id, estabelecimentoAtual?.nome])

  const navegar = (pagina: string) => {
    navigate(`/sistema/${pagina}`)
    setAberto(false)
  }

  const nomeUsuario = usuario?.nome || usuario?.email || "Usuário"

  return (
    <div className="md:hidden fixed inset-x-0 top-0 z-40 h-14 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
      <div className="flex h-full items-center gap-2 px-3">
        <Sheet open={aberto} onOpenChange={setAberto}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Abrir menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-[300px] max-w-[85vw] flex-col gap-0 p-0">
            <div className="border-b border-border px-4 py-4 pr-12">
              <SheetTitle className="truncate text-base">{nomeEstabelecimento || "Menu"}</SheetTitle>
              <SheetDescription className="text-xs">Painel de gestão</SheetDescription>
              <div className="mt-3">
                <IndicadorEstabelecimento />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
              <MenuLateral grupos={grupos} paginaAtual={currentPage} onNavegar={navegar} />
            </div>

            <div className="border-t border-border p-3">
              <div className="mb-2 flex items-center gap-3 px-1">
                <Avatar nome={nomeUsuario} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{nomeUsuario}</p>
                  {usuario?.email && <p className="truncate text-xs text-muted-foreground">{usuario.email}</p>}
                </div>
              </div>
              {onLogout && (
                <button
                  type="button"
                  onClick={() => { setAberto(false); onLogout() }}
                  className="flex h-9 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-destructive hover:bg-destructive/5"
                >
                  <LogOut className="size-[18px]" /> Sair
                </button>
              )}
            </div>
          </SheetContent>
        </Sheet>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{titulo}</p>
          {nomeEstabelecimento && <p className="truncate text-xs text-muted-foreground">{nomeEstabelecimento}</p>}
        </div>
        {onBuscar && (
          <Button variant="ghost" size="icon" onClick={onBuscar} aria-label="Buscar telas e produtos">
            <Search className="size-5" />
          </Button>
        )}
        <Avatar nome={nomeUsuario} />
      </div>
    </div>
  )
}
