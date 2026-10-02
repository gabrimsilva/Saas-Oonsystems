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
  ClipboardList,
  CalendarIcon,
  X,
  Printer,
  Split,
  Package
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { historicoComandaService, configuracaoService } from "@/services"
import type { HistoricoComandaSupabase } from "@/types/supabase"
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
import { useTabelaResponsiva } from '@/hooks/useTabelaResponsiva'

export default function HistoricoComandas() {
  const tabelaRef = useTabelaResponsiva()
  const [comandas, setComandas] = useState<HistoricoComandaSupabase[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filtroPagamento, setFiltroPagamento] = useState<string>("todos")
  const [filtroDataInicio, setFiltroDataInicio] = useState<Date | undefined>(undefined)
  const [filtroDataFim, setFiltroDataFim] = useState<Date | undefined>(undefined)
  const [comandaSelecionada, setComandaSelecionada] = useState<HistoricoComandaSupabase | null>(null)
  const [showDetalhesModal, setShowDetalhesModal] = useState(false)
  const [imprimindo, setImprimindo] = useState(false)
  const [mensagemDialog, setMensagemDialog] = useState<{ titulo: string; descricao: string; tipo: 'sucesso' | 'erro' } | null>(null)

  useEffect(() => {
    carregarHistorico()
  }, [])

  const carregarHistorico = async () => {
    try {
      setLoading(true)
      const data = await historicoComandaService.buscarTodos(500)
      setComandas(data)
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

  const formatarFormaPagamento = (formaPagamento?: string) => {
    if (!formaPagamento) return 'Não informado'
    
    const formas: { [key: string]: string } = {
      'dinheiro': 'Dinheiro',
      'cartao_credito': 'Cartão de Crédito',
      'cartao_debito': 'Cartão de Débito',
      'cartaoCredito': 'Cartão de Crédito',
      'cartaoDebito': 'Cartão de Débito',
      'pix': 'PIX',
      'pixEntrega': 'PIX na Entrega',
      'pix_entrega': 'PIX na Entrega',
      'cartao_vr': 'Cartão VR',
      'cartaoVR': 'Cartão VR',
      'cartao_va': 'Cartão VA',
      'cartaoVA': 'Cartão VA',
      'ticketPromo': 'Ticket Promocional',
      'ticket_promo': 'Ticket Promocional'
    }
    return formas[formaPagamento] || formaPagamento
  }

  const comandasFiltradas = comandas.filter(comanda => {
    // Filtro de busca por texto
    const termo = searchTerm.toLowerCase().trim()
    let matchBusca = true
    if (termo) {
      matchBusca = comanda.numero_comanda.toString().includes(termo)
    }

    // Filtro de pagamento
    let matchPagamento = true
    if (filtroPagamento !== "todos") {
      matchPagamento = comanda.forma_pagamento === filtroPagamento
    }

    // Filtro de data (timezone-safe)
    let matchData = true
    if (comanda.finalizado_em) {
      // Extrair apenas a parte da data (YYYY-MM-DD) ignorando timezone
      const dataComandaStr = comanda.finalizado_em.split('T')[0]
      const dataComanda = new Date(dataComandaStr + 'T00:00:00Z')

      if (filtroDataInicio) {
        const dataInicioStr = filtroDataInicio.toISOString().split('T')[0]
        const dataInicio = new Date(dataInicioStr + 'T00:00:00Z')
        matchData = matchData && dataComanda >= dataInicio
      }

      if (filtroDataFim) {
        const dataFimStr = filtroDataFim.toISOString().split('T')[0]
        // Adicionar 1 dia para incluir todo o dia
        const dataFimDate = new Date(dataFimStr + 'T00:00:00Z')
        dataFimDate.setDate(dataFimDate.getDate() + 1)
        matchData = matchData && dataComanda < dataFimDate
      }
    }

    return matchBusca && matchPagamento && matchData
  })

  const limparFiltros = () => {
    setSearchTerm("")
    setFiltroPagamento("todos")
    setFiltroDataInicio(undefined)
    setFiltroDataFim(undefined)
  }

  const temFiltrosAtivos = searchTerm !== "" || filtroPagamento !== "todos" || filtroDataInicio !== undefined || filtroDataFim !== undefined

  const verDetalhes = (comanda: HistoricoComandaSupabase) => {
    setComandaSelecionada(comanda)
    setShowDetalhesModal(true)
  }

  // Imprimir comanda finalizada
  const imprimirComanda = async (comanda: HistoricoComandaSupabase) => {
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
      const htmlThermal = gerarHTMLImpressaoComandaFinalizada(
        comanda,
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
            descricao: `Comanda #${comanda.numero_comanda} enviada para impressora térmica!`,
            tipo: 'sucesso'
          })
        } else if (resultado.method === 'browser') {
          setMensagemDialog({
            titulo: 'Sucesso!',
            descricao: `Comanda #${comanda.numero_comanda} enviada para impressão. (QZ Tray não disponível, usando impressão do navegador)`,
            tipo: 'sucesso'
          })
        }
      } else {
        // Se QZ Tray não está configurado, usar impressão nativa diretamente
        qzTrayService.printHTMLWithFallback('', htmlThermal)
        setMensagemDialog({
          titulo: 'Sucesso!',
          descricao: `Comanda #${comanda.numero_comanda} enviada para impressão do navegador.`,
          tipo: 'sucesso'
        })
      }
    } catch (error) {
      console.error('Erro ao imprimir comanda:', error)
      setMensagemDialog({
        titulo: 'Erro',
        descricao: 'Erro ao processar impressão. Tente novamente.',
        tipo: 'erro'
      })
    } finally {
      setImprimindo(false)
    }
  }

  // Gerar HTML para impressão de comanda finalizada
  const gerarHTMLImpressaoComandaFinalizada = (
    comanda: HistoricoComandaSupabase,
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
    
    const formatarHora = (dataISO: string) => {
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
  </style>
</head>
<body>
  <div class="header">
    <div class="store-name">${nomeEstabelecimento}</div>
    <div class="store-address">${enderecoEstabelecimento}</div>
    <div class="store-contact">Tel: ${telefoneEstabelecimento}</div>
  </div>
  
  <div class="divider"></div>
  
  <div class="order-id">COMANDA #${comanda.numero_comanda}</div>
  
  <div class="success-box">
    ✓ PEDIDO FINALIZADO - PAGO
  </div>
  
  <div class="info-block">
    <div class="section-title">Informações do Pedido</div>
    ${comanda.criado_em ? `<div class="info-row"><strong>Criado em:</strong> ${formatarHora(comanda.criado_em)}</div>` : ''}
    <div class="info-row"><strong>Finalizado em:</strong> ${comanda.finalizado_em ? formatarHora(comanda.finalizado_em) : 'Não informado'}</div>
    <div class="info-row"><strong>Forma de Pagamento:</strong> ${
      comanda.forma_pagamento_dividido 
        ? `<div style="margin-top: 4px;">
            <div style="font-weight: ${Math.min(fontWeight + 200, 900)}; color: #7c3aed;">Pagamento Dividido</div>
            <div style="margin-top: 2px;">${formatarFormaPagamento(comanda.pagamento_1_tipo || '')}: R$ ${(comanda.pagamento_1_valor || 0).toFixed(2).replace('.', ',')}</div>
            <div>${formatarFormaPagamento(comanda.pagamento_2_tipo || '')}: R$ ${(comanda.pagamento_2_valor || 0).toFixed(2).replace('.', ',')}</div>
          </div>`
        : formatarFormaPagamento(comanda.forma_pagamento)
    }</div>
    ${comanda.criador?.email ? `<div class="info-row"><strong>Criado por:</strong> ${comanda.criador.email}</div>` : ''}
    ${comanda.finalizador?.email ? `<div class="info-row"><strong>Finalizado por:</strong> ${comanda.finalizador.email}</div>` : ''}
  </div>
  
  <div class="divider"></div>
  
  <div class="section-title">Itens</div>
  <div class="items">
    ${comanda.itens?.map((item: any) => {
      const detalhesCombo = renderizarDetalhesComboHTML(item)
      const categoria = item.produto?.categoria_nome || item.produto?.categoria || ''
      
      return `
    <div class="item">
      <div class="item-head">
        <div class="qty-name">${item.quantidade}x ${item.produto?.nome || 'Produto'}</div>
        <div class="price">R$ ${(item.precoTotal || 0).toFixed(2).replace('.', ',')}</div>
      </div>
      ${detalhesCombo ? detalhesCombo : `
      ${categoria ? `<div class="item-sub"><strong>Categoria:</strong> ${categoria}</div>` : ''}
      ${item.tamanhoSelecionado ? `<div class="item-sub"><strong>Tamanho:</strong> ${item.tamanhoSelecionado.nome} (${item.tamanhoSelecionado.tamanho})</div>` : ''}
      ${item.saboresSelecionados && item.saboresSelecionados.length > 0 ? `<div class="item-sub"><strong>Sabores:</strong> ${item.saboresSelecionados.map((s: any) => s.nome).join(', ')}</div>` : ''}
      ${item.bordaSelecionada ? `<div class="item-sub"><strong>Borda:</strong> ${item.bordaSelecionada.nome}</div>` : ''}
      ${item.adicionaisSelecionados && item.adicionaisSelecionados.length > 0 ? `<div class="item-sub"><strong>Adicionais:</strong> ${item.adicionaisSelecionados.map((a: any) => `${a.quantidade}x ${a.nome}`).join(', ')}</div>` : ''}
      ${item.observacoes ? `<div class="item-sub"><strong>Obs:</strong> ${item.observacoes}</div>` : ''}
      `}
    </div>
    `
    }).join('') || '<div class="item">Nenhum item registrado</div>'}
  </div>
  
  <div class="divider"></div>
  
  <div class="totals">
    <div class="line">
      <div>Subtotal:</div>
      <div>R$ ${comanda.subtotal.toFixed(2).replace('.', ',')}</div>
    </div>
    ${comanda.desconto > 0 ? `
    <div class="line">
      <div>Desconto ${comanda.tipo_desconto === 'percentual' ? `(${comanda.desconto}%)` : ''}:</div>
      <div>-R$ ${(() => {
        const descontoCalculado = comanda.tipo_desconto === 'percentual'
          ? (comanda.subtotal * comanda.desconto) / 100
          : comanda.desconto
        return descontoCalculado.toFixed(2).replace('.', ',')
      })()}</div>
    </div>
    <div class="divider"></div>
    <div class="line">
      <div>Subtotal c/ desc:</div>
      <div>R$ ${(() => {
        const descontoCalculado = comanda.tipo_desconto === 'percentual'
          ? (comanda.subtotal * comanda.desconto) / 100
          : comanda.desconto
        return (comanda.subtotal - descontoCalculado).toFixed(2).replace('.', ',')
      })()}</div>
    </div>
    ` : ''}
    <div class="line total">
      <div>Total Pago:</div>
      <div>R$ ${comanda.total.toFixed(2).replace('.', ',')}</div>
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
            Histórico de Comandas
          </h1>
          <p className="text-muted-foreground">
            Todas as comandas finalizadas e canceladas
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm">
            {comandas.length} comandas no histórico
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
            Histórico de Comandas
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            Todas as comandas finalizadas e canceladas
          </p>
        </div>
        
        <div className="flex flex-col gap-3">
          <Badge variant="outline" className="text-sm text-center py-2">
            {comandas.length} comandas no histórico
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
              id="buscar-comandas"
              name="buscar-comandas"
              placeholder="Buscar por número da comanda..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filtro de Pagamento */}
          <Select value={filtroPagamento} onValueChange={setFiltroPagamento}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Pagamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="dinheiro">Dinheiro</SelectItem>
              <SelectItem value="pix">PIX</SelectItem>
              <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
              <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
              <SelectItem value="cartao_vr">Cartão VR</SelectItem>
              <SelectItem value="cartao_va">Cartão VA</SelectItem>
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
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Filtros ativos:</span>
            {searchTerm && (
              <Badge variant="secondary" className="text-xs">
                Busca: {searchTerm}
              </Badge>
            )}
            {filtroPagamento !== "todos" && (
              <Badge variant="secondary" className="text-xs">
                Pagamento: {formatarFormaPagamento(filtroPagamento)}
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
                <TableHead className="w-[100px]">Comanda</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Criado por</TableHead>
                <TableHead>Finalizado por</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Hora</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comandasFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <EstadoVazio
                      icone={ClipboardList}
                      titulo={searchTerm ? 'Nenhuma comanda encontrada' : 'Nenhuma comanda no histórico'}
                      descricao={searchTerm ? 'Tente buscar com outros termos.' : 'As comandas fechadas aparecem aqui.'}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                comandasFiltradas.map((comanda) => (
                  <TableRow key={comanda.id}>
                    <TableCell className="font-medium">
                      <Badge variant="outline">#{comanda.numero_comanda}</Badge>
                    </TableCell>
                    <TableCell>
                      {comanda.itens?.length || 0} itens
                    </TableCell>
                    <TableCell>
                      {comanda.forma_pagamento_dividido ? (
                        <div className="flex items-center gap-1">
                          <Split className="h-3 w-3 text-primary" />
                          <span className="text-xs text-primary">Dividido</span>
                        </div>
                      ) : (
                        formatarFormaPagamento(comanda.forma_pagamento)
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {comanda.criador?.email || '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {comanda.finalizador?.email || '-'}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-[color:var(--price-color)]">
                      R$ {comanda.total.toFixed(2).replace('.', ',')}
                    </TableCell>
                    <TableCell>
                      {comanda.finalizado_em ? formatarData(comanda.finalizado_em) : '-'}
                    </TableCell>
                    <TableCell>
                      {comanda.finalizado_em ? formatarHora(comanda.finalizado_em) : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => imprimirComanda(comanda)}
                          disabled={imprimindo}
                          title="Imprimir comanda"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => verDetalhes(comanda)}
                          title="Ver detalhes"
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
                <ClipboardList className="h-5 w-5" />
                Detalhes da Comanda #{comandaSelecionada?.numero_comanda}
              </DialogTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => comandaSelecionada && imprimirComanda(comandaSelecionada)}
                disabled={imprimindo}
                className="text-primary hover:text-primary-hover hover:bg-primary/5"
              >
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
            </div>
            <DialogDescription>
              Informações completas da comanda finalizada
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4 min-h-0">
            {/* Layout em 2 colunas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Coluna Esquerda - Informações da Comanda */}
              <div className="space-y-6">
                {/* Informações do Pedido */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-foreground flex items-center gap-2">
                    <Package className="w-5 h-5 text-warning-foreground" />
                    Informações do Pedido
                  </h3>
                  <div className="bg-muted/50 p-4 rounded-lg border border-border space-y-2">
                    {comandaSelecionada?.criado_em && (
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted-foreground font-medium">Criado em:</span>
                        <span className="font-medium text-foreground">
                          {formatarData(comandaSelecionada.criado_em)} às {formatarHora(comandaSelecionada.criado_em)}
                        </span>
                      </div>
                    )}
                    {comandaSelecionada?.finalizado_em && (
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted-foreground font-medium">Finalizado em:</span>
                        <span className="font-medium text-foreground">
                          {formatarData(comandaSelecionada.finalizado_em)} às {formatarHora(comandaSelecionada.finalizado_em)}
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                      <span className="text-muted-foreground font-medium">Pagamento:</span>
                      <span className="font-medium text-foreground">
                        {comandaSelecionada?.forma_pagamento_dividido ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Split className="w-4 h-4 text-primary" />
                              <span className="text-primary font-semibold">Pagamento Dividido</span>
                            </div>
                            <div className="text-sm pl-6">
                              {formatarFormaPagamento(comandaSelecionada.pagamento_1_tipo || '')}: R$ {(comandaSelecionada.pagamento_1_valor || 0).toFixed(2).replace('.', ',')}
                            </div>
                            <div className="text-sm pl-6">
                              {formatarFormaPagamento(comandaSelecionada.pagamento_2_tipo || '')}: R$ {(comandaSelecionada.pagamento_2_valor || 0).toFixed(2).replace('.', ',')}
                            </div>
                          </div>
                        ) : (
                          formatarFormaPagamento(comandaSelecionada?.forma_pagamento)
                        )}
                      </span>
                    </div>
                    {comandaSelecionada?.criador?.email && (
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted-foreground font-medium">Criado por:</span>
                        <span className="font-medium text-foreground">{comandaSelecionada.criador.email}</span>
                      </div>
                    )}
                    {comandaSelecionada?.finalizador?.email && (
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted-foreground font-medium">Finalizado por:</span>
                        <span className="font-medium text-foreground">{comandaSelecionada.finalizador.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Coluna Direita - Itens da Comanda */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg mb-3 text-foreground flex items-center gap-2">
                  <Package className="w-5 h-5 text-destructive" />
                  Itens da Comanda
                </h3>
                <div className="space-y-3">
                  {comandaSelecionada?.itens && comandaSelecionada.itens.length > 0 ? (
                    comandaSelecionada.itens.map((item: any, index: number) => (
                      <div key={index} className="border border-border p-4 rounded-lg bg-card hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-semibold text-foreground text-base">
                            {item.quantidade}x {item.produto?.nome}
                            {(item.produto?.categoria_nome || item.produto?.categoria) && (
                              <span className="text-xs text-muted-foreground ml-2 font-normal">
                                ({item.produto.categoria_nome || item.produto.categoria})
                              </span>
                            )}
                          </div>
                          <div className="text-base font-bold text-success">
                            R$ {(item.precoTotal || 0).toFixed(2).replace('.', ',')}
                          </div>
                        </div>
                        
                        {/* Renderizar detalhes do combo se for um combo */}
                        {renderizarDetalhesCombo(item)}
                        
                        {/* Renderizar detalhes normais se não for combo */}
                        {!item.produtosCombo && (
                          <div className="space-y-1 text-sm">
                            {item.tamanhoSelecionado && (
                              <div className="text-muted-foreground">
                                <span className="font-medium">Tamanho:</span> {item.tamanhoSelecionado.nome}
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
                                      • {adicional.quantidade}x {adicional.nome}
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
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum item registrado</p>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Footer fixo com totais - Compacto */}
          <div className="border-t pt-3 flex-shrink-0">
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">R$ {comandaSelecionada?.subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                {comandaSelecionada && comandaSelecionada.desconto > 0 && (() => {
                  const descontoCalculado = calcularDescontoEmReais(
                    comandaSelecionada.desconto,
                    comandaSelecionada.tipo_desconto,
                    comandaSelecionada.subtotal
                  )
                  return (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Desconto {comandaSelecionada.tipo_desconto === 'percentual' ? `(${comandaSelecionada.desconto}%)` : ''}:
                      </span>
                      <span className="font-medium text-destructive">
                        -R$ {descontoCalculado.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  )
                })()}
              </div>
              <div className="flex justify-between text-lg font-bold border-t mt-2 pt-2">
                <span>Total:</span>
                <span className="text-[color:var(--price-color)]">R$ {comandaSelecionada?.total.toFixed(2).replace('.', ',')}</span>
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
