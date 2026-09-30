import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog"
import { X, MessageCircle } from "lucide-react"
import type { ProdutoCatalogo } from "@/components/delivery/CatalogoProdutoCard"
import { chaveTelefoneLoja } from '@/services/tenant'

interface CatalogoProdutoModalProps {
  isOpen: boolean
  onClose: () => void
  produto: ProdutoCatalogo | null
  whatsapp: string // Número do WhatsApp do estabelecimento
}

export default function CatalogoProdutoModal({
  isOpen,
  onClose,
  produto,
  whatsapp
}: CatalogoProdutoModalProps) {
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

            {!produto.estoqueDisponivel && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
                <p className="text-sm text-red-600 font-semibold">
                  ⚠️ Produto temporariamente indisponível
                </p>
              </div>
            )}
          </AlertDialogHeader>

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
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
