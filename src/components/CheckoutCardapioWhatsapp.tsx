import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ArrowLeft, ShoppingCart, MessageCircle, Loader2 } from "lucide-react"
import { configuracaoService, clienteService } from "@/services"
import { openWhatsApp, createWhatsAppUrl } from "@/lib/whatsapp"
import Header from "@/components/Header"
import InformacoesEstabelecimentoModal from "@/components/InformacoesEstabelecimentoModal"
import { chaveCarrinhoPublico } from '@/services/tenant'

interface Produto {
  id: string
  nome: string
  descricao: string
  preco: number
  precoPromocional?: number
  categoria: 'pizza' | 'lanche' | 'bebida' | 'combo'
  urlImagem: string
}

interface Sabor {
  id: string
  nome: string
  descricao: string
  categoria: 'doce' | 'salgada'
  ingredientes: string[]
  preco: number
}

interface Borda {
  id: string
  nome: string
  preco: number
}

interface Adicional {
  id: string
  nome: string
  valor: number
  quantidade: number
}

interface ItemCarrinho {
  produto: Produto
  quantidade: number
  saboresSelecionados?: Sabor[]
  bordaSelecionada?: Borda
  tamanhoSelecionado?: any
  adicionaisSelecionados?: Adicional[]
  observacoes?: string
  produtosCombo?: any[]
}

interface DadosClienteSimplificado {
  nome: string
  whatsapp: string
}

interface Configuracao {
  whatsapp?: string
  nomeEstabelecimento: string
  logoUrl: string
  bannerUrl: string
}

interface CheckoutCardapioWhatsappProps {
  onNavigate: (page: 'delivery' | 'checkout') => void
}

const CheckoutCardapioWhatsapp = ({ onNavigate }: CheckoutCardapioWhatsappProps) => {
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [configuracoes, setConfiguracoes] = useState<Configuracao | null>(null)
  const [processandoPedido, setProcessandoPedido] = useState(false)
  const [carregandoCarrinho, setCarregandoCarrinho] = useState(true)
  const [modalInfoAberto, setModalInfoAberto] = useState(false)
  const [clienteExistente, setClienteExistente] = useState<any>(null)

  const [dadosCliente, setDadosCliente] = useState<DadosClienteSimplificado>({
    nome: '',
    whatsapp: ''
  })

  const [alertDialog, setAlertDialog] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: '',
    message: ''
  })

  useEffect(() => {
    const carregarDados = async () => {
      try {
        // Carregar carrinho do localStorage
        const carrinhoSalvo = localStorage.getItem(chaveCarrinhoPublico())
        if (carrinhoSalvo) {
          setCarrinho(JSON.parse(carrinhoSalvo))
        }

        // Carregar configurações do Supabase
        const [whatsapp, nomeConfig, logoConfig, bannerConfig] = await Promise.all([
          configuracaoService.buscarPorChave('whatsapp_loja').catch(() => null),
          configuracaoService.buscarPorChave('nome_loja').catch(() => null),
          configuracaoService.buscarPorChave('logo_url').catch(() => null),
          configuracaoService.buscarPorChave('banner_url').catch(() => null)
        ])

        // Montar objeto de configurações
        const configCarregadas: Configuracao = {
          whatsapp: whatsapp?.valor || '',
          nomeEstabelecimento: nomeConfig?.valor || 'Sua Empresa',
          logoUrl: logoConfig?.valor || '',
          bannerUrl: bannerConfig?.valor || ''
        }

        setConfiguracoes(configCarregadas)
      } catch (error) {
        console.error('Erro ao carregar configurações:', error)
        // Usar configurações padrão em caso de erro
        setConfiguracoes({
          whatsapp: '',
          nomeEstabelecimento: 'Sua Empresa',
          logoUrl: '',
          bannerUrl: ''
        })
      } finally {
        setCarregandoCarrinho(false)
      }
    }

    carregarDados()
  }, [])

  // Redirecionar se carrinho estiver vazio
  useEffect(() => {
    if (!carregandoCarrinho && carrinho.length === 0) {
      onNavigate('delivery')
    }
  }, [carrinho, onNavigate, carregandoCarrinho])

  const calcularPrecoItem = (item: ItemCarrinho): number => {
    let precoTotal = 0

    // Para combos personalizados, o preço já foi calculado corretamente
    if (item.produto.categoria === 'combo' && item.produto.id.includes('-')) {
      // Combo personalizado - usar preço já calculado
      precoTotal = item.produto.preco || 0
    } else if (item.tamanhoSelecionado) {
      // Para produtos com tamanho (porções), usar o valor do tamanho
      precoTotal = item.tamanhoSelecionado.valor
    } else {
      // Usar preço normal do produto
      precoTotal = (item.produto.precoPromocional && item.produto.precoPromocional > 0)
        ? item.produto.precoPromocional
        : item.produto.preco
    }

    // Para produtos normais (não combos personalizados), adicionar preços extras
    if (!(item.produto.categoria === 'combo' && item.produto.id.includes('-'))) {
      // Adicionar preço dos sabores
      if (item.saboresSelecionados && item.saboresSelecionados.length > 0) {
        const precoSabores = item.saboresSelecionados.reduce((acc, sabor) => acc + (sabor.preco || 0), 0)
        precoTotal += precoSabores
      }

      // Adicionar preço da borda
      if (item.bordaSelecionada) {
        precoTotal += item.bordaSelecionada.preco || 0
      }

      // Adicionar preço dos adicionais
      if (item.adicionaisSelecionados && item.adicionaisSelecionados.length > 0) {
        const precoAdicionais = item.adicionaisSelecionados.reduce((acc, adicional) => 
          acc + (adicional.valor * adicional.quantidade), 0
        )
        precoTotal += precoAdicionais
      }
    }

    return precoTotal * item.quantidade
  }

  const calcularTotal = (): number => {
    return carrinho.reduce((acc, item) => acc + calcularPrecoItem(item), 0)
  }

  const handleInputChange = (field: keyof DadosClienteSimplificado, value: string) => {
    setDadosCliente(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Função para formatar WhatsApp
  const formatarWhatsApp = (value: string) => {
    const numeros = value.replace(/\D/g, '')

    if (numeros.length <= 2) {
      return numeros
    }
    if (numeros.length <= 3) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`
    }
    if (numeros.length <= 7) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 3)} ${numeros.slice(3)}`
    }
    if (numeros.length <= 11) {
      if (numeros.length === 11) {
        return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 3)} ${numeros.slice(3, 7)}-${numeros.slice(7, 11)}`
      } else {
        return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6, 10)}`
      }
    }
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 3)} ${numeros.slice(3, 7)}-${numeros.slice(7, 11)}`
  }

  // Função para lidar com mudança do WhatsApp
  const handleWhatsAppChange = async (value: string) => {
    const whatsappFormatado = formatarWhatsApp(value)
    handleInputChange('whatsapp', whatsappFormatado)

    // Se o WhatsApp está completo, buscar cliente existente
    if (whatsappFormatado.length >= 14) { // (99) 9 9999-9999
      try {
        const cliente = await clienteService.buscarPorTelefone(whatsappFormatado)
        if (cliente) {
          setClienteExistente(cliente)
          // Preencher nome automaticamente se o cliente existir
          setDadosCliente(prev => ({
            ...prev,
            nome: cliente.nome || prev.nome,
          }))
        } else {
          setClienteExistente(null)
        }
      } catch (error) {
        console.error('Erro ao buscar cliente:', error)
        setClienteExistente(null)
      }
    } else {
      setClienteExistente(null)
    }
  }

  const validarFormulario = (): boolean => {
    return dadosCliente.nome.trim() !== '' && dadosCliente.whatsapp.trim() !== ''
  }

  // Função para gerar mensagem do WhatsApp
  const gerarMensagemWhatsApp = (): string => {
    const data = new Date()
    const dataFormatada = data.toLocaleDateString('pt-BR')
    const horaFormatada = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

    let mensagem = `🍕 *NOVO PEDIDO - CARDÁPIO* 🍕\n\n`
    
    mensagem += `📅 *Data:* ${dataFormatada}\n`
    mensagem += `🕐 *Hora:* ${horaFormatada}\n\n`

    // Dados do cliente
    mensagem += `👤 *CLIENTE*\n`
    mensagem += `*Nome:* ${dadosCliente.nome}\n`
    mensagem += `*WhatsApp:* ${dadosCliente.whatsapp}\n`
    mensagem += `*Local:* Cliente no estabelecimento\n`

    // Itens do pedido
    mensagem += `\n🛒 *ITENS DO PEDIDO*\n`
    carrinho.forEach((item, index) => {
      mensagem += `\n${index + 1}. *${item.produto.nome}*\n`
      mensagem += `   Qtd: ${item.quantidade}\n`

      // Se for combo com produtos personalizados
      if (item.produtosCombo && Array.isArray(item.produtosCombo)) {
        item.produtosCombo.forEach((produtoCombo: any, idx: number) => {
          mensagem += `   ${idx + 1}° item: ${produtoCombo.nome}\n`
          if (produtoCombo.tamanhoSelecionado) {
            mensagem += `      • Tamanho: ${produtoCombo.tamanhoSelecionado.nome} (${produtoCombo.tamanhoSelecionado.tamanho})\n`
          }
          if (produtoCombo.saboresSelecionados && produtoCombo.saboresSelecionados.length > 0) {
            mensagem += `      • Sabor${produtoCombo.saboresSelecionados.length > 1 ? 'es' : ''}: ${produtoCombo.saboresSelecionados.map((s: any) => s.nome).join(', ')}\n`
          }
          if (produtoCombo.bordaSelecionada) {
            mensagem += `      • Borda: ${produtoCombo.bordaSelecionada.nome}\n`
          }
        })
      } else {
        // Produto normal ou combo simples
        if (item.tamanhoSelecionado) {
          mensagem += `   Tamanho: ${item.tamanhoSelecionado.nome} (${item.tamanhoSelecionado.tamanho})\n`
        }

        if (item.saboresSelecionados && item.saboresSelecionados.length > 0) {
          mensagem += `   Sabores: ${item.saboresSelecionados.map(s => s.nome).join(', ')}\n`
        }

        if (item.bordaSelecionada) {
          mensagem += `   Borda: ${item.bordaSelecionada.nome}\n`
        }

        if (item.adicionaisSelecionados && item.adicionaisSelecionados.length > 0) {
          mensagem += `   Adicionais: ${item.adicionaisSelecionados.map(a => `${a.quantidade}x ${a.nome} (+R$ ${(a.valor * a.quantidade).toFixed(2).replace('.', ',')})`).join(', ')}\n`
        }
      }

      // Observações do item (funciona para produtos normais e combos)
      if (item.observacoes) {
        mensagem += `   📝 Obs: ${item.observacoes}\n`
      }

      mensagem += `   Valor: R$ ${calcularPrecoItem(item).toFixed(2).replace('.', ',')}\n`
    })

    // Resumo financeiro
    mensagem += `\n💰 *TOTAL: R$ ${calcularTotal().toFixed(2).replace('.', ',')}*\n`

    // Tipo de entrega
    mensagem += `\n🏪 *RETIRADA NO LOCAL*\n`

    mensagem += `\n_Pedido realizado através do cardápio digital_`

    return mensagem
  }

  // Função para enviar para WhatsApp
  const enviarParaWhatsApp = () => {
    const whatsapp = configuracoes?.whatsapp
    if (!whatsapp) {
      setAlertDialog({
        open: true,
        title: 'WhatsApp não configurado',
        message: 'Número do WhatsApp não configurado! Entre em contato diretamente.'
      })
      return
    }

    // Gerar mensagem
    const mensagem = gerarMensagemWhatsApp()

    // Criar URL do WhatsApp
    const urlWhatsApp = createWhatsAppUrl(whatsapp, mensagem)

    // Abrir WhatsApp de forma otimizada para mobile/desktop
    openWhatsApp(urlWhatsApp)
  }

  const finalizarPedido = async () => {
    if (!validarFormulario()) {
      setAlertDialog({
        open: true,
        title: 'Atenção',
        message: 'Por favor, preencha seu nome e WhatsApp.'
      })
      return
    }

    // Evitar múltiplos cliques
    if (processandoPedido) {
      return
    }

    setProcessandoPedido(true)

    try {
      // Tentar criar ou buscar cliente (não crítico)
      try {
        await clienteService.buscarOuCriar({
          nome: dadosCliente.nome,
          sobrenome: '', // No modo cardápio não pedimos sobrenome
          telefone: dadosCliente.whatsapp,
        })
      } catch (clienteError) {
        console.error('Erro ao criar/buscar cliente (continuando sem cliente):', clienteError)
      }

      // Gerar ID único para o pedido local
      const pedidoId = `cardapio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Salvar pedido no localStorage (backup)
      const pedidoLocal = {
        id: pedidoId,
        dadosCliente,
        itens: carrinho,
        total: calcularTotal(),
        modoCardapio: true,
        status: 'Enviado para WhatsApp',
        dataHora: new Date().toISOString(),
        previsaoEntrega: 'Retirada no local'
      }
      localStorage.setItem(`pedido-${pedidoId}`, JSON.stringify(pedidoLocal))

      // Enviar pedido para WhatsApp
      enviarParaWhatsApp()

      // Limpar carrinho
      localStorage.removeItem(chaveCarrinhoPublico())

      // Mostrar mensagem de sucesso e redirecionar
      setAlertDialog({
        open: true,
        title: 'Sucesso!',
        message: 'Pedido enviado para o WhatsApp! Aguarde o contato da loja.'
      })
      
      // Redirecionar para a página inicial após fechar o dialog
      setTimeout(() => {
        onNavigate('delivery')
      }, 2000)

    } catch (error) {
      console.error('Erro ao finalizar pedido:', error)
      setAlertDialog({
        open: true,
        title: 'Erro',
        message: 'Erro ao processar pedido. Tente novamente.'
      })
      setProcessandoPedido(false)
    }
  }

  if (carregandoCarrinho) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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

  return (
    <div className="min-h-screen">
      {/* Header */}
      {configuracoes && (
        <Header
          nomeEstabelecimento={configuracoes.nomeEstabelecimento}
          logoUrl={configuracoes.logoUrl}
          bannerUrl={configuracoes.bannerUrl}
          onMaisInformacoes={() => setModalInfoAberto(true)}
        />
      )}

      <div className="max-w-4xl mx-auto p-4">
        {/* Título da página */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground text-center">Finalizar Pedido</h1>
          <p className="text-center text-muted-foreground mt-2">Modo Cardápio - Retirada no Local</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Dados do Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Seus Dados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* WhatsApp - PRIMEIRO para buscar cliente existente */}
              <div>
                <Label htmlFor="whatsapp">WhatsApp *</Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  value={dadosCliente.whatsapp}
                  onChange={(e) => handleWhatsAppChange(e.target.value)}
                  placeholder="(41) 9 9999-9999"
                  maxLength={16}
                />
                {clienteExistente && (
                  <div className="mt-2 p-2 bg-success/5 border border-success/30 rounded-md">
                    <p className="text-sm text-success">
                      ✅ Cliente encontrado! Nome preenchido automaticamente.
                      <br />
                      <span className="text-xs">
                        {clienteExistente.total_pedidos} pedido(s) anterior(es)
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Nome */}
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={dadosCliente.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  placeholder="Seu nome"
                />
              </div>

              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <div className="text-primary mt-0.5">ℹ️</div>
                  <div className="text-sm text-primary">
                    <p className="font-medium mb-1">Modo Cardápio Ativo</p>
                    <p>Seu pedido será enviado diretamente para o WhatsApp da loja para retirada no local.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resumo do Pedido */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Resumo do Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Itens do carrinho */}
              <div className="space-y-3">
                {carrinho.map((item, index) => (
                  <div key={index} className="flex justify-between items-start p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.produto.nome}</h4>
                      {item.tamanhoSelecionado && (
                        <p className="text-sm text-muted-foreground">
                          {item.tamanhoSelecionado.nome} ({item.tamanhoSelecionado.tamanho})
                        </p>
                      )}
                      {item.saboresSelecionados && item.saboresSelecionados.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          Sabores: {item.saboresSelecionados.map(s => s.nome).join(', ')}
                        </p>
                      )}
                      {item.bordaSelecionada && (
                        <p className="text-sm text-muted-foreground">
                          Borda: {item.bordaSelecionada.nome}
                        </p>
                      )}
                      {item.adicionaisSelecionados && item.adicionaisSelecionados.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          Adicionais: {item.adicionaisSelecionados.map(a => `${a.quantidade}x ${a.nome}`).join(', ')}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">Qtd: {item.quantidade}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        R$ {calcularPrecoItem(item).toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Total */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total:</span>
                  <span>R$ {calcularTotal().toFixed(2).replace('.', ',')}</span>
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  🏪 Retirada no local
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Botões de ação */}
        <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="outline"
            onClick={() => onNavigate('delivery')}
            disabled={processandoPedido}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Cardápio
          </Button>
          
          <Button
            onClick={finalizarPedido}
            disabled={processandoPedido || !validarFormulario()}
            className="flex items-center gap-2 bg-success hover:bg-success/90 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {processandoPedido ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <MessageCircle className="h-4 w-4" />
                Enviar para WhatsApp
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Modal de Informações */}
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

export default CheckoutCardapioWhatsapp