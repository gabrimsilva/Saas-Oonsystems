import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  Package,
  Star,
  TrendingUp,
  ClipboardList,
  CalendarIcon
} from "lucide-react"
import { CartaoIndicador } from '@/components/ui/indicador'
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { produtoService, supabase, getEstabelecimentoAtivo } from "@/services"

interface DashboardStats {
  unidadesVendidasPDV: number
  produtosCadastrados: number
  avaliacaoMedia: number
  totalAvaliacoes: number
}

interface ProdutoFavorito {
  nome: string
  quantidade: number
  categoria: string
  imagem?: string
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    unidadesVendidasPDV: 0,
    produtosCadastrados: 0,
    avaliacaoMedia: 0,
    totalAvaliacoes: 0
  })
  const [produtosFavoritos, setProdutosFavoritos] = useState<ProdutoFavorito[]>([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState<string>("hoje")
  const [dataCustom, setDataCustom] = useState<Date | undefined>(undefined)

  useEffect(() => {
    carregarDados()
  }, [periodo, dataCustom])

  const getPeriodoTexto = () => {
    switch (periodo) {
      case "hoje":
        return "Hoje"
      case "7dias":
        return "Últimos 7 dias"
      case "15dias":
        return "Últimos 15 dias"
      case "30dias":
        return "Últimos 30 dias"
      case "90dias":
        return "Últimos 90 dias"
      case "tudo":
        return "Todo o período"
      case "custom":
        return dataCustom ? format(dataCustom, "dd/MM/yyyy", { locale: ptBR }) : "Data específica"
      default:
        return "Hoje"
    }
  }

  const getDataRange = () => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const fim = new Date()
    fim.setHours(23, 59, 59, 999)

    if (periodo === "custom" && dataCustom) {
      const dataInicio = new Date(dataCustom)
      dataInicio.setHours(0, 0, 0, 0)
      const dataFim = new Date(dataCustom)
      dataFim.setHours(23, 59, 59, 999)
      return { inicio: dataInicio, fim: dataFim }
    }

    switch (periodo) {
      case "hoje":
        return { inicio: hoje, fim }
      case "7dias":
        const seteDiasAtras = new Date(hoje)
        seteDiasAtras.setDate(hoje.getDate() - 7)
        return { inicio: seteDiasAtras, fim }
      case "15dias":
        const quinzeDiasAtras = new Date(hoje)
        quinzeDiasAtras.setDate(hoje.getDate() - 15)
        return { inicio: quinzeDiasAtras, fim }
      case "30dias":
        const trintaDiasAtras = new Date(hoje)
        trintaDiasAtras.setDate(hoje.getDate() - 30)
        return { inicio: trintaDiasAtras, fim }
      case "90dias":
        const noventaDiasAtras = new Date(hoje)
        noventaDiasAtras.setDate(hoje.getDate() - 90)
        return { inicio: noventaDiasAtras, fim }
      case "tudo":
        // Retorna desde 2020 até hoje (ou uma data bem antiga)
        const inicioTudo = new Date(2020, 0, 1)
        return { inicio: inicioTudo, fim }
      default:
        return { inicio: hoje, fim }
    }
  }

  const carregarDados = async () => {
    try {
      setLoading(true)
      const { inicio, fim } = getDataRange()

      // Carregar dados em paralelo
      const [
        unidadesPDV,
        produtos,
        produtosFavoritosData,
        { media, total }
      ] = await Promise.all([
        carregarUnidadesVendidasPDV(inicio, fim),
        carregarProdutosCadastrados(),
        carregarProdutosFavoritos(inicio, fim),
        carregarAvaliacaoMedia()
      ])

      setStats({
        unidadesVendidasPDV: unidadesPDV,
        produtosCadastrados: produtos,
        avaliacaoMedia: media,
        totalAvaliacoes: total
      })

      setProdutosFavoritos(produtosFavoritosData)

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const carregarUnidadesVendidasPDV = async (inicio: Date, fim: Date): Promise<number> => {
    try {
      const estabId = getEstabelecimentoAtivo()
      // Buscar vendas PDV (tabela sales, tipo PDV)
      let pdvQuery = supabase
        .from('sales')
        .select('items')
        .eq('sale_type', 'PDV')
        .gte('created_at', inicio.toISOString())
        .lte('created_at', fim.toISOString())
      if (estabId) pdvQuery = pdvQuery.eq('estabelecimento_id', estabId)
      const { data: pdvData, error: pdvError } = await pdvQuery

      if (pdvError) throw pdvError

      // Contar unidades vendidas (soma das quantidades)
      const unidades = (pdvData || []).reduce((sum, venda) => {
        const itens = Array.isArray(venda.items) ? venda.items : []
        return sum + itens.reduce((itemSum: number, item: any) => itemSum + (item.quantidade || 0), 0)
      }, 0)

      return unidades
    } catch (error) {
      console.error('Erro ao carregar unidades vendidas PDV:', error)
      return 0
    }
  }

  const carregarProdutosCadastrados = async (): Promise<number> => {
    try {
      const produtos = await produtoService.buscarTodos()
      return produtos.filter(p => p.ativo).length
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
      return 0
    }
  }

  const carregarAvaliacaoMedia = async (): Promise<{ media: number, total: number }> => {
    try {
      const estabId = getEstabelecimentoAtivo()
      let query = supabase
        .from('avaliacoes')
        .select('estrelas')
        .eq('aprovada', true)
      if (estabId) query = query.eq('estabelecimento_id', estabId)
      const { data, error } = await query

      if (error) throw error

      if (!data || data.length === 0) {
        return { media: 0, total: 0 } // Sem avaliações ainda
      }

      const soma = data.reduce((acc, avaliacao) => acc + avaliacao.estrelas, 0)
      const media = soma / data.length

      return {
        media: parseFloat(media.toFixed(1)),
        total: data.length
      }
    } catch (error) {
      console.error('Erro ao carregar avaliação média:', error)
      return { media: 0, total: 0 }
    }
  }

  const carregarProdutosFavoritos = async (inicio: Date, fim: Date): Promise<ProdutoFavorito[]> => {
    try {
      // Buscar pedidos do período (ativos e histórico), excluindo cancelados
      const estabId = getEstabelecimentoAtivo()
      let qAtivos = supabase
        .from('pedidos')
        .select('itens, criado_em, status, cancelado')
        .gte('criado_em', inicio.toISOString())
        .lte('criado_em', fim.toISOString())
        .neq('status', 'Cancelado')
        .neq('cancelado', true)
      if (estabId) qAtivos = qAtivos.eq('estabelecimento_id', estabId)
      let qHistorico = supabase
        .from('historico_geral')
        .select('itens, criado_em, status')
        .gte('criado_em', inicio.toISOString())
        .lte('criado_em', fim.toISOString())
        .neq('status', 'Cancelado')
      if (estabId) qHistorico = qHistorico.eq('estabelecimento_id', estabId)
      const [pedidosAtivos, pedidosHistorico] = await Promise.all([qAtivos, qHistorico])

      const todosPedidos = [
        ...(pedidosAtivos.data || []),
        ...(pedidosHistorico.data || [])
      ]

      // Contar produtos
      const contadorProdutos: Record<string, { quantidade: number, categoria: string, imagem?: string }> = {}

      todosPedidos.forEach(pedido => {
        if (pedido.itens && Array.isArray(pedido.itens)) {
          pedido.itens.forEach((item: any) => {
            const nomeProduto = item.produto?.nome || 'Produto sem nome'
            const categoria = item.produto?.categoria || item.produto?.categoria_nome || 'Outros'
            const imagem = item.produto?.urlImagem || item.produto?.imagem_path
            const quantidade = item.quantidade || 1

            if (!contadorProdutos[nomeProduto]) {
              contadorProdutos[nomeProduto] = { quantidade: 0, categoria, imagem }
            }
            contadorProdutos[nomeProduto].quantidade += quantidade
          })
        }
      })

      // Converter para array e ordenar por quantidade
      const produtosFavoritosTemp = Object.entries(contadorProdutos)
        .map(([nome, data]) => ({
          nome,
          quantidade: data.quantidade,
          categoria: data.categoria,
          imagem: data.imagem
        }))
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 5) // Top 5

      // Buscar imagens dos produtos diretamente da tabela produtos
      const nomesProdutos = produtosFavoritosTemp.map(p => p.nome)
      let qProdImg = supabase
        .from('produtos')
        .select('nome, imagem_path')
        .in('nome', nomesProdutos)
      if (estabId) qProdImg = qProdImg.eq('estabelecimento_id', estabId)
      const { data: produtosData } = await qProdImg

      // Mapear imagens aos produtos favoritos
      const produtosFavoritos = produtosFavoritosTemp.map(produto => {
        const produtoDb = produtosData?.find(p => p.nome === produto.nome)
        return {
          ...produto,
          imagem: produtoDb?.imagem_path || produto.imagem
        }
      })

      return produtosFavoritos
    } catch (error) {
      console.error('Erro ao carregar produtos favoritos:', error)
      return []
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6 bg-gray-50/30">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-8 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className="container mx-auto p-6 space-y-4 bg-gray-50/30">
      {/* Header Desktop */}
      <div className="hidden md:flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral das suas vendas e produtos
          </p>
        </div>
      </div>

      {/* Header Mobile */}
      <div className="md:hidden text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Visão geral das suas vendas e produtos
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-3">
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hoje">Hoje</SelectItem>
            <SelectItem value="7dias">Últimos 7 dias</SelectItem>
            <SelectItem value="15dias">Últimos 15 dias</SelectItem>
            <SelectItem value="30dias">Últimos 30 dias</SelectItem>
            <SelectItem value="90dias">Últimos 90 dias</SelectItem>
            <SelectItem value="tudo">Todo o período</SelectItem>
            <SelectItem value="custom">Data específica</SelectItem>
          </SelectContent>
        </Select>

        {periodo === "custom" && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full md:w-[200px] justify-start text-left font-normal h-10",
                  !dataCustom && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dataCustom ? format(dataCustom, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={dataCustom}
                onSelect={setDataCustom}
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Indicadores principais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CartaoIndicador
          titulo="Produtos vendidos"
          valor={stats.unidadesVendidasPDV}
          descricao={getPeriodoTexto()}
          icone={ClipboardList}
          tom="primario"
        />
        <CartaoIndicador
          titulo="Produtos cadastrados"
          valor={stats.produtosCadastrados}
          descricao="Produtos ativos"
          icone={Package}
        />
        <CartaoIndicador
          titulo="Avaliação média"
          valor={
            <span className="flex items-center gap-2">
              {stats.avaliacaoMedia || '0.0'}
              <span className="flex" aria-label={`${Math.round(stats.avaliacaoMedia)} de 5 estrelas`}>
                {[1, 2, 3, 4, 5].map((estrela) => (
                  <Star
                    key={estrela}
                    className={`size-4 ${estrela <= Math.round(stats.avaliacaoMedia) ? 'text-amber-400 fill-current' : 'text-border-strong'}`}
                  />
                ))}
              </span>
            </span>
          }
          descricao={stats.avaliacaoMedia > 0
            ? `${stats.totalAvaliacoes} ${stats.totalAvaliacoes === 1 ? 'avaliação' : 'avaliações'}`
            : 'Sem avaliações ainda'}
          icone={Star}
          tom="atencao"
        />
      </div>

      {/* Seção de produtos favoritos */}
      <div className="grid gap-4 lg:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-foreground/80" />
              Produtos Mais Vendidos
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Os produtos mais vendidos no período selecionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {produtosFavoritos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhuma venda registrada no período selecionado</p>
              </div>
            ) : (
              <div className="space-y-4">
                {produtosFavoritos.map((produto, index) => (
                  <div key={produto.nome} className="flex items-center justify-between p-3 md:p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center space-x-3 md:space-x-4 flex-1 min-w-0">
                      <div className="relative w-12 h-12 md:w-14 md:h-14 flex-shrink-0">
                        <div className="w-full h-full rounded-full overflow-hidden border-2 border-border">
                          <img
                            src={produto.imagem || '/placeholder-food.svg'}
                            alt={produto.nome}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/placeholder-food.svg';
                            }}
                          />
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-white font-bold text-xs border-2 border-white shadow-md ${
                          index === 0 ? 'bg-primary' :
                          index === 1 ? 'bg-slate-500' :
                          index === 2 ? 'bg-slate-400' : 'bg-slate-300'
                        }`}>
                          {index + 1}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground text-sm md:text-base truncate">{produto.nome}</p>
                        <p className="text-xs md:text-sm text-muted-foreground capitalize">{produto.categoria}</p>
                        {index === 0 && (
                          <Badge className="mt-1">
                            Mais Vendido
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xl md:text-2xl font-bold text-foreground">{produto.quantidade}</p>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        {produto.quantidade === 1 ? 'venda' : 'vendas'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}