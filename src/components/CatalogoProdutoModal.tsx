import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog"
import { X, MessageCircle, Minus, Plus, ShoppingCart } from "lucide-react"
import type { ProdutoCatalogo } from "@/components/delivery/CatalogoProdutoCard"
import { chaveTelefoneLoja } from '@/services/tenant'
import { disponivelParaCompra, formatarReais, precoAnterior, precoUnitario } from "@/components/catalogo/precos"
import type { ItemCarrinhoCatalogo } from "@/hooks/useCarrinhoCatalogo"
import type { TipoVenda } from "@/services/lojaOnlineService"

interface CatalogoProdutoModalProps {
  isOpen: boolean
  onClose: () => void
  produto: ProdutoCatalogo | null
  whatsapp: string // Número do WhatsApp do estabelecimento
  /** Quando informado, o modal permite adicionar ao carrinho (loja recebendo pedidos) */
  compra?: {
    modo: TipoVenda
    /** Quantidade deste produto/variante que já está no carrinho */
    quantidadeNoCarrinho: (varianteId: string | null) => number
    onAdicionar: (item: ItemCarrinhoCatalogo) => void
  }
}

export default function CatalogoProdutoModal({
  isOpen,
  onClose,
  produto,
  whatsapp,
  compra
}: CatalogoProdutoModalProps) {
  const [varianteId, setVarianteId] = useState<string | null>(null)
  const [quantidade, setQuantidade] = useState(1)

  // Reinicia a seleção a cada produto aberto
  useEffect(() => {
    setVarianteId(null)
    setQuantidade(1)
  }, [produto?.id, isOpen])

  if (!produto) return null

  const handleWhatsApp = () => {
    console.log('🔍 Dados WhatsApp:')
    console.log('  - Telefone recebido:', whatsapp)
    console.log('  - Produto:', produto.nome)
    console.log('  - Tipo do telefone:', typeof whatsapp)
    console.log('  - Telefone vazio?:', whatsapp === '' || !whatsapp)
    console.log('  - Telefone length:', whatsapp?.length)
    
    // Verificar se o telefone existe e tem conteúdo
    if (!whatsapp || whatsapp.trim() === '' || whatsapp === 'undefined' || whatsapp === 'null') {
      console.error('❌ WhatsApp não configurado!')
      console.error('   Valor recebido:', JSON.stringify(whatsapp))
      
      // Tentar buscar de localStorage como fallback
      const fallbackTelefone = localStorage.getItem(chaveTelefoneLoja())
      console.log('   Tentando fallback do localStorage:', fallbackTelefone)
      
      if (fallbackTelefone && fallbackTelefone.trim() !== '') {
        console.log('✅ Usando telefone do fallback')
        const mensagem = `Olá! Vi o produto *${produto.nome}* no catálogo e fiquei interessado(a)!\n\nPoderia me passar mais informações sobre disponibilidade e formas de pagamento?\n\nAguardo retorno!`
        const whatsappClean = fallbackTelefone.replace(/\D/g, '')
        const url = `https://wa.me/55${whatsappClean}?text=${encodeURIComponent(mensagem)}`
        window.open(url, '_blank')
        return
      }
      
      alert('WhatsApp não configurado. Entre em contato pelo site.')
      return
    }
    
    // Mensagem simples sem emojis para evitar problemas de codificação
    const mensagem = `Olá! Vi o produto *${produto.nome}* no catálogo e fiquei interessado(a)!\n\nPoderia me passar mais informações sobre disponibilidade e formas de pagamento?\n\nAguardo retorno!`
    const whatsappClean = whatsapp.replace(/\D/g, '') // Remove caracteres não numéricos
    
    // Validar que o telefone limpo tem dígitos suficientes
    if (whatsappClean.length < 10) {
      console.error('❌ Telefone inválido! Muito curto:', whatsappClean)
      alert('Número de WhatsApp inválido. Entre em contato pelo site.')
      return
    }
    
    const url = `https://wa.me/55${whatsappClean}?text=${encodeURIComponent(mensagem)}`
    
    console.log('  - Telefone limpo:', whatsappClean)
    console.log('  - URL gerada:', url)
    console.log('  - Mensagem:', mensagem)
    
    // Salvar no localStorage para fallback
    localStorage.setItem(chaveTelefoneLoja(), whatsapp)
    
    window.open(url, '_blank')
  }

  const temVariantes = (produto.variantes?.length ?? 0) > 0
  const disponivel = disponivelParaCompra(produto, varianteId)
  const noCarrinho = compra ? compra.quantidadeNoCarrinho(varianteId) : 0
  const restante = disponivel === null ? null : Math.max(disponivel - noCarrinho, 0)
  const precisaVariante = temVariantes && !varianteId
  const esgotado = !precisaVariante && restante !== null && restante <= 0
  const preco = compra ? precoUnitario(produto, compra.modo) : null
  const anterior = compra ? precoAnterior(produto, compra.modo) : null
  const semPreco = !!compra && (preco ?? 0) <= 0
  const podeAdicionar = !!compra && !semPreco && !precisaVariante && !esgotado && quantidade >= 1

  const handleAdicionar = () => {
    if (!compra || !podeAdicionar) return
    const variante = produto.variantes?.find(v => v.id === varianteId)
    compra.onAdicionar({
      produtoId: produto.id,
      varianteId,
      varianteNome: variante?.nome ?? null,
      quantidade
    })
    onClose()
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="w-[525px] max-w-[calc(100%-2rem)] max-h-[85vh] p-0 overflow-hidden flex flex-col">
        {/* Botão fechar */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-1.5 hover:bg-white transition-colors shadow-md cursor-pointer"
          aria-label="Fechar"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Imagem do produto */}
        <div className="w-full h-48 bg-gray-50 max-md:h-[35vh] max-md:flex-shrink-0 flex items-center justify-center">
          <img
            src={produto.urlImagem}
            alt={produto.nome}
            className="w-full h-full object-contain p-2"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = '/placeholder-food.svg'
            }}
          />
        </div>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto p-5 max-md:flex max-md:flex-col">
          <AlertDialogHeader className="space-y-2 text-left">
            <AlertDialogTitle className="text-xl font-bold text-gray-900">
              {produto.nome}
            </AlertDialogTitle>
            
            <p className="text-sm text-purple-600 font-medium capitalize">
              {produto.categoria}
            </p>

            <AlertDialogDescription className="text-sm text-gray-600 leading-relaxed">
              {produto.descricao}
            </AlertDialogDescription>

            {preco !== null && (
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-2xl font-bold text-purple-700">{formatarReais(preco)}</span>
                {anterior !== null && (
                  <span className="text-sm text-gray-400 line-through">{formatarReais(anterior)}</span>
                )}
                {compra?.modo === "atacado" && (
                  <span className="text-xs font-semibold uppercase tracking-wide text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                    Atacado
                  </span>
                )}
              </div>
            )}

            {!compra && !produto.estoqueDisponivel && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
                <p className="text-sm text-red-600 font-semibold">
                  ⚠️ Produto temporariamente indisponível
                </p>
              </div>
            )}
          </AlertDialogHeader>

          {compra ? (
            <div className="mt-4 space-y-4 text-left">
              {temVariantes && (
                <fieldset>
                  <legend className="text-sm font-medium text-gray-900 mb-2">Escolha uma opção</legend>
                  <div className="flex flex-wrap gap-2">
                    {produto.variantes!.map(v => {
                      const semEstoque = produto.controlaEstoque !== false && v.quantidade <= 0
                      const selecionada = varianteId === v.id
                      return (
                        <button
                          key={v.id}
                          type="button"
                          disabled={semEstoque}
                          aria-pressed={selecionada}
                          onClick={() => { setVarianteId(v.id); setQuantidade(1) }}
                          className={`px-3 py-1.5 rounded-full border text-sm transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:line-through ${
                            selecionada
                              ? "bg-purple-600 border-purple-600 text-white"
                              : "bg-white border-gray-300 text-gray-800 hover:border-purple-400"
                          }`}
                        >
                          {v.nome}
                        </button>
                      )
                    })}
                  </div>
                </fieldset>
              )}

              {!precisaVariante && !esgotado && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-gray-900">Quantidade</span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 p-0 rounded-full"
                      onClick={() => setQuantidade(q => Math.max(1, q - 1))}
                      disabled={quantidade <= 1}
                      aria-label="Diminuir quantidade"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={restante ?? undefined}
                      value={quantidade}
                      onChange={(e) => {
                        const n = Math.max(1, Math.floor(Number(e.target.value) || 1))
                        setQuantidade(restante !== null ? Math.min(n, Math.max(restante, 1)) : n)
                      }}
                      className="w-16 h-9 text-center border border-gray-300 rounded-md text-sm"
                      aria-label="Quantidade"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 p-0 rounded-full"
                      onClick={() => setQuantidade(q => q + 1)}
                      disabled={restante !== null && quantidade >= restante}
                      aria-label="Aumentar quantidade"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {semPreco && (
                <p className="text-sm text-amber-700 font-medium" role="status">
                  Produto sem preço cadastrado. Fale com a loja pelo WhatsApp.
                </p>
              )}
              {esgotado && (
                <p className="text-sm text-red-600 font-medium" role="status">
                  {noCarrinho > 0 ? "Você já adicionou todo o estoque disponível." : "Produto esgotado."}
                </p>
              )}
              {!esgotado && !precisaVariante && restante !== null && (
                <p className={`text-xs ${restante <= 10 ? "text-amber-700" : "text-gray-500"}`} role="status">
                  {restante <= 10 ? `Restam ${restante} unidade(s).` : `${restante} unidades disponíveis.`}
                </p>
              )}

              <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
                <Button
                  onClick={handleAdicionar}
                  disabled={!podeAdicionar}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-5 text-base cursor-pointer shadow-lg flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {semPreco
                    ? "Indisponível para pedido online"
                    : precisaVariante
                    ? "Escolha uma opção"
                    : `Adicionar${preco !== null ? ` · ${formatarReais(preco * quantidade)}` : ""}`}
                </Button>
                <button
                  type="button"
                  onClick={handleWhatsApp}
                  className="w-full text-sm text-green-700 hover:text-green-800 font-medium flex items-center justify-center gap-1.5 py-1 cursor-pointer"
                >
                  <MessageCircle className="h-4 w-4" />
                  Dúvidas? Fale no WhatsApp
                </button>
              </AlertDialogFooter>
            </div>
          ) : (
            <>
              {/* Informação sobre contato */}
              <div className="mt-4 mb-4 text-left">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-sm text-purple-800 font-medium text-center">
                    💬 Entre em contato pelo WhatsApp para saber mais sobre valores e disponibilidade!
                  </p>
                </div>
              </div>

              {/* Botão WhatsApp */}
              <AlertDialogFooter className="sm:justify-center mt-4">
                <Button
                  onClick={handleWhatsApp}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-5 text-base cursor-pointer shadow-lg flex items-center justify-center gap-2"
                >
                  <MessageCircle className="h-5 w-5" />
                  Tenho interesse - Falar no WhatsApp
                </Button>
              </AlertDialogFooter>
            </>
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
