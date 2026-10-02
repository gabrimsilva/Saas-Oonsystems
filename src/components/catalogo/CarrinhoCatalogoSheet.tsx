import { useEffect, useMemo, useState } from "react"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Banknote, CreditCard, Loader2, Minus, Plus, QrCode, ShoppingBag, Trash2, Wallet } from "lucide-react"
import type { ProdutoCatalogo } from "@/components/delivery/CatalogoProdutoCard"
import { chaveItem, type ItemCarrinhoCatalogo } from "@/hooks/useCarrinhoCatalogo"
import { disponivelParaCompra, formatarReais, precoUnitario } from "./precos"
import {
  lojaOnlineService,
  type ConfigCatalogoPublica,
  type FormaPagamentoPedido,
  type TipoVenda
} from "@/services/lojaOnlineService"
import { chaveLocalDoEstabelecimento } from "@/services/tenant"
import { formatarTelefone } from "@/utils/formatacao"
import { linkWhatsAppLoja, montarMensagemPedido, salvarTelefoneLoja } from "./whatsappPedido"

interface CarrinhoCatalogoSheetProps {
  aberto: boolean
  onMudarAberto: (aberto: boolean) => void
  estabelecimentoId: string
  slug: string
  itens: ItemCarrinhoCatalogo[]
  produtos: Map<string, ProdutoCatalogo>
  modo: TipoVenda
  config: ConfigCatalogoPublica
  /** Formas aceitas na retirada/entrega (Configurações > Pagamento), usadas sem pagamento online */
  formasNaEntrega: FormaPagamentoPedido[]
  /** WhatsApp da loja: recebe o resumo do pedido quando não há pagamento online */
  whatsappLoja: string
  onAlterarQuantidade: (chave: string, quantidade: number) => void
  onRemover: (chave: string) => void
  onPedidoCriado: () => void
}

type OpcaoForma = { id: FormaPagamentoPedido; titulo: string; detalhe: string; icone: typeof QrCode }

const OPCOES: Record<FormaPagamentoPedido, OpcaoForma> = {
  pix: { id: "pix", titulo: "PIX", detalhe: "", icone: QrCode },
  dinheiro: { id: "dinheiro", titulo: "Dinheiro", detalhe: "", icone: Banknote },
  cartao_debito: { id: "cartao_debito", titulo: "Cartão de débito", detalhe: "", icone: Wallet },
  cartao_credito: { id: "cartao_credito", titulo: "Cartão de crédito", detalhe: "", icone: CreditCard },
}

function lerCliente(chave: string) {
  try {
    const salvo = JSON.parse(localStorage.getItem(chave) || "{}")
    return { nome: salvo.nome || "", telefone: salvo.telefone || "", email: salvo.email || "" }
  } catch {
    return { nome: "", telefone: "", email: "" }
  }
}

export default function CarrinhoCatalogoSheet({
  aberto,
  onMudarAberto,
  estabelecimentoId,
  slug,
  itens,
  produtos,
  modo,
  config,
  formasNaEntrega,
  whatsappLoja,
  onAlterarQuantidade,
  onRemover,
  onPedidoCriado,
}: CarrinhoCatalogoSheetProps) {
  const chaveCliente = chaveLocalDoEstabelecimento("cliente_catalogo", estabelecimentoId)
  const [etapa, setEtapa] = useState<"carrinho" | "dados">("carrinho")
  const [cliente, setCliente] = useState(() => lerCliente(chaveCliente))
  const [observacoes, setObservacoes] = useState("")
  const [forma, setForma] = useState<FormaPagamentoPedido | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const pagamentoOnline = config.pagamento_online
  const formasAtivas = useMemo<OpcaoForma[]>(() => {
    if (!pagamentoOnline) return formasNaEntrega.map(f => OPCOES[f])
    return [
      ...(config.pix ? [{ ...OPCOES.pix, detalhe: "Aprovação na hora" }] : []),
      ...(config.credito
        ? [{ ...OPCOES.cartao_credito, detalhe: config.max_parcelas > 1 ? `Em até ${config.max_parcelas}x` : "À vista" }]
        : []),
      ...(config.debito ? [{ ...OPCOES.cartao_debito, detalhe: "Débito online" }] : []),
    ]
  }, [pagamentoOnline, formasNaEntrega, config.pix, config.credito, config.debito, config.max_parcelas])

  useEffect(() => {
    if (!aberto) {
      setEtapa("carrinho")
      setErro(null)
    }
  }, [aberto])

  useEffect(() => {
    if ((!forma || !formasAtivas.some(f => f.id === forma)) && formasAtivas.length > 0) setForma(formasAtivas[0].id)
  }, [forma, formasAtivas])

  const linhas = useMemo(
    () =>
      itens
        .map(item => {
          const produto = produtos.get(item.produtoId)
          if (!produto) return null
          const unitario = precoUnitario(produto, modo)
          return {
            item,
            chave: chaveItem(item),
            produto,
            unitario,
            total: unitario * item.quantidade,
            disponivel: disponivelParaCompra(produto, item.varianteId),
          }
        })
        .filter((l): l is NonNullable<typeof l> => l !== null),
    [itens, produtos, modo]
  )

  const total = linhas.reduce((soma, l) => soma + l.total, 0)
  const faltaAtacado = modo === "atacado" ? Math.max(config.atacado_pedido_minimo - total, 0) : 0
  const excedeEstoque = linhas.some(l => l.disponivel !== null && l.item.quantidade > l.disponivel)
  const temItemSemPreco = linhas.some(l => l.unitario <= 0)
  const podeAvancar = linhas.length > 0 && faltaAtacado <= 0 && !excedeEstoque && !temItemSemPreco

  const telefoneDigitos = cliente.telefone.replace(/\D/g, "")
  const email = cliente.email.trim()
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
  const dadosValidos =
    cliente.nome.trim().split(/\s+/).length >= 2 &&
    telefoneDigitos.length >= 10 &&
    // E-mail é exigido pelo Mercado Pago; sem pagamento online é opcional
    (pagamentoOnline ? emailValido : !email || emailValido) &&
    !!forma

  const finalizar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dadosValidos || !forma || enviando) return
    setEnviando(true)
    setErro(null)
    // A aba do WhatsApp precisa ser aberta ainda dentro do clique (senão o
    // navegador bloqueia); ela recebe a mensagem depois que o pedido é criado.
    const enviarNoWhatsApp = !pagamentoOnline && linkWhatsAppLoja(whatsappLoja, "") !== null
    const janelaWhatsApp = enviarNoWhatsApp ? window.open("", "_blank") : null
    try {
      try {
        localStorage.setItem(chaveCliente, JSON.stringify(cliente))
      } catch {
        /* sem storage */
      }
      const pedido = await lojaOnlineService.criarPedido({
        estabelecimento_id: estabelecimentoId,
        tipo_venda: modo,
        forma_pagamento: forma,
        cliente: { nome: cliente.nome.trim(), telefone: telefoneDigitos, email: email || undefined },
        itens: linhas.map(l => ({
          produto_id: l.item.produtoId,
          variante_id: l.item.varianteId,
          quantidade: l.item.quantidade,
        })),
        observacoes: observacoes.trim() || undefined,
      })
      onPedidoCriado()
      salvarTelefoneLoja(estabelecimentoId, whatsappLoja)
      if (pedido.resumo) {
        const link = linkWhatsAppLoja(whatsappLoja, montarMensagemPedido(pedido.resumo))
        if (link && janelaWhatsApp && !janelaWhatsApp.closed) janelaWhatsApp.location.href = link
      }
      window.location.href = pedido.checkout_url ?? `/${slug}/pedido/${pedido.pedido_id}`
    } catch (err) {
      janelaWhatsApp?.close()
      setErro(err instanceof Error ? err.message : "Não foi possível criar o pedido.")
      setEnviando(false)
    }
  }

  return (
    <Sheet open={aberto} onOpenChange={onMudarAberto}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 gap-0">
        <SheetHeader className="border-b pr-12">
          <SheetTitle className="flex items-center gap-2 text-lg">
            {etapa === "dados" && (
              <button
                type="button"
                onClick={() => setEtapa("carrinho")}
                className="p-1 -ml-1 rounded-full hover:bg-accent cursor-pointer"
                aria-label="Voltar ao carrinho"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            {etapa === "carrinho" ? "Seu carrinho" : "Finalizar pedido"}
            {modo === "atacado" && (
              <span className="ml-auto text-xs font-semibold uppercase tracking-wide text-primary bg-primary/5 px-2 py-0.5 rounded-full">
                Atacado
              </span>
            )}
          </SheetTitle>
          <SheetDescription>
            {etapa === "carrinho"
              ? `${linhas.length} ${linhas.length === 1 ? "item" : "itens"}`
              : pagamentoOnline
                ? "Informe seus dados e a forma de pagamento"
                : "Informe seus dados e como prefere pagar"}
          </SheetDescription>
        </SheetHeader>

        {etapa === "carrinho" ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {linhas.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  <ShoppingBag className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p>Seu carrinho está vazio.</p>
                </div>
              )}
              {linhas.map(l => (
                <div key={l.chave} className="flex gap-3 border border-border rounded-xl p-3">
                  <img
                    src={l.produto.urlImagem}
                    alt=""
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-food.svg" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground leading-tight">{l.produto.nome}</p>
                    {l.item.varianteNome && <p className="text-xs text-muted-foreground">{l.item.varianteNome}</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">{formatarReais(l.unitario)} / un.</p>
                    {l.unitario <= 0 && (
                      <p className="text-xs text-destructive font-medium mt-1" role="alert">
                        Indisponível para pedido online. Remova este item.
                      </p>
                    )}
                    {l.disponivel !== null && l.item.quantidade > l.disponivel && (
                      <p className="text-xs text-destructive font-medium mt-1" role="alert">
                        {l.disponivel > 0 ? `Só temos ${l.disponivel} em estoque.` : "Esgotado. Remova este item."}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0 rounded-full"
                          onClick={() => onAlterarQuantidade(l.chave, l.item.quantidade - 1)}
                          aria-label={`Diminuir ${l.produto.nome}`}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium tabular-nums">{l.item.quantidade}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0 rounded-full"
                          onClick={() => onAlterarQuantidade(l.chave, l.item.quantidade + 1)}
                          disabled={l.disponivel !== null && l.item.quantidade >= l.disponivel}
                          aria-label={`Aumentar ${l.produto.nome}`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                        <button
                          type="button"
                          onClick={() => onRemover(l.chave)}
                          className="ml-1 p-1.5 text-muted-foreground/70 hover:text-destructive rounded-full cursor-pointer"
                          aria-label={`Remover ${l.produto.nome}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <span className="font-bold text-sm text-foreground tabular-nums">{formatarReais(l.total)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {linhas.length > 0 && (
              <SheetFooter className="border-t bg-muted/50">
                {faltaAtacado > 0 && (
                  <p className="text-sm text-warning-foreground bg-warning/10 border border-warning/30 rounded-lg p-2.5" role="status">
                    Pedido mínimo no atacado: {formatarReais(config.atacado_pedido_minimo)}. Faltam{" "}
                    <strong>{formatarReais(faltaAtacado)}</strong>.
                  </p>
                )}
                <div className="flex justify-between items-baseline">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-2xl font-bold text-foreground tabular-nums">{formatarReais(total)}</span>
                </div>
                <Button
                  onClick={() => setEtapa("dados")}
                  disabled={!podeAvancar}
                  className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary-hover text-white cursor-pointer"
                >
                  Continuar
                </Button>
              </SheetFooter>
            )}
          </>
        ) : (
          <form onSubmit={finalizar} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="cat-nome">Nome completo</Label>
                <Input
                  id="cat-nome"
                  autoComplete="name"
                  value={cliente.nome}
                  onChange={(e) => setCliente(c => ({ ...c, nome: e.target.value }))}
                  maxLength={100}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat-telefone">WhatsApp</Label>
                <Input
                  id="cat-telefone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="(41) 99999-9999"
                  value={cliente.telefone}
                  onChange={(e) => setCliente(c => ({ ...c, telefone: formatarTelefone(e.target.value) }))}
                  maxLength={15}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat-email">E-mail{!pagamentoOnline && " (opcional)"}</Label>
                <Input
                  id="cat-email"
                  type="email"
                  autoComplete="email"
                  value={cliente.email}
                  onChange={(e) => setCliente(c => ({ ...c, email: e.target.value }))}
                  maxLength={120}
                  required={pagamentoOnline}
                />
                {pagamentoOnline && (
                  <p className="text-xs text-muted-foreground">O comprovante do pagamento é enviado para este e-mail.</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat-obs">Observações (opcional)</Label>
                <textarea
                  id="cat-obs"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  maxLength={500}
                  rows={2}
                  className="w-full px-3 py-2 border border-input bg-background text-sm rounded-md resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium mb-2">
                  {pagamentoOnline ? "Forma de pagamento" : "Como prefere pagar na retirada/entrega?"}
                </legend>
                {formasAtivas.map(f => {
                  const Icone = f.icone
                  return (
                    <label
                      key={f.id}
                      className={`flex items-center gap-3 border rounded-xl p-3 cursor-pointer transition-colors ${
                        forma === f.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                      }`}
                    >
                      <input
                        type="radio"
                        name="forma-pagamento"
                        value={f.id}
                        checked={forma === f.id}
                        onChange={() => setForma(f.id)}
                        className="accent-primary"
                      />
                      <Icone className="h-5 w-5 text-primary" aria-hidden="true" />
                      <span className="flex-1">
                        <span className="block text-sm font-medium text-foreground">{f.titulo}</span>
                        {f.detalhe && <span className="block text-xs text-muted-foreground">{f.detalhe}</span>}
                      </span>
                    </label>
                  )
                })}
              </fieldset>
            </div>

            <SheetFooter className="border-t bg-muted/50">
              {erro && (
                <p className="text-sm text-destructive bg-destructive/5 border border-destructive/30 rounded-lg p-2.5" role="alert">
                  {erro}
                </p>
              )}
              <div className="flex justify-between items-baseline">
                <span className="text-muted-foreground">Total</span>
                <span className="text-2xl font-bold text-foreground tabular-nums">{formatarReais(total)}</span>
              </div>
              <Button
                type="submit"
                disabled={!dadosValidos || enviando}
                className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary-hover text-white cursor-pointer"
              >
                {enviando ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" /> {pagamentoOnline ? "Gerando pagamento..." : "Enviando pedido..."}
                  </>
                ) : pagamentoOnline ? (
                  "Ir para o pagamento"
                ) : (
                  "Enviar pedido"
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                {pagamentoOnline
                  ? "Você será levado ao ambiente seguro do Mercado Pago."
                  : "Nada é cobrado agora. O pedido também é enviado para o WhatsApp da loja."}
              </p>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
