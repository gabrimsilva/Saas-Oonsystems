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
  Receipt, 
  Search, 
  Calendar,
  Loader2,
  AlertCircle,
  Filter,
  X,
  Eye,
  Printer,
  Trash2
} from "lucide-react"
import { vendaService, receiptService, type Sale } from "@/services"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import VisualizarCupomModal from "@/components/VisualizarCupomModal"
import { toast } from 'react-hot-toast'

export default function HistoricoVendas() {
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

  // Modal de cupom
  const [modalCupomAberto, setModalCupomAberto] = useState(false)
  const [cupomHTML, setCupomHTML] = useState("")
  const [vendaSelecionada, setVendaSelecionada] = useState<Sale | null>(null)
  const [gerandoCupom, setGerandoCupom] = useState(false)

  // Exclusão de venda
  const [excluindoVenda, setExcluindoVenda] = useState<string | null>(null)

  useEffect(() => {
    carregarVendas()
  }, [dataInicio, dataFim]) // Recarregar quando as datas mudarem

  useEffect(() => {
    aplicarFiltros()
  }, [vendas, formaPagamento, tipoVenda, termoBusca]) // Aplicar filtros locais

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
      resultado = resultado.filter(venda => venda.payment_method === formaPagamento)
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

    setVendasFiltradas(resultado)
  }

  const limparFiltros = () => {
    setDataInicio("")
    setDataFim("")
    setFormaPagamento("TODAS")
    setTipoVenda("TODOS")
    setTermoBusca("")
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

  const formatarFormaPagamento = (metodo: string) => {
    const mapa: { [key: string]: string } = {
      'CASH': 'Dinheiro',
      'DEBIT': 'Débito',
      'CREDIT': 'Crédito',
      'PIX': 'PIX'
    }
    return mapa[metodo] || metodo
  }

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
    if (!window.confirm(`Tem certeza que deseja excluir a venda ${venda.sale_number}?\n\nEsta ação não pode ser desfeita e a venda será removida das métricas.`)) {
      return
    }

    try {
      setExcluindoVenda(venda.id)
      
      await vendaService.excluir(venda.id)
      
      // Remover da lista local
      setVendas(vendas.filter(v => v.id !== venda.id))
      
      toast.success('Venda excluída com sucesso')
    } catch (error) {
      console.error('Erro ao excluir venda:', error)
      toast.error('Erro ao excluir venda')
    } finally {
      setExcluindoVenda(null)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Carregando histórico...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Receipt className="h-6 w-6" />
          Histórico de Vendas
        </h1>
        <p className="text-muted-foreground">
          Consulte todas as vendas realizadas no PDV
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
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
                {termoBusca || dataInicio || dataFim || formaPagamento !== "TODAS" || tipoVenda !== "TODOS"
                  ? "Tente ajustar os filtros"
                  : "Nenhuma venda foi realizada ainda"
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
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
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatarData(venda.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>{formatarHora(venda.created_at)}</TableCell>
                      <TableCell className="font-semibold text-green-600">
                        {formatarValor(venda.total_amount)}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          {formatarFormaPagamento(venda.payment_method)}
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
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
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
