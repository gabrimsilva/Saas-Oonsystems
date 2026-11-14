import { useEffect, useState } from "react"
import { ArrowLeft, Loader2, Package, Phone, RefreshCw, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { lojaOnlineService, type MeuPedidoCatalogo } from "@/services/lojaOnlineService"
import { useEstabelecimentoPublico } from "@/contexts/EstabelecimentoPublicoContext"
import { formatarReais } from "@/components/catalogo/precos"
import { FORMA_PAGAMENTO_LABEL } from "@/components/catalogo/whatsappPedido"

const INTERVALO_ATUALIZACAO_MS = 30000
const CHAVE_TELEFONE = "catalogo:meus-pedidos:telefone"

function formatarTelefone(valor: string) {
  const d = valor.replace(/\D/g, "").slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ""
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** Etapa do pedido para o cliente, na ordem do Kanban da loja */
function situacao(p: MeuPedidoCatalogo): { rotulo: string; classe: string } {
  if (p.cancelado || p.status_pedido === "Cancelado") {
    return { rotulo: "Cancelado", classe: "bg-muted text-muted-foreground" }
  }
  switch (p.status_pedido) {
    case "Aguardando pagamento":
      return { rotulo: "Aguardando pagamento", classe: "bg-warning/15 text-warning-foreground" }
    case "Pedido criado":
      return { rotulo: "Recebido pela loja", classe: "bg-primary/10 text-primary" }
    case "Preparando":
      return { rotulo: "Em separação", classe: "bg-warning/15 text-warning-foreground" }
    case "Liberado":
      return { rotulo: "Pronto para retirada", classe: "bg-success/15 text-success" }
    case "Finalizado":
      return { rotulo: "Entregue", classe: "bg-success/15 text-success" }
    default:
      return { rotulo: p.status_pedido, classe: "bg-muted text-foreground" }
  }
}

function lerTelefoneSalvo() {
  try { return localStorage.getItem(CHAVE_TELEFONE) ?? "" } catch { return "" }
}

/** "Meus pedidos" do catálogo: o cliente consulta os pedidos desta loja pelo telefone. */
export default function MeusPedidosCatalogo() {
  const { estabelecimento } = useEstabelecimentoPublico()
  const [telefone, setTelefone] = useState(() => formatarTelefone(lerTelefoneSalvo()))
  const [buscado, setBuscado] = useState<string | null>(null)
  const [pedidos, setPedidos] = useState<MeuPedidoCatalogo[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const buscar = async (digitos: string, silencioso = false) => {
    if (!estabelecimento) return
    if (!silencioso) { setCarregando(true); setErro(null) }
    try {
      const lista = await lojaOnlineService.buscarMeusPedidos(estabelecimento.id, digitos)
      setPedidos(lista)
      setBuscado(digitos)
      try { localStorage.setItem(CHAVE_TELEFONE, digitos) } catch { /* sem armazenamento */ }
    } catch (e) {
      if (!silencioso) setErro(e instanceof Error ? e.message : "Não foi possível buscar seus pedidos.")
    } finally {
      if (!silencioso) setCarregando(false)
    }
  }

  const enviar = (e: React.FormEvent) => {
    e.preventDefault()
    const digitos = telefone.replace(/\D/g, "")
    if (digitos.length < 10) { setErro("Informe o telefone com DDD."); return }
    buscar(digitos)
  }

  // Telefone já usado neste aparelho: busca direto
  useEffect(() => {
    const salvo = lerTelefoneSalvo()
    if (estabelecimento && salvo.length >= 10 && buscado === null) buscar(salvo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estabelecimento])

  // Atualiza sozinho enquanto houver pedido em andamento
  useEffect(() => {
    if (!buscado) return
    const emAndamento = pedidos.some(p => !p.cancelado && p.status_pedido !== "Finalizado")
    if (!emAndamento) return
    const t = setInterval(() => buscar(buscado, true), INTERVALO_ATUALIZACAO_MS)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscado, pedidos])

  const voltar = () => { window.location.href = estabelecimento ? `/${estabelecimento.slug}` : "/" }

  return (
    <div className="min-h-screen bg-muted/50 py-6 px-4">
      <main className="max-w-2xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={voltar} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao catálogo
        </Button>

        <section className="bg-card rounded-xl border border-border p-5 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" /> Meus pedidos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Digite o telefone usado no pedido para acompanhar o andamento{estabelecimento?.nome ? ` em ${estabelecimento.nome}` : ""}.
          </p>
          <form onSubmit={enviar} className="mt-4 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Phone className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(00) 00000-0000"
                value={telefone}
                onChange={e => setTelefone(formatarTelefone(e.target.value))}
                className="pl-9 h-11"
                aria-label="Telefone"
              />
            </div>
            <Button type="submit" className="h-11" disabled={carregando || !estabelecimento}>
              {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Buscar
            </Button>
          </form>
          {erro && <p className="text-sm text-destructive mt-3" role="alert">{erro}</p>}
        </section>

        {buscado && !carregando && pedidos.length === 0 && !erro && (
          <p className="text-center text-muted-foreground py-8">
            Nenhum pedido encontrado para este telefone nos últimos 90 dias.
          </p>
        )}

        {pedidos.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {pedidos.length} {pedidos.length === 1 ? "pedido" : "pedidos"}
            </p>
            <Button variant="outline" size="sm" onClick={() => buscado && buscar(buscado)} disabled={carregando}>
              <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
            </Button>
          </div>
        )}

        <ul className="space-y-3">
          {pedidos.map(p => {
            const s = situacao(p)
            const conteudo = (
              <>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">
                      Pedido <span className="font-mono">#{p.codigo_pedido}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(p.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                      {" · "}{FORMA_PAGAMENTO_LABEL[p.forma_pagamento] ?? p.forma_pagamento}
                      {p.tipo_venda === "atacado" && " · Atacado"}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${s.classe}`}>
                    {s.rotulo}
                  </span>
                </div>
                <ul className="mt-3 space-y-1 text-sm">
                  {p.itens.map((i, idx) => (
                    <li key={idx} className="flex justify-between gap-3">
                      <span className="text-foreground min-w-0 break-words">
                        <span className="font-semibold tabular-nums">{i.quantidade}x</span> {i.nome}
                      </span>
                      <span className="tabular-nums whitespace-nowrap text-muted-foreground">{formatarReais(i.subtotal)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 pt-3 border-t border-border flex justify-between items-baseline">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="font-bold text-foreground tabular-nums">{formatarReais(p.total)}</span>
                </div>
              </>
            )
            return (
              <li key={`${p.codigo_pedido}-${p.criado_em}`}>
                {p.pedido_id && estabelecimento ? (
                  <a
                    href={`/${estabelecimento.slug}/pedido/${p.pedido_id}`}
                    className="block bg-card rounded-xl border border-border p-4 hover:border-primary/40 transition-colors"
                  >
                    {conteudo}
                  </a>
                ) : (
                  <div className="bg-card rounded-xl border border-border p-4">{conteudo}</div>
                )}
              </li>
            )
          })}
        </ul>
      </main>
    </div>
  )
}
