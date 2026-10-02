import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Receipt, 
  Search, 
  Calendar,
  Loader2,
  AlertCircle,
  Filter,
  X,
  Eye,
  Printer,
  Trash2,
  FileClock,
  CheckCircle2,
  Circle,
  List,
  LayoutGrid
} from "lucide-react"
import { vendaService, receiptService, type Sale, type SaleInstallment } from "@/services"
import { format, differenceInCalendarDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import VisualizarCupomModal from "@/components/VisualizarCupomModal"
import { toast } from 'react-hot-toast'
import { confirmar } from '@/components/ui/confirmar'
import { CarregandoPagina } from '@/components/ui/feedback'
import { avisoComDesfazer } from '@/components/ui/desfazer'
import { useTabelaResponsiva } from '@/hooks/useTabelaResponsiva'
import { descreverPagamentoVenda, vendaUsaMetodo } from '@/utils/pagamentoDividido'

export default function HistoricoVendas() {
  const tabelaRef = useTabelaResponsiva()
  const [vendas, setVendas] = useState<Sale[]>([])
  const [vendasFiltradas, setVendasFiltradas] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [dataInicio, setDataInicio] = useState("")
  const [dataFim, setDataFim] = useState("")
  const [formaPagamento, setFormaPagamento] = useState<string>("TODAS")
  const [tipoVenda, setTipoVenda] = useState<string>("TODOS")
  const [termoBusca, setTermoBusca] = useState("")
  const [nomeCliente, setNomeCliente] = useState("")
  const [sugestoesClientes, setSugestoesClientes] = useState<string[]>([])
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)

  // Modal de cupom
  const [modalCupomAberto, setModalCupomAberto] = useState(false)
  const [cupomHTML, setCupomHTML] = useState("")
  const [vendaSelecionada, setVendaSelecionada] = useState<Sale | null>(null)
  const [gerandoCupom, setGerandoCupom] = useState(false)

  // Exclusão de venda
  const [excluindoVenda, setExcluindoVenda] = useState<string | null>(null)

  // Aba "Faturados" (vendas A_PRAZO com suas parcelas)
  // Fonte de dados própria (independente do filtro de período da aba
  // "Vendas"), pois faturamento a prazo precisa mostrar todas as parcelas
  // pendentes/atrasadas mesmo de vendas mais antigas.
  const [abaAtiva, setAbaAtiva] = useState<'vendas' | 'faturados'>('vendas')
  const [vendasAPrazo, setVendasAPrazo] = useState<Sale[]>([])
  const [parcelas, setParcelas] = useState<SaleInstallment[]>([])
  const [carregandoFaturados, setCarregandoFaturados] = useState(false)
  const [atualizandoParcela, setAtualizandoParcela] = useState<string | null>(null)

  // Filtros da aba "Faturados"
  const [filtroStatusPagamento, setFiltroStatusPagamento] = useState<'todas' | 'pagas' | 'pendentes' | 'atrasadas' | 'vencem_em_breve'>('todas')
  const [filtroNomeCliente, setFiltroNomeCliente] = useState('')
  const [modoVisualizacao, setModoVisualizacao] = useState<'agrupado' | 'lista'>('agrupado')

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.autocomplete-container')) {
        setMostrarSugestoes(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    carregarVendas()
  }, [dataInicio, dataFim]) // Recarregar quando as datas mudarem

  // Carrega as parcelas já na montagem (para o contador do badge "Faturados"
  // ficar correto mesmo antes do usuário clicar na aba)
  useEffect(() => {
    carregarFaturados()
  }, [])

  useEffect(() => {
    aplicarFiltros()
  }, [vendas, formaPagamento, tipoVenda, termoBusca, nomeCliente]) // Aplicar filtros locais

  // Atualizar sugestões de clientes conforme o usuário digita
  useEffect(() => {
    if (nomeCliente.length >= 3) {
      // Extrair nomes únicos dos clientes das vendas
      const nomesUnicos = [...new Set(
        vendas
          .map(v => v.customer_name)
          .filter((nome): nome is string => !!nome && nome.toLowerCase().includes(nomeCliente.toLowerCase()))
      )].sort()
      
      setSugestoesClientes(nomesUnicos)
      setMostrarSugestoes(nomesUnicos.length > 0)
    } else {
      setSugestoesClientes([])
      setMostrarSugestoes(false)
    }
  }, [nomeCliente, vendas])

  const carregarVendas = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Função para formatar data no formato ISO UTC sem problemas de timezone
      const formatarDataISO = (dateString: string) => {
        // dateString vem no formato YYYY-MM-DD do input type="date"
        const [year, month, day] = dateString.split('-')
        return `${year}-${month}-${day}T00:00:00Z`
      }

      // Se tem filtro de data, usar buscarPorPeriodo, senão buscar últimos 30 dias
      let inicioStr: string
      let fimStr: string
      
      if (dataInicio && dataFim) {
        // Ambas datas definidas
        inicioStr = formatarDataISO(dataInicio)
        
        // Para a data fim, adicionar 1 dia para incluir todo o dia
        const [year, month, day] = dataFim.split('-')
        const fimDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        fimDate.setDate(fimDate.getDate() + 1)
        const yearFim = fimDate.getFullYear()
        const monthFim = String(fimDate.getMonth() + 1).padStart(2, '0')
        const dayFim = String(fimDate.getDate()).padStart(2, '0')
        fimStr = `${yearFim}-${monthFim}-${dayFim}T00:00:00Z`
      } else if (dataInicio) {
        // Só tem data início, buscar até hoje + 1 dia
        inicioStr = formatarDataISO(dataInicio)
        const hoje = new Date()
        hoje.setDate(hoje.getDate() + 1)
        const year = hoje.getFullYear()
        const month = String(hoje.getMonth() + 1).padStart(2, '0')
        const day = String(hoje.getDate()).padStart(2, '0')
        fimStr = `${year}-${month}-${day}T00:00:00Z`
      } else if (dataFim) {
        // Só tem data fim, buscar dos últimos 30 dias até data fim + 1 dia
        const [year, month, day] = dataFim.split('-')
        const fimDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        fimDate.setDate(fimDate.getDate() + 1)
        const yearFim = fimDate.getFullYear()
        const monthFim = String(fimDate.getMonth() + 1).padStart(2, '0')
        const dayFim = String(fimDate.getDate()).padStart(2, '0')
        fimStr = `${yearFim}-${monthFim}-${dayFim}T00:00:00Z`
        
        const inicioDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        inicioDate.setDate(inicioDate.getDate() - 30)
        const yearInicio = inicioDate.getFullYear()
        const monthInicio = String(inicioDate.getMonth() + 1).padStart(2, '0')
        const dayInicio = String(inicioDate.getDate()).padStart(2, '0')
        inicioStr = `${yearInicio}-${monthInicio}-${dayInicio}T00:00:00Z`
      } else {
        // Sem filtro de data, buscar últimos 30 dias por padrão
        const hoje = new Date()
        hoje.setDate(hoje.getDate() + 1)
        const year = hoje.getFullYear()
        const month = String(hoje.getMonth() + 1).padStart(2, '0')
        const day = String(hoje.getDate()).padStart(2, '0')
        fimStr = `${year}-${month}-${day}T00:00:00Z`
        
        const inicio = new Date()
        inicio.setDate(inicio.getDate() - 30)
        const anoInicio = inicio.getFullYear()
        const mesInicio = String(inicio.getMonth() + 1).padStart(2, '0')
        const diaInicio = String(inicio.getDate()).padStart(2, '0')
        inicioStr = `${anoInicio}-${mesInicio}-${diaInicio}T00:00:00Z`
      }
      
      console.log('🔍 [HISTORICO] Dados de entrada:', { dataInicio, dataFim })
      console.log('🔍 [HISTORICO] Filtro aplicado:', { inicioStr, fimStr })
      
      const data = await vendaService.buscarPorPeriodo(new Date(inicioStr), new Date(fimStr))
      setVendas(data)
      
      console.log('✅ [HISTORICO] Vendas carregadas:', data.length)
    } catch (err) {
      console.error('❌ [HISTORICO] Erro ao carregar vendas:', err)
      setError('Erro ao carregar histórico de vendas')
    } finally {
      setLoading(false)
    }
  }

  const aplicarFiltros = () => {
    let resultado = [...vendas]

    // Filtro por forma de pagamento
    if (formaPagamento !== "TODAS") {
      resultado = resultado.filter(venda => vendaUsaMetodo(venda, formaPagamento))
    }

    // Filtro por tipo de venda
    if (tipoVenda !== "TODOS") {
      resultado = resultado.filter(venda => venda.sale_type === tipoVenda)
    }

    // Filtro por termo de busca (número da venda)
    if (termoBusca) {
      resultado = resultado.filter(venda => 
        venda.sale_number.toLowerCase().includes(termoBusca.toLowerCase())
      )
    }

    // Filtro por nome do cliente
    if (nomeCliente) {
      resultado = resultado.filter(venda => 
        venda.customer_name && venda.customer_name.toLowerCase().includes(nomeCliente.toLowerCase())
      )
    }

    setVendasFiltradas(resultado)
  }

  const limparFiltros = () => {
    setDataInicio("")
    setDataFim("")
    setFormaPagamento("TODAS")
    setTipoVenda("TODOS")
    setTermoBusca("")
    setNomeCliente("")
  }

  const formatarData = (data: string) => {
    return format(new Date(data), "dd/MM/yyyy", { locale: ptBR })
  }

  const formatarHora = (data: string) => {
    return format(new Date(data), "HH:mm", { locale: ptBR })
  }

  const formatarValor = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const carregarFaturados = async () => {
    try {
      setCarregandoFaturados(true)
      const [vendasData, parcelasData] = await Promise.all([
        vendaService.buscarVendasAPrazo(),
        vendaService.buscarTodasParcelas()
      ])
      setVendasAPrazo(vendasData)
      setParcelas(parcelasData)
    } catch (error) {
      console.error('Erro ao carregar faturados:', error)
      toast.error('Erro ao carregar vendas faturadas')
    } finally {
      setCarregandoFaturados(false)
    }
  }

  /**
   * Status visual de uma parcela com base na data de vencimento:
   * - paga: já foi marcada como paga
   * - atrasada: vencimento no passado e ainda não paga
   * - vence_hoje: vence em até 3 dias
   * - vence_em_breve: vence em até 7 dias
   * - em_dia: vencimento distante (> 7 dias)
   */
  const statusParcela = (parcela: SaleInstallment): 'paga' | 'atrasada' | 'vence_hoje' | 'vence_em_breve' | 'em_dia' => {
    if (parcela.pago) return 'paga'
    const dias = differenceInCalendarDays(new Date(parcela.data_vencimento + 'T00:00:00'), new Date())
    if (dias < 0) return 'atrasada'
    if (dias <= 3) return 'vence_hoje'
    if (dias <= 7) return 'vence_em_breve'
    return 'em_dia'
  }

  const CORES_STATUS_PARCELA: Record<string, string> = {
    paga: 'bg-muted text-muted-foreground border-border',
    atrasada: 'bg-destructive/10 text-destructive border-destructive/40',
    vence_hoje: 'bg-warning/15 text-warning-foreground border-warning/40',
    vence_em_breve: 'bg-warning/15 text-warning-foreground border-warning/40',
    em_dia: 'bg-success/10 text-success border-success/40'
  }

  const LABELS_STATUS_PARCELA: Record<string, string> = {
    paga: 'Paga',
    atrasada: 'Atrasada',
    vence_hoje: 'Vence em breve',
    vence_em_breve: 'Vence em breve',
    em_dia: 'Em dia'
  }

  const handleTogglePagoParcela = async (parcela: SaleInstallment, desfazendo = false) => {
    try {
      setAtualizandoParcela(parcela.id)
      const atualizada = await vendaService.definirParcelaPaga(parcela.id, !parcela.pago)
      setParcelas(prev => prev.map(p => p.id === atualizada.id ? atualizada : p))
      const mensagem = atualizada.pago ? 'Parcela marcada como paga' : 'Parcela marcada como pendente'
      if (desfazendo) toast.success(mensagem)
      else avisoComDesfazer(mensagem, () => handleTogglePagoParcela(atualizada, true))
    } catch (error) {
      console.error('Erro ao atualizar parcela:', error)
      toast.error('Erro ao atualizar parcela')
    } finally {
      setAtualizandoParcela(null)
    }
  }

  // Vendas "A Prazo" agrupando suas parcelas (para exibir na aba Faturados)
  const vendasFaturadas = vendasAPrazo
    .map(venda => {
      const parcelasDaVenda = parcelas
        .filter(p => p.sale_id === venda.id)
        .sort((a, b) => a.numero_parcela - b.numero_parcela)
      const pagas = parcelasDaVenda.filter(p => p.pago).length
      
      // Calcular status geral da venda baseado nas parcelas
      const hoje = new Date()
      const temAtrasada = parcelasDaVenda.some(p => 
        !p.pago && differenceInCalendarDays(new Date(p.data_vencimento + 'T00:00:00'), hoje) < 0
      )
      const temVenceEmBreve = parcelasDaVenda.some(p => {
        if (p.pago) return false
        const dias = differenceInCalendarDays(new Date(p.data_vencimento + 'T00:00:00'), hoje)
        return dias >= 0 && dias <= 7
      })
      const todasPagas = pagas === parcelasDaVenda.length
      
      let statusGeral: 'pagas' | 'atrasadas' | 'vencem_em_breve' | 'pendentes' = 'pendentes'
      if (todasPagas) {
        statusGeral = 'pagas'
      } else if (temAtrasada) {
        statusGeral = 'atrasadas'
      } else if (temVenceEmBreve) {
        statusGeral = 'vencem_em_breve'
      }
      
      return { 
        venda, 
        parcelas: parcelasDaVenda, 
        pagas, 
        total: parcelasDaVenda.length,
        statusGeral
      }
    })
    .filter(item => item.parcelas.length > 0)
    // Aplicar filtros
    .filter(item => {
      // Filtro por status de pagamento
      if (filtroStatusPagamento === 'pagas' && item.statusGeral !== 'pagas') return false
      if (filtroStatusPagamento === 'pendentes' && item.statusGeral !== 'pendentes') return false
      if (filtroStatusPagamento === 'atrasadas' && item.statusGeral !== 'atrasadas') return false
      if (filtroStatusPagamento === 'vencem_em_breve' && item.statusGeral !== 'vencem_em_breve') return false
      
      // Filtro por nome do cliente
      if (filtroNomeCliente.trim()) {
        const termo = filtroNomeCliente.toLowerCase()
        const nomeCliente = item.venda.customer_name?.toLowerCase() || ''
        const numeroVenda = item.venda.sale_number.toLowerCase()
        if (!nomeCliente.includes(termo) && !numeroVenda.includes(termo)) {
          return false
        }
      }
      
      return true
    })

  // Modo lista: todas as parcelas ordenadas por data de vencimento (mais próxima primeiro)
  const parcelasEmLista = vendasFaturadas
    .flatMap(item => 
      item.parcelas.map(parcela => ({
        parcela,
        venda: item.venda,
        numeroParcela: parcela.numero_parcela,
        totalParcelas: item.total
      }))
    )
    .sort((a, b) => {
      // Ordenar por data de vencimento (mais próxima primeiro)
      const dataA = new Date(a.parcela.data_vencimento + 'T00:00:00')
      const dataB = new Date(b.parcela.data_vencimento + 'T00:00:00')
      return dataA.getTime() - dataB.getTime()
    })

  const handleVisualizarVenda = async (venda: Sale) => {
    try {
      setGerandoCupom(true)
      setVendaSelecionada(venda)
      
      // Gerar HTML do cupom
      const html = await receiptService.generateSaleReceipt(venda)
      setCupomHTML(html)
      setModalCupomAberto(true)
    } catch (error) {
      console.error('Erro ao gerar cupom:', error)
      toast.error('Erro ao gerar cupom fiscal')
    } finally {
      setGerandoCupom(false)
    }
  }

  const handleImprimirCupom = async (venda: Sale) => {
    try {
      setGerandoCupom(true)
      
      // Gerar HTML do cupom
      const html = await receiptService.generateSaleReceipt(venda)
      
      // Abrir janela de impressão
      const printWindow = window.open('', '_blank', 'width=800,height=600')
      
      if (printWindow) {
        printWindow.document.write(html)
        printWindow.document.close()
        
        printWindow.onload = () => {
          printWindow.focus()
          printWindow.print()
          printWindow.close()
        }
        
        toast.success('Cupom enviado para impressão')
      } else {
        toast.error('Não foi possível abrir janela de impressão')
      }
    } catch (error) {
      console.error('Erro ao imprimir cupom:', error)
      toast.error('Erro ao imprimir cupom')
    } finally {
      setGerandoCupom(false)
    }
  }

  const handleImprimirDoModal = async () => {
    if (!vendaSelecionada) return
    
    // Usar o HTML já gerado
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    
    if (printWindow) {
      printWindow.document.write(cupomHTML)
      printWindow.document.close()
      
      printWindow.onload = () => {
        printWindow.focus()
        printWindow.print()
        printWindow.close()
      }
      
      toast.success('Cupom enviado para impressão')
    } else {
      toast.error('Não foi possível abrir janela de impressão')
    }
  }

  const handleExcluirVenda = async (venda: Sale) => {
    // Confirmar exclusão
    if (!(await confirmar({
      titulo: `Excluir a venda ${venda.sale_number}?`,
      descricao: 'Esta ação não pode ser desfeita e a venda será removida das métricas.',
      perigo: true,
    }))) {
      return
    }

    try {
      setExcluindoVenda(venda.id)
      
      await vendaService.excluir(venda.id)
      
      // Remover da lista local da aba "Vendas"
      setVendas(vendas.filter(v => v.id !== venda.id))

      // Se for venda A_PRAZO, atualizar também a aba "Faturados"
      // (as parcelas foram removidas em cascade no banco, mas precisamos
      // atualizar o estado local para refletir a exclusão imediatamente)
      if (venda.payment_method === 'A_PRAZO') {
        setVendasAPrazo(prev => prev.filter(v => v.id !== venda.id))
        setParcelas(prev => prev.filter(p => p.sale_id !== venda.id))
      }
      
      toast.success('Venda excluída com sucesso')
    } catch (error) {
      console.error('Erro ao excluir venda:', error)
      toast.error('Erro ao excluir venda')
    } finally {
      setExcluindoVenda(null)
    }
  }

  if (loading) {
    return <CarregandoPagina variante="tabela" />
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Receipt className="h-6 w-6" />
          Histórico de Vendas
        </h1>
        <p className="text-muted-foreground">
          Consulte todas as vendas realizadas no PDV
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-destructive/5 border border-destructive/30 rounded-lg text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      <Tabs value={abaAtiva} onValueChange={(v) => setAbaAtiva(v as 'vendas' | 'faturados')} className="space-y-6">
        <TabsList>
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="faturados" className="flex items-center gap-1.5">
            <FileClock className="h-3.5 w-3.5" />
            Faturados
            {vendasFaturadas.length > 0 && (
              <Badge variant="secondary" className="ml-1">{vendasFaturadas.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vendas" className="space-y-6 mt-0">

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Data Início */}
            <div className="space-y-2">
              <Label htmlFor="dataInicio">Data Início</Label>
              <Input
                id="dataInicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>

            {/* Data Fim */}
            <div className="space-y-2">
              <Label htmlFor="dataFim">Data Fim</Label>
              <Input
                id="dataFim"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>

            {/* Forma de Pagamento */}
            <div className="space-y-2">
              <Label htmlFor="formaPagamento">Forma de Pagamento</Label>
              <select
                id="formaPagamento"
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background text-sm rounded-md"
              >
                <option value="TODAS">Todas</option>
                <option value="CASH">Dinheiro</option>
                <option value="DEBIT">Débito</option>
                <option value="CREDIT">Crédito</option>
                <option value="PIX">PIX</option>
                <option value="A_PRAZO">A Prazo</option>
              </select>
            </div>

            {/* Tipo de Venda */}
            <div className="space-y-2">
              <Label htmlFor="tipoVenda">Tipo de Venda</Label>
              <select
                id="tipoVenda"
                value={tipoVenda}
                onChange={(e) => setTipoVenda(e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background text-sm rounded-md"
              >
                <option value="TODOS">Todos</option>
                <option value="PDV">PDV</option>
                <option value="DELIVERY">Delivery</option>
                <option value="INTERNAL_CONSUMPTION">Venda Interna</option>
              </select>
            </div>
          </div>

          {/* Busca por número */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número da venda..."
                className="pl-8"
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
              />
            </div>
            <div className="flex-1 relative autocomplete-container">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome do cliente..."
                className="pl-8"
                value={nomeCliente}
                onChange={(e) => setNomeCliente(e.target.value)}
                onFocus={() => {
                  if (nomeCliente.length >= 3 && sugestoesClientes.length > 0) {
                    setMostrarSugestoes(true)
                  }
                }}
              />
              {/* Dropdown de sugestões */}
              {mostrarSugestoes && sugestoesClientes.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {sugestoesClientes.map((nome, index) => (
                    <button
                      key={index}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-accent text-sm transition-colors"
                      onClick={() => {
                        setNomeCliente(nome)
                        setMostrarSugestoes(false)
                      }}
                    >
                      {nome}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button variant="outline" onClick={limparFiltros}>
              <X className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Vendas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vendas Realizadas</CardTitle>
        </CardHeader>
        <CardContent>
          {vendasFiltradas.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                Nenhuma venda encontrada
              </h3>
              <p className="text-muted-foreground">
                {termoBusca || nomeCliente || dataInicio || dataFim || formaPagamento !== "TODAS" || tipoVenda !== "TODOS"
                  ? "Tente ajustar os filtros"
                  : "Nenhuma venda foi realizada ainda"
                }
              </p>
            </div>
          ) : (
            <div ref={tabelaRef} className="tabela-responsiva overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendasFiltradas.map((venda) => (
                    <TableRow key={venda.id}>
                      <TableCell className="font-medium">
                        {venda.sale_number}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {venda.customer_name || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatarData(venda.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>{formatarHora(venda.created_at)}</TableCell>
                      <TableCell className="font-semibold text-success">
                        {formatarValor(venda.total_amount)}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {descreverPagamentoVenda(venda)}
                        </span>
                      </TableCell>
                      <TableCell>{venda.sale_type}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {venda.items.length} {venda.items.length === 1 ? 'item' : 'itens'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleVisualizarVenda(venda)}
                            disabled={gerandoCupom || excluindoVenda === venda.id}
                            className="h-8 w-8 p-0"
                            title="Visualizar detalhes"
                          >
                            {gerandoCupom ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleImprimirCupom(venda)}
                            disabled={gerandoCupom || excluindoVenda === venda.id}
                            className="h-8 w-8 p-0"
                            title="Imprimir cupom"
                          >
                            {gerandoCupom ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Printer className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExcluirVenda(venda)}
                            disabled={gerandoCupom || excluindoVenda === venda.id}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/5"
                            title="Excluir venda"
                          >
                            {excluindoVenda === venda.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

        </TabsContent>

        <TabsContent value="faturados" className="space-y-6 mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileClock className="h-5 w-5" />
                Vendas Faturadas (A Prazo)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filtros */}
              <div className="flex flex-col sm:flex-row gap-3 p-4 bg-muted/50 rounded-lg border">
                <div className="flex-1">
                  <Label htmlFor="filtroNomeCliente" className="text-xs mb-1 block">
                    Buscar por cliente ou número
                  </Label>
                  <Input
                    id="filtroNomeCliente"
                    placeholder="Nome do cliente ou número da venda..."
                    value={filtroNomeCliente}
                    onChange={(e) => setFiltroNomeCliente(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="sm:w-48">
                  <Label htmlFor="filtroStatusPagamento" className="text-xs mb-1 block">
                    Status
                  </Label>
                  <select
                    id="filtroStatusPagamento"
                    value={filtroStatusPagamento}
                    onChange={(e) => setFiltroStatusPagamento(e.target.value as any)}
                    className="w-full h-9 px-3 py-1 text-sm border border-input bg-background rounded-md"
                  >
                    <option value="todas">Todas</option>
                    <option value="pendentes">Pendentes</option>
                    <option value="vencem_em_breve">Vencem em breve (≤7 dias)</option>
                    <option value="atrasadas">Atrasadas</option>
                    <option value="pagas">Pagas</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Visualização</Label>
                  <div className="flex gap-1">
                    <Button
                      variant={modoVisualizacao === 'agrupado' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setModoVisualizacao('agrupado')}
                      className="h-9 px-3"
                      title="Agrupar por venda"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={modoVisualizacao === 'lista' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setModoVisualizacao('lista')}
                      className="h-9 px-3"
                      title="Lista por vencimento"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {(filtroNomeCliente || filtroStatusPagamento !== 'todas') && (
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFiltroNomeCliente('')
                        setFiltroStatusPagamento('todas')
                      }}
                      className="h-9"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Limpar
                    </Button>
                  </div>
                )}
              </div>

              {carregandoFaturados ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Carregando vendas faturadas...</span>
                </div>
              ) : vendasFaturadas.length === 0 ? (
                <div className="text-center py-12">
                  <FileClock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                    {filtroNomeCliente || filtroStatusPagamento !== 'todas' 
                      ? 'Nenhuma venda encontrada'
                      : 'Nenhuma venda faturada'
                    }
                  </h3>
                  <p className="text-muted-foreground">
                    {filtroNomeCliente || filtroStatusPagamento !== 'todas'
                      ? 'Tente ajustar os filtros para encontrar vendas.'
                      : 'Vendas com pagamento "A Prazo" aparecerão aqui com suas parcelas.'
                    }
                  </p>
                </div>
              ) : (
                modoVisualizacao === 'agrupado' ? (
                  <div className="space-y-4">
                    {vendasFaturadas.map(({ venda, parcelas: parcelasDaVenda, pagas, total }) => (
                    <div key={venda.id} className="border rounded-lg overflow-hidden">
                      {/* Cabeçalho da venda */}
                      <div className="flex items-center justify-between gap-3 p-3 bg-muted/50 border-b flex-wrap">
                        <div className="flex items-center gap-3 flex-wrap">
                          {venda.customer_name ? (
                            <>
                              <span className="font-semibold text-base">{venda.customer_name}</span>
                              <span className="text-sm text-muted-foreground">#{venda.sale_number}</span>
                            </>
                          ) : (
                            <span className="font-semibold">{venda.sale_number}</span>
                          )}
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatarData(venda.created_at)}
                          </span>
                          <span className="text-sm font-semibold text-success">
                            {formatarValor(venda.total_amount)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={pagas === total ? 'secondary' : 'outline'}>
                            {pagas}/{total} parcelas pagas
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExcluirVenda(venda)}
                            disabled={excluindoVenda === venda.id}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/5"
                            title="Excluir venda"
                          >
                            {excluindoVenda === venda.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Lista de parcelas */}
                      <div className="divide-y">
                        {parcelasDaVenda.map((parcela) => {
                          const status = statusParcela(parcela)
                          return (
                            <div
                              key={parcela.id}
                              className="flex items-center justify-between gap-3 p-3 flex-wrap"
                            >
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-sm font-medium w-16">
                                  {parcela.numero_parcela}/{total}
                                </span>
                                <span className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Vence em {format(new Date(parcela.data_vencimento + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                                </span>
                                <span className="text-sm font-semibold">
                                  {formatarValor(parcela.valor)}
                                </span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${CORES_STATUS_PARCELA[status]}`}>
                                  {LABELS_STATUS_PARCELA[status]}
                                </span>
                              </div>
                              <Button
                                variant={parcela.pago ? 'outline' : 'default'}
                                size="sm"
                                onClick={() => handleTogglePagoParcela(parcela)}
                                disabled={atualizandoParcela === parcela.id}
                                className="h-8"
                              >
                                {atualizandoParcela === parcela.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                                ) : parcela.pago ? (
                                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                                ) : (
                                  <Circle className="h-4 w-4 mr-1.5" />
                                )}
                                {parcela.pago ? 'Paga' : 'Marcar como paga'}
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                ) : (
                  /* Modo Lista: parcelas ordenadas por vencimento */
                  <div className="space-y-2">
                    {parcelasEmLista.map(({ parcela, venda, numeroParcela, totalParcelas }) => {
                      const status = statusParcela(parcela)
                      return (
                        <div
                          key={parcela.id}
                          className="flex items-center justify-between gap-3 p-3 border rounded-lg bg-card hover:bg-accent transition-colors flex-wrap"
                        >
                          <div className="flex items-center gap-3 flex-1 flex-wrap min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              {venda.customer_name ? (
                                <div className="flex flex-col min-w-0">
                                  <span className="font-medium text-sm truncate">{venda.customer_name}</span>
                                  <span className="text-xs text-muted-foreground">#{venda.sale_number}</span>
                                </div>
                              ) : (
                                <span className="font-medium text-sm">{venda.sale_number}</span>
                              )}
                            </div>
                            <span className="text-xs px-2 py-1 bg-muted rounded font-medium shrink-0">
                              {numeroParcela}/{totalParcelas}
                            </span>
                            <span className="text-sm text-muted-foreground flex items-center gap-1 shrink-0">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(parcela.data_vencimento + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                            <span className="text-sm font-semibold shrink-0">
                              {formatarValor(parcela.valor)}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${CORES_STATUS_PARCELA[status]} shrink-0`}>
                              {LABELS_STATUS_PARCELA[status]}
                            </span>
                          </div>
                          <Button
                            variant={parcela.pago ? 'outline' : 'default'}
                            size="sm"
                            onClick={() => handleTogglePagoParcela(parcela)}
                            disabled={atualizandoParcela === parcela.id}
                            className="h-8 shrink-0"
                          >
                            {atualizandoParcela === parcela.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                            ) : parcela.pago ? (
                              <CheckCircle2 className="h-4 w-4 mr-1.5" />
                            ) : (
                              <Circle className="h-4 w-4 mr-1.5" />
                            )}
                            {parcela.pago ? 'Paga' : 'Marcar'}
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Visualização do Cupom */}
      <VisualizarCupomModal
        isOpen={modalCupomAberto}
        onClose={() => {
          setModalCupomAberto(false)
          setVendaSelecionada(null)
          setCupomHTML("")
        }}
        cupomHTML={cupomHTML}
        titulo="Cupom Fiscal"
        numero={vendaSelecionada?.sale_number || ""}
        onImprimir={handleImprimirDoModal}
      />
    </div>
  )
}
