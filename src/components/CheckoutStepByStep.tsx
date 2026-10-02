import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ArrowLeft, ArrowRight } from "lucide-react"
import Header from "@/components/Header"
import InformacoesEstabelecimentoModal from "@/components/InformacoesEstabelecimentoModal"
import { useEstabelecimentoPublico } from "@/contexts/EstabelecimentoPublicoContext"

// Componentes específicos do checkout
import {
  FormularioRetirada,
  ResumoPedido,
  FormasPagamento,
  useCheckoutLogic,
  validarEtapa1,
  finalizarPedido
} from "./checkout"

interface CheckoutStepByStepProps {
  onNavigate: (page: 'delivery' | 'checkout') => void
}

const CheckoutStepByStep = ({ onNavigate }: CheckoutStepByStepProps) => {
  const [modalInfoAberto, setModalInfoAberto] = useState(false)
  const [alertDialog, setAlertDialog] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: '',
    message: ''
  })

  const {
    // Estados
    carrinho,
    configuracoes,
    processandoPedido,
    carregandoCarrinho,
    etapaAtual,
    setEtapaAtual,
    clienteExistente,
    dadosCliente,

    // Funções de cálculo
    calcularPrecoItem,
    calcularSubtotal,
    calcularTaxaEntrega,
    calcularTotal,

    // Handlers
    handleInputChange,
    handleTelefoneChange,

    // Outras funções
    setProcessandoPedido
  } = useCheckoutLogic(onNavigate)

  const prosseguirParaPagamento = () => {
    const validacao = validarEtapa1(dadosCliente)
    if (!validacao.valido) {
      setAlertDialog({
        open: true,
        title: 'Atenção',
        message: validacao.mensagem || 'Erro de validação'
      })
      return
    }
    setEtapaAtual(2)
  }

  const voltarParaDados = () => {
    setEtapaAtual(1)
  }

  const { obterEstabelecimentoId } = useEstabelecimentoPublico()

  const handleFinalizarPedido = () => {
    if (!configuracoes) return

    const estabId = obterEstabelecimentoId()

    finalizarPedido(
      dadosCliente,
      carrinho,
      configuracoes,
      calcularSubtotal,
      calcularTotal,
      setProcessandoPedido,
      estabId
    )
  }

  if (carregandoCarrinho) {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-warning mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando checkout...</p>
        </div>
      </div>
    )
  }

  if (carrinho.length === 0) {
    return null // Componente será redirecionado pelo useEffect
  }

  if (!configuracoes) {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Erro ao carregar configurações...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <Header
        nomeEstabelecimento={configuracoes.nomeEstabelecimento}
        logoUrl={configuracoes.logoUrl}
        bannerUrl={configuracoes.bannerUrl}
        onMaisInformacoes={() => setModalInfoAberto(true)}
      />

      <div className="max-w-4xl mx-auto p-4">
        {/* Título da página */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground text-center">Finalizar Pedido</h1>
        </div>

        {/* Stepper */}
        <div className="mb-8">
          {/* Desktop - Horizontal */}
          <div className="hidden md:flex items-center justify-center">
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium ${etapaAtual >= 1 ? 'bg-success text-white' : 'bg-gray-300 text-muted-foreground'
                }`}>
                1
              </div>
              <span className={`ml-3 text-sm font-medium ${etapaAtual >= 1 ? 'text-success' : 'text-muted-foreground'
                }`}>Seus Dados</span>
            </div>
            <div className={`w-24 h-0.5 mx-4 ${etapaAtual >= 2 ? 'bg-success' : 'bg-gray-300'
              }`}></div>
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium ${etapaAtual >= 2 ? 'bg-success text-white' : 'bg-gray-300 text-muted-foreground'
                }`}>
                2
              </div>
              <span className={`ml-3 text-sm font-medium ${etapaAtual >= 2 ? 'text-success' : 'text-muted-foreground'
                }`}>Pagamento</span>
            </div>
          </div>

          {/* Mobile - Horizontal */}
          <div className="md:hidden flex items-center justify-center">
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-12 h-12 rounded-full text-base font-bold ${etapaAtual >= 1 ? 'bg-success text-white' : 'bg-gray-300 text-muted-foreground'
                }`}>
                1
              </div>
              <span className={`ml-2 text-sm font-medium ${etapaAtual >= 1 ? 'text-success' : 'text-muted-foreground/70'
                }`}>Dados</span>
            </div>

            <div className={`w-8 h-0.5 mx-2 ${etapaAtual >= 2 ? 'bg-success' : 'bg-gray-300'
              }`}></div>

            <div className="flex items-center">
              <div className={`flex items-center justify-center w-12 h-12 rounded-full text-base font-bold ${etapaAtual >= 2 ? 'bg-success text-white' : 'bg-gray-300 text-muted-foreground'
                }`}>
                2
              </div>
              <span className={`ml-2 text-sm font-medium ${etapaAtual >= 2 ? 'text-success' : 'text-muted-foreground/70'
                }`}>Pagamento</span>
            </div>
          </div>
        </div>

        {etapaAtual === 1 ? (
          /* ETAPA 1 - DADOS DO CLIENTE (RETIRADA) */
          <div className="space-y-6">
            <FormularioRetirada
              dadosCliente={dadosCliente}
              handleInputChange={handleInputChange}
              handleTelefoneChange={handleTelefoneChange}
              clienteExistente={clienteExistente}
              enderecoEstabelecimento={configuracoes.endereco}
            />

            {/* Botões de navegação */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => onNavigate('delivery')}
                className="flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao Cardápio
              </Button>

              <Button
                onClick={prosseguirParaPagamento}
                className="flex items-center gap-2 cursor-pointer bg-primary hover:bg-primary-hover"
              >
                Continuar
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          /* ETAPA 2 - INFORMAÇÕES DE PAGAMENTO */
          <div className="space-y-6">
            {/* Resumo do Pedido */}
            <ResumoPedido
              carrinho={carrinho}
              calcularPrecoItem={calcularPrecoItem}
              calcularSubtotal={calcularSubtotal}
              calcularTaxaEntrega={calcularTaxaEntrega}
              calcularTotal={calcularTotal}
            />

            {/* Formas de Pagamento */}
            <FormasPagamento
              dadosCliente={dadosCliente}
              handleInputChange={handleInputChange}
              configuracoes={configuracoes}
            />

            {/* Botões de navegação */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={voltarParaDados}
                className="flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              <Button
                onClick={handleFinalizarPedido}
                disabled={processandoPedido}
                className="flex items-center gap-2 cursor-pointer bg-primary hover:bg-primary-hover"
              >
                {processandoPedido ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processando...
                  </>
                ) : (
                  <>
                    Finalizar Pedido
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de informações do estabelecimento */}
      <InformacoesEstabelecimentoModal
        isOpen={modalInfoAberto}
        onClose={() => setModalInfoAberto(false)}
      />

      {/* Dialog de alerta */}
      <AlertDialog open={alertDialog.open} onOpenChange={(open) => setAlertDialog({ ...alertDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {alertDialog.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setAlertDialog({ ...alertDialog, open: false })}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default CheckoutStepByStep
