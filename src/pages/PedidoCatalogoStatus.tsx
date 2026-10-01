import { useCallback, useEffect, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import { CheckCircle2, Clock, Loader2, XCircle, ArrowLeft, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { lojaOnlineService, type StatusPedidoCatalogo } from "@/services/lojaOnlineService"
import { useEstabelecimentoPublico } from "@/contexts/EstabelecimentoPublicoContext"
import { formatarReais } from "@/components/catalogo/precos"
import {
  FORMA_PAGAMENTO_LABEL,
  lerTelefoneLoja,
  linkWhatsAppLoja,
  montarMensagemPedido
} from "@/components/catalogo/whatsappPedido"

const INTERVALO_MS = 5000
const MAX_TENTATIVAS = 36 // ~3 minutos aguardando o PIX / aprovação

type Situacao = "recebido" | "aprovado" | "aguardando" | "recusado" | "cancelado"

function situacaoDo(pedido: StatusPedidoCatalogo): Situacao {
  if (pedido.status_pagamento === "approved" && !pedido.cancelado) return "aprovado"
  if (pedido.cancelado) return "cancelado"
  // Loja sem cobrança online: o pagamento acontece na retirada/entrega
  if (!pedido.pagamento_online) return "recebido"
  if (["rejected", "valor_divergente"].includes(pedido.status_pagamento ?? "")) return "recusado"
  return "aguardando"
}

/**
 * Página para onde o Mercado Pago devolve o cliente após o pagamento (ou para
 * onde o catálogo leva o cliente quando a loja não cobra online).
 * Consulta o status no servidor, que também confirma o pagamento.
 */
export default function PedidoCatalogoStatus() {
  const { pedidoId } = useParams<{ pedidoId: string }>()
  const { estabelecimento } = useEstabelecimentoPublico()
  const [pedido, setPedido] = useState<StatusPedidoCatalogo | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const tentativas = useRef(0)

  const consultar = useCallback(async () => {
    if (!pedidoId) return
    try {
      const dados = await lojaOnlineService.consultarPedido(pedidoId)
      setPedido(dados)
      setErro(null)
      return dados
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível consultar o pedido.")
    }
  }, [pedidoId])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    let ativo = true
    const ciclo = async () => {
      const dados = await consultar()
      tentativas.current += 1
      if (ativo && dados && situacaoDo(dados) === "aguardando" && tentativas.current < MAX_TENTATIVAS) {
        timer = setTimeout(ciclo, INTERVALO_MS)
      }
    }
    ciclo()
    return () => {
      ativo = false
      if (timer) clearTimeout(timer)
    }
  }, [consultar])

  const voltar = () => { window.location.href = estabelecimento ? `/${estabelecimento.slug}` : "/" }

  if (!pedido) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          {erro ? (
            <>
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
              <p className="text-gray-800 font-medium mb-4">{erro}</p>
              <Button onClick={voltar} variant="outline">Voltar ao catálogo</Button>
            </>
          ) : (
            <>
              <Loader2 className="h-10 w-10 text-purple-600 animate-spin mx-auto mb-3" />
              <p className="text-gray-600">Consultando seu pedido...</p>
            </>
          )}
        </div>
      </div>
    )
  }

  const situacao = situacaoDo(pedido)
  const linkWhatsApp =
    (situacao === "recebido" || situacao === "aprovado") && estabelecimento
      ? linkWhatsAppLoja(
          lerTelefoneLoja(estabelecimento.id),
          montarMensagemPedido({
            ...pedido,
            itens: pedido.itens.map(i => ({ nome: i.nome, quantidade: i.quantidade, subtotal: i.subtotal })),
          })
        )
      : null
  const cabecalho = {
    recebido: {
      icone: <CheckCircle2 className="h-14 w-14 text-green-600" />,
      titulo: "Pedido enviado!",
      texto: "Recebemos seu pedido. Se o WhatsApp não abriu, toque no botão abaixo para enviar o resumo para a loja. O pagamento é feito na retirada/entrega.",
    },
    aprovado: {
      icone: <CheckCircle2 className="h-14 w-14 text-green-600" />,
      titulo: "Pagamento aprovado!",
      texto: "Recebemos seu pedido e já vamos preparar. Você receberá o contato da loja pelo WhatsApp.",
    },
    aguardando: {
      icone: <Clock className="h-14 w-14 text-amber-500" />,
      titulo: "Aguardando pagamento",
      texto:
        pedido.forma_pagamento === "pix"
          ? "Assim que o PIX for pago, esta página atualiza sozinha."
          : "Estamos aguardando a confirmação do pagamento.",
    },
    recusado: {
      icone: <XCircle className="h-14 w-14 text-red-500" />,
      titulo: "Pagamento não aprovado",
      texto: "Nenhum valor foi cobrado. Você pode tentar novamente com outro cartão ou forma de pagamento.",
    },
    cancelado: {
      icone: <XCircle className="h-14 w-14 text-gray-400" />,
      titulo: "Pedido cancelado",
      texto: "Este pedido foi cancelado. Em caso de dúvida, fale com a loja.",
    },
  }[situacao]

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <main className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 text-center border-b border-gray-100">
          <div className="flex justify-center mb-3">{cabecalho.icone}</div>
          <h1 className="text-2xl font-bold text-gray-900">{cabecalho.titulo}</h1>
          <p className="text-sm text-gray-600 mt-2" role="status">{cabecalho.texto}</p>
          <p className="mt-4 text-sm text-gray-500">
            Pedido <strong className="text-gray-900 font-mono">#{pedido.codigo_pedido}</strong>
            {pedido.tipo_venda === "atacado" && " · Atacado"}
            {" · "}{FORMA_PAGAMENTO_LABEL[pedido.forma_pagamento] ?? pedido.forma_pagamento}
          </p>
        </div>

        <ul className="divide-y divide-gray-100">
          {pedido.itens.map((item, i) => (
            <li key={i} className="flex justify-between gap-4 px-6 py-3 text-sm">
              <span className="text-gray-800">
                <span className="font-semibold tabular-nums">{item.quantidade}x</span> {item.nome}
              </span>
              <span className="text-gray-900 font-medium tabular-nums whitespace-nowrap">{formatarReais(item.subtotal)}</span>
            </li>
          ))}
        </ul>

        <div className="px-6 py-4 bg-gray-50 flex justify-between items-baseline">
          <span className="text-gray-600">Total</span>
          <span className="text-xl font-bold text-gray-900 tabular-nums">{formatarReais(pedido.total)}</span>
        </div>

        <div className="p-6 space-y-3">
          {linkWhatsApp && (
            <Button
              asChild
              className="w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-700 text-white"
            >
              <a href={linkWhatsApp} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-5 w-5" /> Enviar pedido pelo WhatsApp
              </a>
            </Button>
          )}
          {(situacao === "aguardando" || situacao === "recusado") && pedido.checkout_url && (
            <Button
              onClick={() => { window.location.href = pedido.checkout_url! }}
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              {situacao === "recusado" ? "Tentar pagar novamente" : "Ir para o pagamento"}
            </Button>
          )}
          {situacao === "aguardando" && (
            <Button variant="outline" className="w-full" onClick={() => { tentativas.current = 0; consultar() }}>
              Já paguei, atualizar
            </Button>
          )}
          <Button variant="ghost" className="w-full" onClick={voltar}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao catálogo
          </Button>
        </div>
      </main>
    </div>
  )
}
