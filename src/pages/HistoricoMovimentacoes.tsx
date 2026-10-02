import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Package, 
  Search, 
  Calendar, 
  TrendingUp,
  TrendingDown,
  Settings,
  AlertCircle,
  Filter,
  X
} from "lucide-react"
import { stockService, produtoService, type StockMovement } from "@/services"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CarregandoPagina } from '@/components/ui/feedback'
import { useTabelaResponsiva } from '@/hooks/useTabelaResponsiva'

interface MovementWithProduct extends StockMovement {
  product_name?: string
  variant_label?: string
}

export default function HistoricoMovimentacoes() {
  const tabelaRef = useTabelaResponsiva()
  const [movimentacoes, setMovimentacoes] = useState<MovementWithProduct[]>([])
  const [movimentacoesFiltradas, setMovimentacoesFiltradas] = useState<MovementWithProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [dataInicio, setDataInicio] = useState("")
  const [dataFim, setDataFim] = useState("")
  const [tipoMovimento, setTipoMovimento] = useState<string>("TODOS")
  const [produtoFiltro, setProdutoFiltro] = useState("")

  useEffect(() => {
    carregarMovimentacoes()
  }, [])

  useEffect(() => {
    aplicarFiltros()
  }, [movimentacoes, dataInicio, dataFim, tipoMovimento, produtoFiltro])

  const carregarMovimentacoes = async () => {
    try {
      setLoading(true)
      setError(null)

      // Buscar todos os itens de estoque
      const stockItems = await stockService.buscarTodos()

      // Buscar movimentações de cada item
      const todasMovimentacoes: MovementWithProduct[] = []

      for (const item of stockItems) {
        try {
          const movimentos = await stockService.buscarMovimentos(item.id)
          
          // Buscar nome do produto
          const produto = await produtoService.buscarPorId(item.product_id)
          
          // Buscar variantes se houver
          const variantes = await stockService.buscarVariantes(item.id)
          const variantesMap = new Map(variantes.map(v => [v.id, v.label ?? v.nome]))

          // Adicionar informações do produto a cada movimento.
          // As movimentações são gravadas em português (criado_em, tipo,
          // quantidade, motivo); normalizamos para o formato usado pela tela.
          const movimentosComProduto: MovementWithProduct[] = movimentos.map((mov: any) => {
            const tipoRaw = mov.type ?? mov.tipo ?? ''
            const tipoNorm = tipoRaw === 'entrada' ? 'IN'
              : tipoRaw === 'saida' ? 'OUT'
              : tipoRaw === 'ajuste' ? 'ADJUST'
              : tipoRaw

            return {
              ...mov,
              created_at: mov.created_at || mov.criado_em || new Date().toISOString(),
              type: tipoNorm,
              qty: mov.qty ?? mov.quantidade ?? 0,
              ref_type: mov.ref_type ?? mov.motivo,
              notes: mov.notes ?? mov.motivo,
              product_name: produto?.nome || 'Produto não encontrado',
              variant_label: mov.variant_id ? variantesMap.get(mov.variant_id) : undefined
            }
          })

          todasMovimentacoes.push(...movimentosComProduto)
        } catch (err) {
          console.error(`Erro ao carregar movimentações do item ${item.id}:`, err)
        }
      }

      // Ordenar por data (mais recentes primeiro)
      todasMovimentacoes.sort((a, b) => 
        new Date(b.created_at ?? '').getTime() - new Date(a.created_at ?? '').getTime()
      )

      setMovimentacoes(todasMovimentacoes)
    } catch (err) {
      console.error('Erro ao carregar movimentações:', err)
      setError('Erro ao carregar histórico de movimentações')
    } finally {
      setLoading(false)
    }
  }

  const aplicarFiltros = () => {
    let resultado = [...movimentacoes]

    // Filtro por data
    if (dataInicio) {
      const inicio = new Date(dataInicio)
      inicio.setHours(0, 0, 0, 0)
      resultado = resultado.filter(mov => {
        const dataMovimento = new Date(mov.created_at ?? '')
        return dataMovimento >= inicio
      })
    }

    if (dataFim) {
      const fim = new Date(dataFim)
      fim.setHours(23, 59, 59, 999)
      resultado = resultado.filter(mov => {
        const dataMovimento = new Date(mov.created_at ?? '')
        return dataMovimento <= fim
      })
    }

    // Filtro por tipo de movimento
    if (tipoMovimento !== "TODOS") {
      resultado = resultado.filter(mov => mov.type === tipoMovimento)
    }

    // Filtro por produto
    if (produtoFiltro) {
      resultado = resultado.filter(mov => 
        mov.product_name?.toLowerCase().includes(produtoFiltro.toLowerCase())
      )
    }

    setMovimentacoesFiltradas(resultado)
  }

  const limparFiltros = () => {
    setDataInicio("")
    setDataFim("")
    setTipoMovimento("TODOS")
    setProdutoFiltro("")
  }

  const formatarData = (data: string) => {
    const d = new Date(data)
    if (isNaN(d.getTime())) return '-'
    return format(d, "dd/MM/yyyy", { locale: ptBR })
  }

  const formatarHora = (data: string) => {
    const d = new Date(data)
    if (isNaN(d.getTime())) return '-'
    return format(d, "HH:mm", { locale: ptBR })
  }

  const formatarTipo = (tipo: string) => {
    const mapa: { [key: string]: string } = {
      'IN': 'Entrada',
      'OUT': 'Saída',
      'ADJUST': 'Ajuste'
    }
    return mapa[tipo] || tipo
  }

  const formatarReferencia = (refType?: string) => {
    if (!refType) return 'Manual'
    
    const mapa: { [key: string]: string } = {
      'VENDA': 'Venda',
      'COMANDA': 'Comanda',
      'MANUAL': 'Manual',
      'AJUSTE': 'Ajuste'
    }
    return mapa[refType] || refType
  }

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'IN':
        return <TrendingUp className="h-4 w-4 text-success" />
      case 'OUT':
        return <TrendingDown className="h-4 w-4 text-destructive" />
      case 'ADJUST':
        return <Settings className="h-4 w-4 text-primary" />
      default:
        return <Package className="h-4 w-4" />
    }
  }

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'IN':
        return 'bg-success/10 text-success'
      case 'OUT':
        return 'bg-destructive/10 text-destructive'
      case 'ADJUST':
        return 'bg-primary/10 text-primary'
      default:
        return 'bg-muted text-foreground'
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
          <Package className="h-6 w-6" />
          Histórico de Movimentações
        </h1>
        <p className="text-muted-foreground">
          Consulte todas as entradas, saídas e ajustes de estoque
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-destructive/5 border border-destructive/30 rounded-lg text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

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

            {/* Tipo de Movimento */}
            <div className="space-y-2">
              <Label htmlFor="tipoMovimento">Tipo de Movimento</Label>
              <select
                id="tipoMovimento"
                value={tipoMovimento}
                onChange={(e) => setTipoMovimento(e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background text-sm rounded-md"
              >
                <option value="TODOS">Todos</option>
                <option value="IN">Entrada</option>
                <option value="OUT">Saída</option>
                <option value="ADJUST">Ajuste</option>
              </select>
            </div>

            {/* Busca por Produto */}
            <div className="space-y-2">
              <Label htmlFor="produtoFiltro">Produto</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="produtoFiltro"
                  placeholder="Buscar produto..."
                  className="pl-8"
                  value={produtoFiltro}
                  onChange={(e) => setProdutoFiltro(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={limparFiltros}>
              <X className="h-4 w-4 mr-2" />
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Movimentações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Movimentações ({movimentacoesFiltradas.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {movimentacoesFiltradas.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                Nenhuma movimentação encontrada
              </h3>
              <p className="text-muted-foreground">
                {dataInicio || dataFim || tipoMovimento !== "TODOS" || produtoFiltro
                  ? "Tente ajustar os filtros"
                  : "Nenhuma movimentação foi registrada ainda"
                }
              </p>
            </div>
          ) : (
            <div ref={tabelaRef} className="tabela-responsiva overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Variante</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimentacoesFiltradas.map((mov) => (
                    <TableRow key={mov.id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatarData(mov.created_at ?? '')}
                        </div>
                      </TableCell>
                      <TableCell>{formatarHora(mov.created_at ?? '')}</TableCell>
                      <TableCell className="font-medium">
                        {mov.product_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {mov.variant_label || '-'}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTipoColor(mov.type ?? '')}`}>
                          {getTipoIcon(mov.type ?? '')}
                          {formatarTipo(mov.type ?? '')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {mov.type === 'OUT' ? '-' : '+'}{mov.qty}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {formatarReferencia(mov.ref_type)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {mov.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
