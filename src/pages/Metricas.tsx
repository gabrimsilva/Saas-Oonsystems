import { useState, useEffect } from "react"
import { supabase, getEstabelecimentoAtivo, estabelecimentoService } from "@/services"
import { usePermissoes } from "@/hooks/usePermissoes"
import type { Estabelecimento } from "@/types/estabelecimento"
import RelatorioMetricas from "@/components/RelatorioMetricas"
import CardConsumoInterno from "@/components/metrics/CardConsumoInterno"
import LineChartConsumoInterno from "@/components/metrics/LineChartConsumoInterno"
import ListaConsumoInterno from "@/components/metrics/ListaConsumoInterno"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { CalendarIcon, TrendingUp, DollarSign, ShoppingCart, Package } from "lucide-react"
import { format, subDays, startOfDay, endOfDay } from "date-fns"
import { ptBR } from "date-fns/locale"

interface MetricasResumo {
  // Métricas principais
  faturamentoTotal: number
  lucroTotal: number
  quantidadeVendas: number
  ticketMedio: number
  quantidadeProdutosVendidos: number
  
  // Métricas por tipo de venda
  faturamentoPDV: number
  quantidadeVendasPDV: number
  faturamentoDelivery: number
  quantidadeVendasDelivery: number
  ticketMedioDelivery: number

  // Métricas de comandas
  faturamentoComandas: number
  quantidadeVendasComandas: number
  ticketMedioComandas: number
  
  // Análises
  produtosMaisVendidos: { nome: string; quantidade: number; total: number }[]
  vendasPorDia: { data: string; total: number; quantidade: number }[]
  vendasPorCategoria: { categoria: string; total: number; quantidade: number }[]
  faturamentoPorFormaPagamento: { forma: string; total: number; quantidade: number }[]
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export default function Metricas() {
  const { perfil } = usePermissoes()
  const ehAdminGeral = perfil === 'administrador_geral'

  const [periodo, setPeriodo] = useState<string>("7")
  const [dataInicio, setDataInicio] = useState<Date>(subDays(new Date(), 7))
  const [dataFim, setDataFim] = useState<Date>(new Date())
  const [metricas, setMetricas] = useState<MetricasResumo | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeChartPagamento, setActiveChartPagamento] = useState<"total" | "quantidade">("total")
  
  // Filtros opcionais
  const [filtroFormaPagamento, setFiltroFormaPagamento] = useState<string>("TODAS")
  const [filtroTipoVenda, setFiltroTipoVenda] = useState<string>("TODOS")

  // Filtro de estabelecimento (somente Admin Geral)
  const [filtroEstab, setFiltroEstab] = useState<string>(() => getEstabelecimentoAtivo() ?? "TODOS")
  const [estabs, setEstabs] = useState<Estabelecimento[]>([])

  // Carregar lista de estabelecimentos (apenas Admin Geral)
  useEffect(() => {
    if (!ehAdminGeral) return
    estabelecimentoService
      .buscarTodos()
      .then(setEstabs)
      .catch((err) => console.error("Erro ao carregar estabelecimentos:", err))
  }, [ehAdminGeral])

  // Estabelecimento usado para filtrar as métricas:
  // - Admin Geral: respeita o seletor ("TODOS" => null => combina tudo)
  // - Demais perfis: sempre o estabelecimento ativo
  const estabParaFiltrar = ehAdminGeral
    ? (filtroEstab === "TODOS" ? null : filtroEstab)
    : getEstabelecimentoAtivo()

  useEffect(() => {
    carregarMetricas()
  }, [dataInicio, dataFim, filtroFormaPagamento, filtroTipoVenda, filtroEstab, ehAdminGeral])

  const handlePeriodoChange = (value: string) => {
    setPeriodo(value)
    const hoje = new Date()
    
    switch (value) {
      case "0":
        setDataInicio(hoje)
        setDataFim(hoje)
        break
      case "7":
        setDataInicio(subDays(hoje, 7))
        setDataFim(hoje)
        break
      case "15":
        setDataInicio(subDays(hoje, 15))
        setDataFim(hoje)
        break
      case "30":
        setDataInicio(subDays(hoje, 30))
        setDataFim(hoje)
        break
      case "90":
        setDataInicio(subDays(hoje, 90))
        setDataFim(hoje)
        break
      case "all":
        // Todo o período - usar uma data muito antiga
        setDataInicio(new Date(2020, 0, 1))
        setDataFim(hoje)
        break
    }
  }

  const carregarMetricas = async () => {
    try {
      setLoading(true)
      
      const inicio = startOfDay(dataInicio).toISOString()
      const fim = endOfDay(dataFim).toISOString()

      // Buscar vendas do período com filtros
      let query = supabase
        .from("sales")
        .select("*")
        .gte("created_at", inicio)
        .lte("created_at", fim)
        .order("created_at", { ascending: true })

      // Aplicar filtro de forma de pagamento se selecionado
      if (filtroFormaPagamento !== "TODAS") {
        query = query.eq("payment_method", filtroFormaPagamento)
      }

      // Aplicar filtro de tipo de venda se selecionado
      if (filtroTipoVenda !== "TODOS") {
        query = query.eq("sale_type", filtroTipoVenda)
      }

      // Escopo por estabelecimento (Req 8.2)
      // Admin Geral pode ver visão combinada (estabParaFiltrar = null).
      const estabId = estabParaFiltrar
      if (estabId) {
        query = query.eq("estabelecimento_id", estabId)
      }

      const { data: vendas, error } = await query

      if (error) throw error

      const vendasData = vendas || []

      // NOVO: Também incluir pedidos em aberto (não finalizados) de DELIVERY
      // para rastrear formas de pagamento hoje
      let pedidosAbertoData = []
      if (filtroTipoVenda === 'TODOS' || filtroTipoVenda === 'DELIVERY') {
        let pedidosQuery = supabase
          .from('pedidos')
          .select('*')
          .gte('criado_em', inicio)
          .lte('criado_em', fim)
          .neq('status', 'Finalizado')  // Excluir finalizados (já estão em sales)
          .neq('status', 'Entregue')
          .neq('status', 'Retirado')
          .neq('status', 'Cancelado')

        if (estabId) {
          pedidosQuery = pedidosQuery.eq('estabelecimento_id', estabId)
        }

        const { data: pedidosData } = await pedidosQuery
        pedidosAbertoData = pedidosData || []
      }

      // Vendas registradas em 'sales' (PDV + Delivery)
      const faturamentoSales = vendasData.reduce((sum, v) => sum + (parseFloat(v.total_amount) || 0), 0)
      const quantidadeSales = vendasData.length
      const unidadesSales = vendasData.reduce((sum, venda) => {
        const itens = Array.isArray(venda.items) ? venda.items : []
        return sum + itens.reduce((itemSum: number, item: any) => itemSum + (item.quantidade || 0), 0)
      }, 0)

      // Separar métricas por tipo de venda (PDV vs DELIVERY)
      const vendasPDV = vendasData.filter(v => v.sale_type === 'PDV')
      const vendasDelivery = vendasData.filter(v => v.sale_type === 'DELIVERY')

      const faturamentoPDV = vendasPDV.reduce((sum, v) => sum + (parseFloat(v.total_amount) || 0), 0)
      const quantidadeVendasPDV = vendasPDV.length

      const faturamentoDelivery = vendasDelivery.reduce((sum, v) => sum + (parseFloat(v.total_amount) || 0), 0)
      const quantidadeVendasDelivery = vendasDelivery.length
      const ticketMedioDelivery = quantidadeVendasDelivery > 0 ? faturamentoDelivery / quantidadeVendasDelivery : 0

      // Métricas de comandas (finalizadas vão para historico_comandas, não para sales)
      let faturamentoComandas = 0
      let quantidadeVendasComandas = 0
      let unidadesComandas = 0
      if (filtroTipoVenda === 'TODOS' || filtroTipoVenda === 'COMANDA') {
        let comandasQuery = supabase
          .from('historico_comandas')
          .select('total, itens, finalizado_em')
          .gte('finalizado_em', inicio)
          .lte('finalizado_em', fim)
        if (estabId) comandasQuery = comandasQuery.eq('estabelecimento_id', estabId)
        const { data: comandasData } = await comandasQuery

        const comandas = comandasData || []
        faturamentoComandas = comandas.reduce((sum, c) => sum + (parseFloat(c.total) || 0), 0)
        quantidadeVendasComandas = comandas.length
        unidadesComandas = comandas.reduce((sum, c) => {
          const itens = Array.isArray(c.itens) ? c.itens : []
          return sum + itens.reduce((itemSum: number, item: any) => itemSum + (item.quantidade || 0), 0)
        }, 0)
      }
      const ticketMedioComandas = quantidadeVendasComandas > 0 ? faturamentoComandas / quantidadeVendasComandas : 0

      // Indicadores principais = sales (PDV + Delivery) + Comandas
      const faturamentoTotal = faturamentoSales + faturamentoComandas
      const quantidadeVendas = quantidadeSales + quantidadeVendasComandas
      const ticketMedio = quantidadeVendas > 0 ? faturamentoTotal / quantidadeVendas : 0
      const quantidadeProdutosVendidos = unidadesSales + unidadesComandas

      // Produtos mais vendidos (excluindo consumo interno)
      const produtosMap = new Map<string, { quantidade: number; total: number }>()
      vendasData.forEach(venda => {
        // ✅ Excluir vendas de consumo interno pela sale_type
        if (venda.sale_type === 'INTERNAL_CONSUMPTION') {
          return
        }

        const itens = Array.isArray(venda.items) ? venda.items : []
        itens.forEach((item: any) => {
          const nome = item.produto?.nome || "Produto sem nome"
          const quantidade = item.quantidade || 1
          // Calcular precoTotal = quantidade * preco (se precoTotal não existir)
          const precoUnitario = item.produto?.preco || item.precoUnitario || 0
          const precoTotal = item.precoTotal || (quantidade * precoUnitario)
          
          const atual = produtosMap.get(nome) || { quantidade: 0, total: 0 }
          produtosMap.set(nome, {
            quantidade: atual.quantidade + quantidade,
            total: atual.total + precoTotal
          })
        })
      })
      
      const produtosMaisVendidos = Array.from(produtosMap.entries())
        .map(([nome, dados]) => ({ nome, ...dados }))
        .sort((a, b) => b.quantidade - a.quantidade)

      // Faturamento por dia
      const vendasPorDiaMap = new Map<string, { total: number; quantidade: number }>()
      
      vendasData.forEach(venda => {
        const data = format(new Date(venda.created_at), "dd/MM", { locale: ptBR })
        const atual = vendasPorDiaMap.get(data) || { total: 0, quantidade: 0 }
        vendasPorDiaMap.set(data, {
          total: atual.total + (parseFloat(venda.total_amount) || 0),
          quantidade: atual.quantidade + 1
        })
      })
      
      const vendasPorDia = Array.from(vendasPorDiaMap.entries())
        .map(([data, dados]) => ({ data, ...dados }))
        .sort((a, b) => {
          // Ordenar por data (dd/MM)
          const [diaA, mesA] = a.data.split('/').map(Number)
          const [diaB, mesB] = b.data.split('/').map(Number)
          if (mesA !== mesB) return mesA - mesB
          return diaA - diaB
        })

      // Faturamento por categoria
      const categoriasMap = new Map<string, { total: number; quantidade: number }>()
      vendasData.forEach(venda => {
        const itens = Array.isArray(venda.items) ? venda.items : []
        itens.forEach((item: any) => {
          const categoria = item.produto?.categoria || "Sem categoria"
          const quantidade = item.quantidade || 1
          // Calcular precoTotal = quantidade * preco (se precoTotal não existir)
          const precoUnitario = item.produto?.preco || item.precoUnitario || 0
          const precoTotal = item.precoTotal || (quantidade * precoUnitario)
          
          const atual = categoriasMap.get(categoria) || { total: 0, quantidade: 0 }
          categoriasMap.set(categoria, {
            total: atual.total + precoTotal,
            quantidade: atual.quantidade + quantidade
          })
        })
      })
      
      const vendasPorCategoria = Array.from(categoriasMap.entries())
        .map(([categoria, dados]) => ({ categoria, ...dados }))
        .sort((a, b) => b.total - a.total)

      // Faturamento por forma de pagamento (incluindo pedidos em aberto)
      const traduzirFormaPagamento = (forma: string) => {
        const traducoes: Record<string, string> = {
          'CASH': 'Dinheiro',
          'DEBIT': 'Débito',
          'CREDIT': 'Crédito',
          'PIX': 'PIX',
          'dinheiro': 'Dinheiro',
          'cartaoDebito': 'Débito',
          'cartaoCredito': 'Crédito',
          'pix': 'PIX',
          'pixEntrega': 'PIX na Entrega',
          'cartaoVR': 'Cartão VR',
          'cartaoVA': 'Cartão VA',
          'ticketPromo': 'Ticket Promocional'
        }
        return traducoes[forma] || forma
      }

      const formasPagamentoMap = new Map<string, { total: number; quantidade: number }>()
      
      // Adicionar dados de sales
      vendasData.forEach(venda => {
        const forma = traduzirFormaPagamento(venda.payment_method || "Não informado")
        const atual = formasPagamentoMap.get(forma) || { total: 0, quantidade: 0 }
        formasPagamentoMap.set(forma, {
          total: atual.total + (parseFloat(venda.total_amount) || 0),
          quantidade: atual.quantidade + 1
        })
      })

      // NOVO: Adicionar dados de pedidos em aberto (delivery)
      pedidosAbertoData.forEach((pedido: any) => {
        const forma = traduzirFormaPagamento(pedido.forma_pagamento || "Não informado")
        const atual = formasPagamentoMap.get(forma) || { total: 0, quantidade: 0 }
        formasPagamentoMap.set(forma, {
          total: atual.total + (parseFloat(pedido.total) || 0),
          quantidade: atual.quantidade + 1
        })
      })
      
      const faturamentoPorFormaPagamento = Array.from(formasPagamentoMap.entries())
        .map(([forma, dados]) => ({ forma, ...dados }))
        .sort((a, b) => b.total - a.total)

      // ✅ CÁLCULO DO LUCRO: Faturamento - Σ(custo × quantidade)
      // Buscar custos atuais dos produtos na tabela produtos (funciona para vendas antigas e novas)

      // Coletar todos os IDs de produtos das vendas (excluindo consumo interno)
      const produtoIdsVendas = new Set<string>()
      vendasData.forEach(venda => {
        if (venda.sale_type === 'INTERNAL_CONSUMPTION') return
        const itens = Array.isArray(venda.items) ? venda.items : []
        itens.forEach((item: any) => {
          if (item.produto?.id) produtoIdsVendas.add(item.produto.id)
        })
      })

      // Buscar custos na tabela produtos
      let custosMapProdutos = new Map<string, number>()
      if (produtoIdsVendas.size > 0) {
        let custosQuery = supabase
          .from('produtos')
          .select('id, custo')
          .in('id', Array.from(produtoIdsVendas))
        
        const { data: custosData } = await custosQuery
        custosData?.forEach((p: any) => {
          custosMapProdutos.set(p.id, parseFloat(p.custo) || 0)
        })
      }

      let custoTotalVendas = 0

      // Custo das vendas em 'sales' (PDV + Delivery, excluindo consumo interno)
      vendasData.forEach(venda => {
        if (venda.sale_type === 'INTERNAL_CONSUMPTION') return

        const itens = Array.isArray(venda.items) ? venda.items : []
        itens.forEach((item: any) => {
          const quantidade = item.quantidade || 1
          const produtoId = item.produto?.id
          // Prioriza custo salvo no JSON; fallback para custo atual da tabela produtos
          const custoNoJson = item.produto?.custo
          const custo = (custoNoJson !== undefined && custoNoJson !== null)
            ? parseFloat(custoNoJson) || 0
            : (produtoId ? custosMapProdutos.get(produtoId) || 0 : 0)
          custoTotalVendas += custo * quantidade
        })
      })

      // Custo das comandas finalizadas
      if (filtroTipoVenda === 'TODOS' || filtroTipoVenda === 'COMANDA') {
        let comandasQuery = supabase
          .from('historico_comandas')
          .select('itens')
          .gte('finalizado_em', inicio)
          .lte('finalizado_em', fim)
        if (estabId) comandasQuery = comandasQuery.eq('estabelecimento_id', estabId)
        const { data: comandasData } = await comandasQuery

        // Coletar IDs de produtos das comandas que ainda não estão no mapa
        const comandas = comandasData || []
        const produtoIdsComandas = new Set<string>()
        comandas.forEach((comanda: any) => {
          const itens = Array.isArray(comanda.itens) ? comanda.itens : []
          itens.forEach((item: any) => {
            const id = item.produto?.id
            if (id && !custosMapProdutos.has(id)) produtoIdsComandas.add(id)
          })
        })

        // Buscar custos dos produtos de comandas que ainda não foram buscados
        if (produtoIdsComandas.size > 0) {
          const { data: custosComandasData } = await supabase
            .from('produtos')
            .select('id, custo')
            .in('id', Array.from(produtoIdsComandas))
          custosComandasData?.forEach((p: any) => {
            custosMapProdutos.set(p.id, parseFloat(p.custo) || 0)
          })
        }

        comandas.forEach((comanda: any) => {
          const itens = Array.isArray(comanda.itens) ? comanda.itens : []
          itens.forEach((item: any) => {
            const quantidade = item.quantidade || 1
            const produtoId = item.produto?.id
            const custoNoJson = item.produto?.custo
            const custo = (custoNoJson !== undefined && custoNoJson !== null)
              ? parseFloat(custoNoJson) || 0
              : (produtoId ? custosMapProdutos.get(produtoId) || 0 : 0)
            custoTotalVendas += custo * quantidade
          })
        })
      }

      const lucroTotal = faturamentoTotal - custoTotalVendas

      console.log('💰 [LUCRO] Cálculo:', {
        faturamentoTotal,
        custoTotalVendas,
        lucroTotal,
        margemLucro: faturamentoTotal > 0 ? ((lucroTotal / faturamentoTotal) * 100).toFixed(2) + '%' : '0%'
      })

      setMetricas({
        faturamentoTotal,
        lucroTotal,
        quantidadeVendas,
        ticketMedio,
        quantidadeProdutosVendidos,
        faturamentoPDV,
        quantidadeVendasPDV,
        faturamentoDelivery,
        quantidadeVendasDelivery,
        ticketMedioDelivery,
        faturamentoComandas,
        quantidadeVendasComandas,
        ticketMedioComandas,
        produtosMaisVendidos,
        vendasPorDia,
        vendasPorCategoria,
        faturamentoPorFormaPagamento
      })
    } catch (error) {
      console.error("Erro ao carregar métricas:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(valor)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando métricas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold">Métricas de Vendas</h1>
          <p className="text-muted-foreground">Acompanhe o desempenho das vendas da sua loja</p>
        </div>

        {/* Seção de filtros e controles */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filtros e Período</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Linha 1: Período, datas e botão de relatório */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <Select value={periodo} onValueChange={handlePeriodoChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Hoje</SelectItem>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="15">Últimos 15 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                  <SelectItem value="all">Todo o período</SelectItem>
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataInicio ? format(dataInicio, "dd/MM/yyyy", { locale: ptBR }) : "Início"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataInicio}
                    onSelect={(date) => {
                      if (date) {
                        setDataInicio(date)
                        setPeriodo("custom")
                      }
                    }}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataFim ? format(dataFim, "dd/MM/yyyy", { locale: ptBR }) : "Fim"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataFim}
                    onSelect={(date) => {
                      if (date) {
                        setDataFim(date)
                        setPeriodo("custom")
                      }
                    }}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {ehAdminGeral && (
                <Select value={filtroEstab} onValueChange={setFiltroEstab}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Estabelecimento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todos os estabelecimentos</SelectItem>
                    {estabs.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="flex items-center justify-end">
                <RelatorioMetricas 
                  metricas={metricas}
                  dataInicio={dataInicio}
                  dataFim={dataFim}
                  periodo={periodo}
                />
              </div>
            </div>

            {/* Linha 2: Filtros de pagamento e tipo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select value={filtroFormaPagamento} onValueChange={setFiltroFormaPagamento}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Forma de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todas as formas</SelectItem>
                  <SelectItem value="CASH">Dinheiro</SelectItem>
                  <SelectItem value="DEBIT">Débito</SelectItem>
                  <SelectItem value="CREDIT">Crédito</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filtroTipoVenda} onValueChange={setFiltroTipoVenda}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tipo de venda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os tipos</SelectItem>
                  <SelectItem value="PDV">PDV</SelectItem>
                  <SelectItem value="DELIVERY">Delivery</SelectItem>
                  <SelectItem value="COMANDA">Comandas</SelectItem>
                </SelectContent>
              </Select>

              {(filtroFormaPagamento !== "TODAS" || filtroTipoVenda !== "TODOS") && (
                <Button 
                  variant="outline"
                  onClick={() => {
                    setFiltroFormaPagamento("TODAS")
                    setFiltroTipoVenda("TODOS")
                  }}
                  className="w-full"
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards de Resumo - Vendas */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            💰 Indicadores Principais
          </h3>
          {(filtroFormaPagamento !== "TODAS" || filtroTipoVenda !== "TODOS") && (
            <span className="text-xs text-muted-foreground bg-indigo-50 px-2 py-1 rounded-md border border-indigo-200">
              Filtros ativos
            </span>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatarMoeda(metricas?.faturamentoTotal || 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total de vendas no período
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-gradient-to-br from-green-50/60 to-emerald-50/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lucro</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatarMoeda(metricas?.lucroTotal || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Faturamento menos custos
              </p>
              {metricas && metricas.faturamentoTotal > 0 && (
                <div className="mt-2 flex items-center gap-1.5">
                  <div className="text-sm font-semibold text-green-700">
                    {((metricas.lucroTotal / metricas.faturamentoTotal) * 100).toFixed(1)}%
                  </div>
                  <span className="text-xs text-muted-foreground">margem de lucro</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quantidade de Vendas</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metricas?.quantidadeVendas || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Número de vendas realizadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatarMoeda(metricas?.ticketMedio || 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Valor médio por venda
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Produtos Vendidos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metricas?.quantidadeProdutosVendidos || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Unidades vendidas
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cards de Resumo - Loja Física */}
      {(filtroTipoVenda === "TODOS" || filtroTipoVenda === "PDV") && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            📍 Loja Física
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-purple-200 bg-gradient-to-br from-purple-50/50 to-indigo-50/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Faturamento PDV</CardTitle>
                <DollarSign className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-700">{formatarMoeda(metricas?.faturamentoPDV || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metricas?.quantidadeVendasPDV || 0} vendas realizadas
                </p>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-gradient-to-br from-purple-50/50 to-indigo-50/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vendas PDV</CardTitle>
                <ShoppingCart className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-700">{metricas?.quantidadeVendasPDV || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Ticket médio: {formatarMoeda(metricas?.quantidadeVendasPDV ? (metricas?.faturamentoPDV || 0) / metricas.quantidadeVendasPDV : 0)}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Gráficos */}
      <Tabs defaultValue="vendas" className="space-y-4">
        <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-auto min-w-full md:w-full">
            <TabsTrigger value="vendas" className="whitespace-nowrap">Vendas</TabsTrigger>
            <TabsTrigger value="produtos" className="whitespace-nowrap">Produtos</TabsTrigger>
            <TabsTrigger value="categorias" className="whitespace-nowrap">Categorias</TabsTrigger>
            <TabsTrigger value="pagamento" className="whitespace-nowrap">Formas de Pagamento</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="vendas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Faturamento Diário</CardTitle>
              <CardDescription>Evolução do faturamento ao longo do período</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  total: {
                    label: "Faturamento",
                    color: "#0088FE",
                  },
                  quantidade: {
                    label: "Quantidade",
                    color: "#00C49F",
                  },
                } satisfies ChartConfig}
                className="aspect-auto h-[350px] w-full"
              >
                <LineChart
                  accessibilityLayer
                  data={metricas?.vendasPorDia || []}
                  margin={{
                    left: 12,
                    right: 12,
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="data"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `R$ ${value}`}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                  />
                  <Legend />
                  <Line 
                    dataKey="total" 
                    name="Faturamento (R$)"
                    type="monotone"
                    stroke="var(--color-total)" 
                    strokeWidth={3}
                    dot={{
                      fill: "var(--color-total)",
                      r: 4,
                    }}
                    activeDot={{
                      r: 6,
                    }}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col items-start gap-2 text-sm">
              <div className="text-muted-foreground leading-none">
                Faturamento total: {formatarMoeda(metricas?.faturamentoTotal || 0)} | Ticket médio: {formatarMoeda(metricas?.ticketMedio || 0)}
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="produtos" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Produtos Mais Vendidos</CardTitle>
              <CardDescription>Top 10 produtos com maior saída</CardDescription>
            </CardHeader>
            <CardContent className="px-2 md:px-6">
              <ChartContainer
                config={{
                  quantidade: {
                    label: "Quantidade",
                    color: "#8884d8",
                  },
                } satisfies ChartConfig}
              >
                <BarChart
                  accessibilityLayer
                  data={metricas?.produtosMaisVendidos.slice(0, 10) || []}
                  layout="vertical"
                  margin={{
                    left: 0,
                    right: 8,
                  }}
                >
                  <XAxis type="number" dataKey="quantidade" hide />
                  <YAxis
                    dataKey="nome"
                    type="category"
                    tickLine={false}
                    tickMargin={4}
                    axisLine={false}
                    width={90}
                    interval={0}
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => {
                      // Truncar para 12 caracteres (mobile friendly)
                      if (value.length > 12) {
                        return value.substring(0, 12) + '...'
                      }
                      return value
                    }}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Bar dataKey="quantidade" fill="var(--color-quantidade)" radius={5} />
                </BarChart>
              </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col items-start gap-2 text-sm">
              <div className="text-muted-foreground leading-none">
                Mostrando os {metricas?.produtosMaisVendidos?.length || 0} produtos mais vendidos
              </div>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Faturamento por Produto</CardTitle>
              <CardDescription>Receita gerada por cada produto</CardDescription>
            </CardHeader>
            <CardContent className="px-2 md:px-6">
              <ChartContainer
                config={{
                  total: {
                    label: "Total (R$)",
                    color: "#82ca9d",
                  },
                } satisfies ChartConfig}
              >
                <BarChart
                  accessibilityLayer
                  data={metricas?.produtosMaisVendidos || []}
                  layout="vertical"
                  margin={{
                    left: 0,
                    right: 8,
                  }}
                >
                  <XAxis type="number" dataKey="total" hide />
                  <YAxis
                    dataKey="nome"
                    type="category"
                    tickLine={false}
                    tickMargin={4}
                    axisLine={false}
                    width={90}
                    interval={0}
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => {
                      // Truncar para 12 caracteres (mobile friendly)
                      if (value.length > 12) {
                        return value.substring(0, 12) + '...'
                      }
                      return value
                    }}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Bar dataKey="total" fill="var(--color-total)" radius={5} />
                </BarChart>
              </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col items-start gap-2 text-sm">
              <div className="flex gap-2 leading-none font-medium">
                <TrendingUp className="h-4 w-4" />
                Receita total dos produtos listados
              </div>
            </CardFooter>
          </Card>
          </div>
        </TabsContent>

        <TabsContent value="categorias" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Faturamento por Categoria</CardTitle>
                <CardDescription>Distribuição do faturamento por categoria de produtos</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={metricas?.vendasPorCategoria || []}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="total"
                      nameKey="categoria"
                      label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {metricas?.vendasPorCategoria.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatarMoeda(value)}
                      labelStyle={{ color: '#000' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Volume de Vendas por Categoria</CardTitle>
                <CardDescription>Quantidade de produtos vendidos por categoria</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metricas?.vendasPorCategoria || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="categoria" />
                    <YAxis />
                    <Tooltip labelStyle={{ color: '#000' }} />
                    <Legend />
                    <Bar dataKey="quantidade" fill="#8884d8" name="Quantidade" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pagamento" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="py-0">
              <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
                <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-6">
                  <CardTitle>Vendas por Forma de Pagamento</CardTitle>
                  <CardDescription>Análise de vendas por método de pagamento</CardDescription>
                </div>
                <div className="flex">
                  {["total", "quantidade"].map((key) => {
                    const totalValue = metricas?.faturamentoPorFormaPagamento?.reduce((acc, curr) => 
                      acc + (key === "total" ? curr.total : curr.quantidade), 0) || 0
                    return (
                      <button
                        key={key}
                        data-active={activeChartPagamento === key}
                        className="data-[active=true]:bg-muted/50 relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
                        onClick={() => setActiveChartPagamento(key as "total" | "quantidade")}
                      >
                        <span className="text-muted-foreground text-xs">
                          {key === "total" ? "Valor Total" : "Quantidade"}
                        </span>
                        <span className="text-lg leading-none font-bold sm:text-3xl">
                          {key === "total" ? formatarMoeda(totalValue) : totalValue}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </CardHeader>
              <CardContent className="px-2 sm:p-6">
                <ChartContainer
                  config={{
                    total: {
                      label: "Total (R$)",
                      color: "#0088FE",
                    },
                    quantidade: {
                      label: "Quantidade",
                      color: "#00C49F",
                    },
                  } satisfies ChartConfig}
                  className="aspect-auto h-[250px] w-full"
                >
                  <BarChart
                    accessibilityLayer
                    data={metricas?.faturamentoPorFormaPagamento || []}
                    margin={{
                      left: 12,
                      right: 12,
                    }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="forma"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => value.slice(0, 10)}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          className="w-[150px]"
                          nameKey="views"
                        />
                      }
                    />
                    <Bar 
                      dataKey={activeChartPagamento} 
                      fill={`var(--color-${activeChartPagamento})`}
                      radius={8}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Pagamentos</CardTitle>
                <CardDescription>Percentual de faturamento por forma de pagamento</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={metricas?.faturamentoPorFormaPagamento || []}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="total"
                      nameKey="forma"
                      label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {metricas?.faturamentoPorFormaPagamento.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatarMoeda(value)}
                      labelStyle={{ color: '#000' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Seção de Consumo Interno */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          🔄 Consumo Interno
        </h3>

        {/* Card resumo + Gráfico de evolução */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-1">
            <CardConsumoInterno
              dataInicio={dataInicio}
              dataFim={dataFim}
            />
          </div>
          <div className="md:col-span-2">
            <LineChartConsumoInterno
              dataInicio={dataInicio}
              dataFim={dataFim}
            />
          </div>
        </div>

        {/* Tabela de produtos consumidos */}
        <ListaConsumoInterno
          dataInicio={dataInicio}
          dataFim={dataFim}
        />
      </div>
    </div>
  )
}
