import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DangerButton } from "@/components/ui/danger-button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import {
  History,
  Search,
  Eye,
  RefreshCw,
  X,
  CalendarIcon,
  Printer,
  Split,
  User,
  Truck,
  Store,
  Package
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { supabase, configuracaoService, getEstabelecimentoAtivo } from "@/services"
import { qzTrayService } from "@/lib/qzTrayService"
import { renderizarDetalhesCombo, renderizarDetalhesComboHTML } from "@/utils/comboFormatacao"
import { calcularDescontoEmReais } from "@/utils/descontoCalculation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { CarregandoPagina } from '@/components/ui/feedback'
import { EstadoVazio } from '@/components/ui/feedback'
import { dataParaUrl, lerDataUrl, lerFiltroUrl, useFiltrosNaUrl } from '@/hooks/useFiltrosNaUrl'
import { useTabelaResponsiva } from '@/hooks/useTabelaResponsiva'

interface PedidoHistorico {
  id: string
  pedido_id: string
  codigo_pedido?: string
  cliente_nome: string
  cliente_sobrenome: string
  cliente_telefone: string
  cliente_email?: string
  cliente_endereco?: string
  cliente_numero?: string
  cliente_complemento?: string
  cliente_bairro?: string
  cliente_cidade?: string
  cliente_estado?: string
  entrega_domicilio: boolean
  forma_pagamento: string
  precisa_troco?: boolean
  valor_troco?: number
  subtotal: number
  taxa_entrega: number
  total: number
  desconto: number
  tipo_desconto: 'valor' | 'percentual'
  itens: any[]
  status: string
  observacoes?: string
  criado_em: string
  movido_em: string
  // Campos de cancelamento
  cancelado?: boolean
  motivo_cancelamento?: string
  requer_extorno?: boolean
  valor_extorno?: number
  forma_pagamento_extorno?: string
  cancelado_em?: string
  // Campos de pagamento dividido
  forma_pagamento_dividido?: boolean
  pagamento_1_tipo?: string
  pagamento_1_valor?: number
  pagamento_2_tipo?: string
  pagamento_2_valor?: number
}

export default function Historico() {
  const tabelaRef = useTabelaResponsiva()
  const [pedidos, setPedidos] = useState<PedidoHistorico[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState(() => lerFiltroUrl("busca") ?? "")
  const [filtroTipo, setFiltroTipo] = useState<string>(() => lerFiltroUrl("tipo") ?? "todos")
  const [filtroDataInicio, setFiltroDataInicio] = useState<Date | undefined>(() => lerDataUrl("de") ?? undefined)
  const [filtroDataFim, setFiltroDataFim] = useState<Date | undefined>(() => lerDataUrl("ate") ?? undefined)

  useFiltrosNaUrl(
    { busca: searchTerm, tipo: filtroTipo, de: dataParaUrl(filtroDataInicio), ate: dataParaUrl(filtroDataFim) },
    { tipo: "todos" },
  )
  const [pedidoSelecionado, setPedidoSelecionado] = useState<PedidoHistorico | null>(null)
  const [showDetalhesModal, setShowDetalhesModal] = useState(false)
  const [imprimindo, setImprimindo] = useState(false)
  const [mensagemDialog, setMensagemDialog] = useState<{ titulo: string; descricao: string; tipo: 'sucesso' | 'erro' } | null>(null)

  useEffect(() => {
    carregarHistorico()
  }, [])

  const carregarHistorico = async () => {
    try {
      setLoading(true)
      const estabId = getEstabelecimentoAtivo() ?? '00000000-0000-0000-0000-000000000000'

      // Buscar pedidos do histórico geral
      const { data: historicoData, error: historicoError } = await supabase
        .from('historico_geral')
        .select('*')
        .eq('estabelecimento_id', estabId)
        .order('movido_em', { ascending: false })
        .limit(500)

      if (historicoError) {
        console.error('Erro ao carregar histórico:', historicoError)
      }

      // Buscar pedidos cancelados da tabela de pedidos ativos
      const { data: canceladosData, error: canceladosError } = await supabase
        .from('pedidos')
        .select('*')
        .eq('cancelado', true)
        .eq('estabelecimento_id', estabId)
        .order('cancelado_em', { ascending: false })

      if (canceladosError) {
        console.error('Erro ao carregar pedidos cancelados:', canceladosError)
      }

      // Mapear pedidos cancelados para o formato do histórico
      const pedidosCancelados = (canceladosData || []).map(p => ({
        ...p,
        movido_em: p.cancelado_em || p.criado_em,
        status: 'Cancelado'
      }))

      // Combinar e ordenar por data
      const todosPedidos = [...(historicoData || []), ...pedidosCancelados]
        .sort((a, b) => new Date(b.movido_em).getTime() - new Date(a.movido_em).getTime())

      setPedidos(todosPedidos)
    } catch (error) {
      console.error('Erro ao carregar histórico:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatarData = (dataISO: string) => {
    return new Date(dataISO).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatarHora = (dataISO: string) => {
    return new Date(dataISO).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatarFormaPagamento = (forma: string) => {
    const formas: { [key: string]: string } = {
      'dinheiro': 'Dinheiro',
      'cartao_credito': 'Cartão de Crédito',
      'cartao_debito': 'Cartão de Débito',
      'cartaoCredito': 'Cartão de Crédito',
      'cartaoDebito': 'Cartão de Débito',
      'pix': 'PIX',
      'pixEntrega': 'PIX na Entrega',
      'pix_entrega': 'PIX na Entrega',
      'cartaoVR': 'Cartão VR',
      'cartao_vr': 'Cartão VR',
      'cartaoVA': 'Cartão VA',
      'cartao_va': 'Cartão VA',
      'ticketPromo': 'Ticket Promocional',
      'ticket_promo': 'Ticket Promocional'
    }
    return formas[forma] || forma
  }

  const pedidosFiltrados = pedidos.filter(pedido => {
    // Filtro de busca por texto
    const termo = searchTerm.toLowerCase().trim()
    let matchBusca = true

    if (termo) {
      // Busca por nome (case insensitive)
      const nomeMatch = pedido.cliente_nome.toLowerCase().includes(termo)

      // Busca por telefone (remove formatação para comparar)
      const telefoneOriginal = pedido.cliente_telefone || ''
      const telefoneNumeros = telefoneOriginal.replace(/\D/g, '')
      const termoNumeros = termo.replace(/\D/g, '')
      const telefoneMatch = telefoneOriginal.toLowerCase().includes(termo) ||
        (termoNumeros && telefoneNumeros.includes(termoNumeros))

      // Busca por ID do pedido (remove # se presente)
      const pedidoId = pedido.pedido_id || ''
      const codigoPedido = pedido.codigo_pedido || ''
      const termoSemHash = termo.replace('#', '')
      const idMatch = pedidoId.toLowerCase().includes(termo) ||
        pedidoId.toLowerCase().includes(termoSemHash) ||
        codigoPedido.toLowerCase().includes(termo) ||
        codigoPedido.toLowerCase().includes(termoSemHash)

      matchBusca = nomeMatch || telefoneMatch || idMatch
    }

    // Filtro de tipo
    let matchTipo = true
    if (filtroTipo !== "todos") {
      if (filtroTipo === "entrega") {
        matchTipo = pedido.entrega_domicilio === true
      } else if (filtroTipo === "retirada") {
        matchTipo = pedido.entrega_domicilio === false
      } else if (filtroTipo === "cancelado") {
        matchTipo = pedido.cancelado === true
      } else if (filtroTipo === "finalizado") {
        matchTipo = pedido.cancelado !== true
      }
    }

    // Filtro de data
    let matchData = true
    const dataPedido = new Date(pedido.criado_em)
    dataPedido.setHours(0, 0, 0, 0)

    if (filtroDataInicio) {
      const dataInicio = new Date(filtroDataInicio)
      dataInicio.setHours(0, 0, 0, 0)
      matchData = matchData && dataPedido >= dataInicio
    }

    if (filtroDataFim) {
      const dataFim = new Date(filtroDataFim)
      dataFim.setHours(23, 59, 59, 999)
      matchData = matchData && dataPedido <= dataFim
    }

    return matchBusca && matchTipo && matchData
  })

  const limparFiltros = () => {
    setSearchTerm("")
    setFiltroTipo("todos")
    setFiltroDataInicio(undefined)
    setFiltroDataFim(undefined)
  }

  const temFiltrosAtivos = searchTerm !== "" || filtroTipo !== "todos" || filtroDataInicio !== undefined || filtroDataFim !== undefined

  const verDetalhes = (pedido: PedidoHistorico) => {
    setPedidoSelecionado(pedido)
    setShowDetalhesModal(true)
  }

  // Imprimir pedido
  const imprimirPedido = async (pedido: PedidoHistorico) => {
    try {
      setImprimindo(true)

      // Buscar configurações de impressão
      const [configUsarQZ, configImpressora, configDensidade,
             fontBase, fontStoreName, fontSectionTitle, fontItemSub, fontTotals, fontTotalFinal] = await Promise.all([
        configuracaoService.buscarPorChave('usar_qz_tray'),
        configuracaoService.buscarPorChave('impressora_padrao'),
        configuracaoService.buscarPorChave('densidade_impressao'),
        configuracaoService.buscarPorChave('font_size_base'),
        configuracaoService.buscarPorChave('font_size_store_name'),
        configuracaoService.buscarPorChave('font_size_section_title'),
        configuracaoService.buscarPorChave('font_size_item_sub'),
        configuracaoService.buscarPorChave('font_size_totals'),
        configuracaoService.buscarPorChave('font_size_total_final')
      ])

      const usarQZTray = configUsarQZ?.valor === 'true'
      const impressoraPadrao = configImpressora?.valor || ''
      const densidadeImpressao = parseInt(configDensidade?.valor || '3')
      
      const fontSizes = {
        base: parseInt(fontBase?.valor || '11'),
        storeName: parseInt(fontStoreName?.valor || '16'),
        sectionTitle: parseInt(fontSectionTitle?.valor || '11'),
        itemSub: parseInt(fontItemSub?.valor || '10'),
        totals: parseInt(fontTotals?.valor || '12'),
        totalFinal: parseInt(fontTotalFinal?.valor || '14')
      }

      // Buscar configurações da loja
      const [configNome, configEndereco, configTelefone] = await Promise.all([
        configuracaoService.buscarPorChave('nome_loja'),
        configuracaoService.buscarPorChave('endereco_loja'),
        configuracaoService.buscarPorChave('telefone_loja')
      ])

      const nomeEstabelecimento = configNome?.valor || 'Estabelecimento'
      const enderecoEstabelecimento = configEndereco?.valor || ''
      const telefoneEstabelecimento = configTelefone?.valor || ''

      // Gerar HTML para impressão
      const htmlThermal = gerarHTMLImpressaoPedido(
        pedido,
        nomeEstabelecimento,
        enderecoEstabelecimento,
        telefoneEstabelecimento,
        densidadeImpressao,
        fontSizes
      )

      // Tentar imprimir com fallback automático
      if (usarQZTray && impressoraPadrao) {
        const resultado = await qzTrayService.printHTMLWithFallback(impressoraPadrao, htmlThermal)
        
        if (resultado.method === 'qz') {
          setMensagemDialog({
            titulo: 'Sucesso!',
            descricao: `Pedido #${pedido.codigo_pedido || pedido.pedido_id.slice(-4)} enviado para impressora térmica!`,
            tipo: 'sucesso'
          })
        } else if (resultado.method === 'browser') {
          setMensagemDialog({
            titulo: 'Sucesso!',
            descricao: `Pedido #${pedido.codigo_pedido || pedido.pedido_id.slice(-4)} enviado para impressão. (QZ Tray não disponível, usando impressão do navegador)`,
            tipo: 'sucesso'
          })
        }
      } else {
        // Se QZ Tray não está configurado, usar impressão nativa diretamente
        qzTrayService.printHTMLWithFallback('', htmlThermal)
        setMensagemDialog({
          titulo: 'Sucesso!',
          descricao: `Pedido #${pedido.codigo_pedido || pedido.pedido_id.slice(-4)} enviado para impressão do navegador.`,
          tipo: 'sucesso'
        })
      }
    } catch (error) {
      console.error('Erro ao imprimir pedido:', error)
      setMensagemDialog({
        titulo: 'Erro',
        descricao: 'Erro ao processar impressão. Tente novamente.',
        tipo: 'erro'
      })
    } finally {
      setImprimindo(false)
    }
  }

  // Gerar HTML para impressão de pedido
  const gerarHTMLImpressaoPedido = (
    pedido: PedidoHistorico,
    nomeEstabelecimento: string,
    enderecoEstabelecimento: string,
    telefoneEstabelecimento: string,
    densidadeImpressao: number,
    fontSizes: {
      base: number
      storeName: number
      sectionTitle: number
      itemSub: number
      totals: number
      totalFinal: number
    }
  ): string => {
    const fontWeight = 200 + (densidadeImpressao * 100)
    const idCurto = pedido.codigo_pedido || pedido.pedido_id.slice(-4)

    const formatarHoraCompleta = (dataISO: string) => {
      return new Date(dataISO).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    return `
<html>
<head>
  <style>
    @page { 
      size: 70mm auto; 
      margin: 0; 
    }
    @media print { 
      body { 
        margin: 0; 
        -webkit-print-color-adjust: exact; 
      } 
    }
    body {
      width: 70mm;
      font-family: "Courier New", Courier, monospace;
      font-size: ${fontSizes.base}px;
      color: #000;
      line-height: 1.2;
      word-break: break-word;
      padding: 2mm;
      margin: 0;
      font-weight: ${fontWeight};
    }
    .header { 
      text-align: center; 
      margin-bottom: 6px; 
    }
    .store-name { 
      font-size: ${fontSizes.storeName}px; 
      font-weight: ${Math.min(fontWeight + 200, 900)}; 
      letter-spacing: 1px; 
    }
    .store-address, .store-contact { 
      font-size: ${fontSizes.itemSub}px; 
    }
    .section-title { 
      font-weight: ${Math.min(fontWeight + 200, 900)}; 
      font-size: ${fontSizes.sectionTitle}px;
      margin-top: 6px; 
      margin-bottom: 4px; 
    }
    .divider { 
      border-top: 2px solid #000; 
      margin: 6px 0; 
    }
    .info-block { 
      font-size: ${fontSizes.base}px; 
    }
    .info-row { 
      margin-bottom: 2px; 
    }
    .items { 
      margin-top: 4px; 
    }
    .item { 
      display: block; 
      margin-bottom: 4px; 
      width: 100%; 
    }
    .item-head { 
      display:flex; 
      justify-content:space-between; 
      align-items: flex-start;
    }
    .qty-name { 
      flex: 1;
      max-width: 58%; 
      white-space: normal; 
      padding-right: 1mm;
    }
    .price { 
      text-align: right; 
      white-space: nowrap;
      min-width: 32%;
    }
    .item-sub { 
      font-size: ${fontSizes.itemSub}px; 
      margin-left: 2mm; 
      margin-top: 2px; 
    }
    .totals { 
      margin-top: 6px; 
      font-size: ${fontSizes.totals}px; 
    }
    .totals .line { 
      display:flex; 
      justify-content:space-between; 
      align-items: flex-start;
      margin-bottom:2px; 
    }
    .totals .line > div:first-child {
      flex: 1;
      max-width: 58%;
      padding-right: 1mm;
    }
    .totals .line > div:last-child {
      white-space: nowrap;
      text-align: right;
      min-width: 32%;
    }
    .totals .total { 
      font-weight: ${Math.min(fontWeight + 200, 900)}; 
      font-size: ${fontSizes.totalFinal}px; 
    }
    .footer { 
      text-align:center; 
      margin-top:8px; 
      font-size: ${fontSizes.itemSub}px; 
    }
    .order-id { 
      font-size: ${fontSizes.totalFinal}px; 
      font-weight: ${Math.min(fontWeight + 200, 900)}; 
      text-align:center; 
      margin:6px 0; 
    }
    .success-box {
      background-color: #d4edda;
      border: 2px solid #28a745;
      padding: 2mm;
      margin: 3mm 0;
      text-align: center;
      font-weight: ${Math.min(fontWeight + 200, 900)};
      font-size: ${fontSizes.base}px;
    }
    .cancel-box {
      background-color: #f8d7da;
      border: 2px solid #dc3545;
      padding: 2mm;
      margin: 3mm 0;
      text-align: center;
      font-weight: ${Math.min(fontWeight + 200, 900)};
      font-size: ${fontSizes.base}px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="store-name">${nomeEstabelecimento}</div>
    <div class="store-address">${enderecoEstabelecimento}</div>
    <div class="store-contact">Tel: ${telefoneEstabelecimento}</div>
  </div>
  
  <div class="divider"></div>
  
  <div class="order-id">Pedido #${idCurto}</div>
  
  ${pedido.cancelado ? `
  <div class="cancel-box">
    ✗ PEDIDO CANCELADO - ${pedido.motivo_cancelamento || 'Sem motivo informado'}
  </div>
  ` : `
  <div class="success-box">
    ✓ PEDIDO FINALIZADO - PAGO
  </div>
  `}
  
  <div class="info-block">
    <div class="section-title">Dados Pessoais</div>
    <div class="info-row"><strong>Nome:</strong> ${pedido.cliente_nome} ${pedido.cliente_sobrenome}</div>
    <div class="info-row"><strong>Telefone:</strong> ${pedido.cliente_telefone}</div>
    
    <div class="section-title">Dados de Entrega</div>
    <div class="info-row"><strong>Tipo:</strong> ${pedido.entrega_domicilio ? 'Entrega a Domicílio' : 'Retirada no Local'}</div>
    ${pedido.entrega_domicilio && pedido.cliente_endereco ? `
    <div class="info-row"><strong>Endereço:</strong> ${pedido.cliente_endereco}, ${pedido.cliente_numero}</div>
    ${pedido.cliente_complemento ? `<div class="info-row"><strong>Complemento:</strong> ${pedido.cliente_complemento}</div>` : ''}
    ${pedido.cliente_bairro ? `<div class="info-row"><strong>Bairro:</strong> ${pedido.cliente_bairro}</div>` : ''}
    ${pedido.cliente_cidade ? `<div class="info-row"><strong>Cidade:</strong> ${pedido.cliente_cidade} - ${pedido.cliente_estado}</div>` : ''}
    ` : ''}
    
    <div class="section-title">Dados do Pedido</div>
    <div class="info-row"><strong>Data/Hora:</strong> ${formatarHoraCompleta(pedido.criado_em)}</div>
    <div class="info-row"><strong>Forma de Pagamento:</strong> ${
      pedido.forma_pagamento_dividido 
        ? `<div style="margin-top: 4px;">
            <div style="font-weight: ${Math.min(fontWeight + 200, 900)}; color: #7c3aed;">Pagamento Dividido</div>
            <div style="margin-top: 2px;">${formatarFormaPagamento(pedido.pagamento_1_tipo || '')}: R$ ${(pedido.pagamento_1_valor || 0).toFixed(2).replace('.', ',')}</div>
            <div>${formatarFormaPagamento(pedido.pagamento_2_tipo || '')}: R$ ${(pedido.pagamento_2_valor || 0).toFixed(2).replace('.', ',')}</div>
          </div>`
        : formatarFormaPagamento(pedido.forma_pagamento)
    }</div>
    ${pedido.precisa_troco && pedido.valor_troco ? `<div class="info-row"><strong>Troco para:</strong> R$ ${pedido.valor_troco.toFixed(2).replace('.', ',')}</div>` : ''}
    ${pedido.observacoes && !pedido.observacoes.includes('Pedido criado via PDV') ? `<div class="info-row"><strong>Observações:</strong> ${pedido.observacoes}</div>` : ''}
    ${pedido.cancelado && pedido.cancelado_em ? `<div class="info-row"><strong>Cancelado em:</strong> ${formatarHoraCompleta(pedido.cancelado_em)}</div>` : ''}
  </div>
  
  <div class="divider"></div>
  
  <div class="section-title">Itens</div>
  <div class="items">
    ${pedido.itens.map((item: any) => {
      const detalhesCombo = renderizarDetalhesComboHTML(item)
      const categoria = item.produto?.categoria_nome || item.produto?.categoria || ''
      
      // Calcular preço correto do item
      let precoItem = item.produto.preco
      
      // Para combos, o preço já está correto em item.produto.preco
      // Não deve ser sobrescrito pelo tamanho (que é da bebida do combo)
      if (item.produto.categoria !== 'combo') {
        if (item.tamanhoSelecionado?.valor) precoItem = item.tamanhoSelecionado.valor
        if (item.bordaSelecionada?.valor) precoItem += item.bordaSelecionada.valor
        if (item.adicionaisSelecionados?.length > 0) {
          precoItem += item.adicionaisSelecionados.reduce((sum: number, a: any) => sum + (a.valor * a.quantidade), 0)
        }
      }
      const precoTotal = (precoItem * item.quantidade).toFixed(2).replace('.', ',')
      
      return `
    <div class="item">
      <div class="item-head">
        <div class="qty-name">${item.quantidade}x ${item.produto.nome}</div>
        <div class="price">R$ ${precoTotal}</div>
      </div>
      ${detalhesCombo ? detalhesCombo : `
      ${categoria ? `<div class="item-sub"><strong>Categoria:</strong> ${categoria}</div>` : ''}
      ${item.tamanhoSelecionado ? `<div class="item-sub"><strong>Tamanho:</strong> ${item.tamanhoSelecionado.nome} (${item.tamanhoSelecionado.tamanho})</div>` : ''}
      ${item.saboresSelecionados && item.saboresSelecionados.length > 0 ? `<div class="item-sub"><strong>Sabores:</strong> ${item.saboresSelecionados.map((s: any) => s.nome).join(', ')}</div>` : ''}
      ${item.bordaSelecionada ? `<div class="item-sub"><strong>Borda:</strong> ${item.bordaSelecionada.nome}</div>` : ''}
      ${item.adicionaisSelecionados && item.adicionaisSelecionados.length > 0 ? `<div class="item-sub"><strong>Adicionais:</strong> ${item.adicionaisSelecionados.map((a: any) => `${a.quantidade}x ${a.nome} (+R$ ${(a.valor * a.quantidade).toFixed(2).replace('.', ',')})`).join(', ')}</div>` : ''}
      ${item.observacoes ? `<div class="item-sub"><strong>Obs:</strong> ${item.observacoes}</div>` : ''}
      `}
    </div>
    `
    }).join('')}
  </div>
  
  <div class="divider"></div>
  
  <div class="totals">
    <div class="line">
      <div>Subtotal:</div>
      <div>R$ ${pedido.subtotal.toFixed(2).replace('.', ',')}</div>
    </div>
    ${pedido.desconto > 0 ? `
    <div class="line">
      <div>Desconto ${pedido.tipo_desconto === 'percentual' ? `(${pedido.desconto}%)` : ''}:</div>
      <div>-R$ ${(() => {
        const descontoCalculado = pedido.tipo_desconto === 'percentual'
          ? (pedido.subtotal * pedido.desconto) / 100
          : pedido.desconto
        return descontoCalculado.toFixed(2).replace('.', ',')
      })()}</div>
    </div>
    <div class="divider"></div>
    <div class="line">
      <div>Subtotal c/ desc:</div>
      <div>R$ ${(() => {
        const descontoCalculado = pedido.tipo_desconto === 'percentual'
          ? (pedido.subtotal * pedido.desconto) / 100
          : pedido.desconto
        return (pedido.subtotal - descontoCalculado).toFixed(2).replace('.', ',')
      })()}</div>
    </div>
    ` : ''}
    ${pedido.taxa_entrega > 0 ? `
    <div class="line">
      <div>Taxa de entrega:</div>
      <div>R$ ${pedido.taxa_entrega.toFixed(2).replace('.', ',')}</div>
    </div>
    ` : ''}
    ${(pedido as any).taxa_extra_km > 0 ? `
    <div class="line">
      <div>Taxa extra (dist.):</div>
      <div>R$ ${(pedido as any).taxa_extra_km.toFixed(2).replace('.', ',')}</div>
    </div>
    ` : ''}
    <div class="line total">
      <div>Total ${pedido.cancelado ? 'Cancelado' : 'Pago'}:</div>
      <div>R$ ${pedido.total.toFixed(2).replace('.', ',')}</div>
    </div>
  </div>
  
  <div class="divider"></div>
</body>
</html>
    `
  }

  if (loading) {
    return <CarregandoPagina variante="tabela" />
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Desktop */}
      <div className="hidden md:flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <History className="h-6 w-6" />
            Histórico de Pedidos
          </h1>
          <p className="text-muted-foreground">
            Todos os pedidos já finalizados
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm">
            {pedidos.length} pedidos no histórico
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={carregarHistorico}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Header Mobile */}
      <div className="md:hidden space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight flex items-center justify-center gap-2">
            <History className="h-6 w-6" />
            Histórico de Pedidos
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            Todos os pedidos já finalizados
          </p>
        </div>
        
        <div className="flex flex-col gap-3">
          <Badge variant="outline" className="text-sm text-center py-2">
            {pedidos.length} pedidos no histórico
          </Badge>

          <Button
            variant="outline"
            onClick={carregarHistorico}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Busca */}
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="buscar-historico"
              name="buscar-historico"
              placeholder="Buscar por nome, telefone ou #ID..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filtro de Tipo */}
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="entrega">Entrega</SelectItem>
              <SelectItem value="retirada">Retirada</SelectItem>
              <SelectItem value="finalizado">Finalizados</SelectItem>
              <SelectItem value="cancelado">Cancelados</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro de Data Início */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full md:w-[160px] justify-start text-left font-normal h-10",
                  !filtroDataInicio && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filtroDataInicio ? format(filtroDataInicio, "dd/MM/yyyy", { locale: ptBR }) : "Data início"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={filtroDataInicio}
                onSelect={setFiltroDataInicio}
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Filtro de Data Fim */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full md:w-[160px] justify-start text-left font-normal h-10",
                  !filtroDataFim && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filtroDataFim ? format(filtroDataFim, "dd/MM/yyyy", { locale: ptBR }) : "Data fim"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={filtroDataFim}
                onSelect={setFiltroDataFim}
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Botão Limpar Filtros */}
          {temFiltrosAtivos && (
            <DangerButton
              variant="outline"
              onClick={limparFiltros}
              size="sm"
            >
              <X className="h-4 w-4" />
              Limpar
            </DangerButton>
          )}
        </div>

        {/* Indicador de filtros ativos */}
        {temFiltrosAtivos && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Filtros ativos:</span>
            {searchTerm && (
              <Badge variant="secondary" className="text-xs">
                Busca: {searchTerm}
              </Badge>
            )}
            {filtroTipo !== "todos" && (
              <Badge variant="secondary" className="text-xs">
                Tipo: {filtroTipo === "entrega" ? "Entrega" : filtroTipo === "retirada" ? "Retirada" : filtroTipo === "cancelado" ? "Cancelados" : "Finalizados"}
              </Badge>
            )}
            {filtroDataInicio && (
              <Badge variant="secondary" className="text-xs">
                De: {format(filtroDataInicio, "dd/MM/yyyy", { locale: ptBR })}
              </Badge>
            )}
            {filtroDataFim && (
              <Badge variant="secondary" className="text-xs">
                Até: {format(filtroDataFim, "dd/MM/yyyy", { locale: ptBR })}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Tabela com Scroll Horizontal */}
      <div ref={tabelaRef} className="tabela-responsiva border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[80px]">ID</TableHead>
                <TableHead className="min-w-[200px]">Cliente</TableHead>
                <TableHead className="min-w-[140px]">Telefone</TableHead>
                <TableHead className="min-w-[100px]">Tipo</TableHead>
                <TableHead className="min-w-[100px]">Total</TableHead>
                <TableHead className="min-w-[120px]">Data</TableHead>
                <TableHead className="min-w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidosFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EstadoVazio
                      icone={History}
                      titulo={searchTerm ? 'Nenhum pedido encontrado' : 'Nenhum pedido no histórico'}
                      descricao={searchTerm ? 'Tente buscar com outros termos.' : 'Os pedidos finalizados aparecem aqui.'}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                pedidosFiltrados.map((pedido) => (
                  <TableRow key={pedido.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        #{pedido.codigo_pedido || pedido.pedido_id.slice(-4)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">
                          {pedido.cliente_nome} {pedido.cliente_sobrenome}
                        </div>
                        {pedido.cliente_email && (
                          <div className="text-xs text-muted-foreground truncate max-w-[180px]">{pedido.cliente_email}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{pedido.cliente_telefone}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge 
                          variant={pedido.entrega_domicilio ? "default" : "secondary"} 
                          className={`text-xs ${
                            pedido.entrega_domicilio 
                              ? 'bg-[color:var(--secondary-foreground)] hover:bg-[color:var(--secondary-foreground)]/90 text-white border-[color:var(--secondary-foreground)]' 
                              : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                          }`}
                        >
                          {pedido.entrega_domicilio ? "Entrega" : "Retirada"}
                        </Badge>
                        {pedido.forma_pagamento_dividido && (
                          <Badge 
                            variant="outline" 
                            className="text-xs bg-primary/5 text-primary border-primary/30"
                            title="Pagamento Dividido"
                          >
                            <Split className="w-3 h-3 mr-1" />
                            Dividido
                          </Badge>
                        )}
                        {pedido.cancelado && (
                          <Badge variant="destructive" className="text-xs">
                            Cancelado
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-[color:var(--price-color)] text-sm">
                        R$ {pedido.total.toFixed(2).replace('.', ',')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">{formatarData(pedido.criado_em)}</div>
                        <div className="text-xs text-muted-foreground">{formatarHora(pedido.criado_em)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => imprimirPedido(pedido)}
                          disabled={imprimindo}
                          title="Imprimir pedido"
                          className="h-8 w-8 p-0"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => verDetalhes(pedido)}
                          title="Ver detalhes"
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Modal de Detalhes */}
      <Dialog open={showDetalhesModal} onOpenChange={setShowDetalhesModal}>
        <DialogContent className="max-w-none w-[calc(100vw-18rem)] h-[calc(100vh-2rem)] max-h-none left-[16rem] right-auto top-4 translate-x-0 translate-y-0 flex flex-col ml-4 mr-4">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Detalhes do Pedido #{pedidoSelecionado?.codigo_pedido || pedidoSelecionado?.pedido_id.slice(-4)}
              </DialogTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => pedidoSelecionado && imprimirPedido(pedidoSelecionado)}
                disabled={imprimindo}
                className="text-primary hover:text-primary-hover hover:bg-primary/5"
              >
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
            </div>
            <DialogDescription>
              Informações completas do pedido finalizado
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4 min-h-0">
            {pedidoSelecionado && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Coluna Esquerda - Informações do Cliente e Entrega */}
                <div className="space-y-6">
                  {/* Dados Pessoais */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3 text-foreground flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" />
                      Dados Pessoais
                    </h3>
                    <div className="space-y-2 bg-muted/50 p-4 rounded-lg border border-border">
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted-foreground font-medium">Nome:</span>
                        <span className="font-medium text-foreground">{pedidoSelecionado.cliente_nome} {pedidoSelecionado.cliente_sobrenome}</span>
                      </div>
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted-foreground font-medium">Telefone:</span>
                        <span className="font-medium text-foreground">{pedidoSelecionado.cliente_telefone}</span>
                      </div>
                      {pedidoSelecionado.cliente_email && (
                        <div className="grid grid-cols-[120px_1fr] gap-2">
                          <span className="text-muted-foreground font-medium">Email:</span>
                          <span className="font-medium text-foreground">{pedidoSelecionado.cliente_email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dados de Entrega */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3 text-foreground flex items-center gap-2">
                      {pedidoSelecionado.entrega_domicilio ? (
                        <Truck className="w-5 h-5 text-success" />
                      ) : (
                        <Store className="w-5 h-5 text-primary" />
                      )}
                      Dados de Entrega
                    </h3>
                    <div className="space-y-2 bg-muted/50 p-4 rounded-lg border border-border">
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted-foreground font-medium">Tipo:</span>
                        <span className="font-medium text-foreground">
                          {pedidoSelecionado.entrega_domicilio ? 'Entrega a Domicílio' : 'Retirada no Local'}
                        </span>
                      </div>
                      {pedidoSelecionado.entrega_domicilio && pedidoSelecionado.cliente_endereco && (
                        <>
                          <div className="grid grid-cols-[120px_1fr] gap-2">
                            <span className="text-muted-foreground font-medium">Endereço:</span>
                            <span className="font-medium text-foreground">
                              {pedidoSelecionado.cliente_endereco}, {pedidoSelecionado.cliente_numero}
                              {pedidoSelecionado.cliente_complemento && ` - ${pedidoSelecionado.cliente_complemento}`}
                            </span>
                          </div>
                          {pedidoSelecionado.cliente_bairro && (
                            <div className="grid grid-cols-[120px_1fr] gap-2">
                              <span className="text-muted-foreground font-medium">Bairro:</span>
                              <span className="font-medium text-foreground">{pedidoSelecionado.cliente_bairro}</span>
                            </div>
                          )}
                          {pedidoSelecionado.cliente_cidade && (
                            <div className="grid grid-cols-[120px_1fr] gap-2">
                              <span className="text-muted-foreground font-medium">Cidade:</span>
                              <span className="font-medium text-foreground">{pedidoSelecionado.cliente_cidade} - {pedidoSelecionado.cliente_estado}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Dados do Pedido */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3 text-foreground flex items-center gap-2">
                      <Package className="w-5 h-5 text-warning-foreground" />
                      Informações do Pedido
                    </h3>
                    <div className="bg-muted/50 p-4 rounded-lg border border-border space-y-2">
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted-foreground font-medium">Data/Hora:</span>
                        <span className="font-medium text-foreground">
                          {formatarData(pedidoSelecionado.criado_em)} às {formatarHora(pedidoSelecionado.criado_em)}
                        </span>
                      </div>
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted-foreground font-medium">Movido para histórico:</span>
                        <span className="font-medium text-foreground">
                          {formatarData(pedidoSelecionado.movido_em)} às {formatarHora(pedidoSelecionado.movido_em)}
                        </span>
                      </div>
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted-foreground font-medium">Pagamento:</span>
                        <span className="font-medium text-foreground">
                          {pedidoSelecionado.forma_pagamento_dividido ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Split className="w-4 h-4 text-primary" />
                                <span className="text-primary font-semibold">Pagamento Dividido</span>
                              </div>
                              <div className="text-sm pl-6">
                                {formatarFormaPagamento(pedidoSelecionado.pagamento_1_tipo || '')}: R$ {(pedidoSelecionado.pagamento_1_valor || 0).toFixed(2).replace('.', ',')}
                              </div>
                              <div className="text-sm pl-6">
                                {formatarFormaPagamento(pedidoSelecionado.pagamento_2_tipo || '')}: R$ {(pedidoSelecionado.pagamento_2_valor || 0).toFixed(2).replace('.', ',')}
                              </div>
                            </div>
                          ) : (
                            formatarFormaPagamento(pedidoSelecionado.forma_pagamento)
                          )}
                        </span>
                      </div>
                      {pedidoSelecionado.precisa_troco && pedidoSelecionado.valor_troco && (
                        <div className="grid grid-cols-[120px_1fr] gap-2">
                          <span className="text-muted-foreground font-medium">Troco para:</span>
                          <span className="font-medium text-foreground">R$ {pedidoSelecionado.valor_troco.toFixed(2).replace('.', ',')}</span>
                        </div>
                      )}
                      {pedidoSelecionado.observacoes && (
                        <div className="pt-2 border-t border-border">
                          <span className="text-muted-foreground font-medium block mb-1">Observações:</span>
                          <span className="font-medium text-foreground whitespace-pre-wrap block bg-warning/10 p-2 rounded border border-warning/30">
                            {pedidoSelecionado.observacoes}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Informações de Cancelamento */}
                    {pedidoSelecionado.cancelado && (
                      <div className="bg-destructive/5 border border-destructive/30 p-4 rounded-lg space-y-2 mt-4">
                        <h4 className="font-medium text-destructive flex items-center gap-2">
                          ⚠️ Pedido Cancelado
                        </h4>
                        <div className="grid grid-cols-[120px_1fr] gap-2">
                          <span className="text-destructive font-medium">Motivo:</span>
                          <span className="font-medium text-destructive">{pedidoSelecionado.motivo_cancelamento}</span>
                        </div>
                        {pedidoSelecionado.cancelado_em && (
                          <div className="grid grid-cols-[120px_1fr] gap-2">
                            <span className="text-destructive font-medium">Cancelado em:</span>
                            <span className="font-medium text-destructive">
                              {formatarData(pedidoSelecionado.cancelado_em)} às {formatarHora(pedidoSelecionado.cancelado_em)}
                            </span>
                          </div>
                        )}
                        {pedidoSelecionado.requer_extorno && (
                          <>
                            <div className="grid grid-cols-[120px_1fr] gap-2">
                              <span className="text-destructive font-medium">Valor do Extorno:</span>
                              <span className="font-medium text-destructive">
                                R$ {(pedidoSelecionado.valor_extorno || 0).toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                            <div className="grid grid-cols-[120px_1fr] gap-2">
                              <span className="text-destructive font-medium">Forma de Pagamento:</span>
                              <span className="font-medium text-destructive">
                                {formatarFormaPagamento(pedidoSelecionado.forma_pagamento_extorno || '')}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Coluna Direita - Itens do Pedido */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg mb-3 text-foreground flex items-center gap-2">
                    <Package className="w-5 h-5 text-destructive" />
                    Itens do Pedido
                  </h3>
                  <div className="space-y-3">
                    {pedidoSelecionado.itens.map((item: any, index: number) => (
                      <div key={index} className="border border-border p-4 rounded-lg bg-card hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-semibold text-foreground text-base">
                            {item.quantidade}x {item.produto.nome}
                            {(item.produto?.categoria_nome || item.produto?.categoria) && (
                              <span className="text-xs text-muted-foreground ml-2 font-normal">
                                ({item.produto.categoria_nome || item.produto.categoria})
                              </span>
                            )}
                          </div>
                          <div className="text-base font-bold text-success">
                            R$ {(() => {
                              let precoItem = item.produto.preco
                              if (item.produto.categoria !== 'combo') {
                                if (item.tamanhoSelecionado?.valor) precoItem = item.tamanhoSelecionado.valor
                                if (item.bordaSelecionada?.valor) precoItem += item.bordaSelecionada.valor
                                if (item.adicionaisSelecionados?.length > 0) {
                                  precoItem += item.adicionaisSelecionados.reduce(
                                    (sum: number, a: any) => sum + (a.valor * a.quantidade),
                                    0
                                  )
                                }
                              }
                              return (precoItem * item.quantidade).toFixed(2).replace('.', ',')
                            })()}
                          </div>
                        </div>
                        
                        {/* Renderizar detalhes do combo se for um combo */}
                        {renderizarDetalhesCombo(item)}
                        
                        {/* Renderizar detalhes normais se não for combo */}
                        {!item.produtosCombo && (
                          <div className="space-y-1 text-sm">
                            {item.tamanhoSelecionado && (
                              <div className="text-muted-foreground">
                                <span className="font-medium">Tamanho:</span> {item.tamanhoSelecionado.nome} ({item.tamanhoSelecionado.tamanho})
                              </div>
                            )}
                            {item.saboresSelecionados && item.saboresSelecionados.length > 0 && (
                              <div className="text-muted-foreground">
                                <span className="font-medium">Sabores:</span> {item.saboresSelecionados.map((s: any) => s.nome).join(', ')}
                              </div>
                            )}
                            {item.bordaSelecionada && (
                              <div className="text-muted-foreground">
                                <span className="font-medium">Borda:</span> {item.bordaSelecionada.nome}
                              </div>
                            )}
                            {item.adicionaisSelecionados && item.adicionaisSelecionados.length > 0 && (
                              <div className="text-muted-foreground">
                                <div className="font-medium">Adicionais:</div>
                                <div className="ml-2 space-y-0.5">
                                  {item.adicionaisSelecionados.map((adicional: any, idx: number) => (
                                    <div key={idx}>
                                      • {adicional.quantidade}x {adicional.nome} (+R$ {(adicional.valor * adicional.quantidade).toFixed(2).replace('.', ',')})
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {item.observacoes && (
                              <div className="text-sm text-foreground/80 mt-2 italic bg-warning/10 p-2 rounded border border-warning/30">
                                <span className="font-medium">Obs:</span> {item.observacoes}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Footer fixo com totais - Compacto */}
          <div className="border-t pt-3 flex-shrink-0">
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">R$ {pedidoSelecionado?.subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                {pedidoSelecionado && pedidoSelecionado.desconto > 0 && (() => {
                  const descontoCalculado = calcularDescontoEmReais(
                    pedidoSelecionado.desconto,
                    pedidoSelecionado.tipo_desconto,
                    pedidoSelecionado.subtotal
                  )
                  return (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Desconto {pedidoSelecionado.tipo_desconto === 'percentual' ? `(${pedidoSelecionado.desconto}%)` : ''}:
                      </span>
                      <span className="font-medium text-destructive">
                        -R$ {descontoCalculado.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  )
                })()}
                {pedidoSelecionado && pedidoSelecionado.taxa_entrega > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taxa de entrega:</span>
                    <span className="font-medium">R$ {pedidoSelecionado.taxa_entrega.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
                {pedidoSelecionado && (pedidoSelecionado as any).taxa_extra_km > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taxa extra (dist.):</span>
                    <span className="font-medium text-warning-foreground">R$ {(pedidoSelecionado as any).taxa_extra_km.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between text-lg font-bold border-t mt-2 pt-2">
                <span>Total:</span>
                <span className="text-[color:var(--price-color)]">R$ {pedidoSelecionado?.total.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AlertDialog para mensagens de sucesso/erro */}
      <AlertDialog 
        open={!!mensagemDialog} 
        onOpenChange={(open) => {
          if (!open) {
            setMensagemDialog(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{mensagemDialog?.titulo}</AlertDialogTitle>
            <AlertDialogDescription>
              {mensagemDialog?.descricao}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={() => {
                setMensagemDialog(null)
              }}
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}