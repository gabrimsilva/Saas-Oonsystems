/**
 * Lista de Produtos de Consumo Interno
 * 
 * Task 3.2: Exibe a lista dos produtos consumidos internamente
 * no período selecionado com quantidade e frequência
 */

import { useState, useEffect } from 'react'
import { supabase, tenantId } from '@/services'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { AlertCircle, Package, Loader2 } from 'lucide-react'

interface ProdutoConsumo {
  nome: string
  quantidade: number
  unidade?: string
  precoUnitario: number
  valorTotal: number
}

interface ListaConsumoInternoProps {
  dataInicio: Date
  dataFim: Date
}

export default function ListaConsumoInterno({ dataInicio, dataFim }: ListaConsumoInternoProps) {
  const [produtos, setProdutos] = useState<ProdutoConsumo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    carregarProdutosConsumo()
  }, [dataInicio, dataFim])

  const carregarProdutosConsumo = async () => {
    try {
      setCarregando(true)
      setErro(null)

      const estabelecimentoId = tenantId()
      if (!estabelecimentoId) {
        setErro('Estabelecimento não identificado')
        return
      }

      // Usar formato de data simples (YYYY-MM-DD) para evitar problemas de timezone
      const formatarData = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }

      const inicio = `${formatarData(dataInicio)}T00:00:00Z`
      const fimAjustado = `${formatarData(new Date(dataFim.getTime() + 24 * 60 * 60 * 1000))}T00:00:00Z`

      console.log('🔍 [LISTA_CONSUMO] Filtro aplicado:', {
        dataInicio: dataInicio.toLocaleDateString('pt-BR'),
        dataFim: dataFim.toLocaleDateString('pt-BR'),
        inicio,
        fimAjustado
      })

      // Buscar vendas de consumo interno em sales (fonte gravada pelo PDV)
      const { data: vendasInternas, error: erroVendas } = await supabase
        .from('sales')
        .select('id, items')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('sale_type', 'INTERNAL_CONSUMPTION')
        .gte('created_at', inicio)
        .lt('created_at', fimAjustado) // Usar < ao invés de <=

      if (erroVendas && erroVendas.code !== 'PGRST116') throw erroVendas

      // Agregar produtos por nome (+ variante quando houver)
      const produtosMap = new Map<string, { quantidade: number; precoUnitario: number }>()

      if (vendasInternas) {
        vendasInternas.forEach((venda) => {
          const items = Array.isArray(venda.items) ? venda.items : []
          items.forEach((item: any) => {
            // Suportar ambas estruturas: nova (produto) e antiga (product_name)
            const nomeBase = item.produto?.nome || item.product_name || 'Produto sem nome'
            const variante = item.variantName || item.produto?.variantName
            const nome = variante ? `${nomeBase} - ${variante}` : nomeBase
            const quantidade = item.quantidade || item.quantity || 0
            const precoUnitario = item.precoUnitario || item.produto?.preco || item.unit_price || 0
            const atual = produtosMap.get(nome) || { quantidade: 0, precoUnitario }
            produtosMap.set(nome, {
              quantidade: atual.quantidade + quantidade,
              precoUnitario: atual.precoUnitario || precoUnitario
            })
          })
        })
      }

      // Converter Map para Array e ordenar por quantidade decrescente
      const produtosOrdenados = Array.from(produtosMap.entries())
        .map(([nome, dados]) => ({
          nome,
          quantidade: dados.quantidade,
          precoUnitario: dados.precoUnitario,
          valorTotal: dados.quantidade * dados.precoUnitario,
          unidade: 'un'
        }))
        .sort((a, b) => b.quantidade - a.quantidade)

      setProdutos(produtosOrdenados)

      console.log('✅ [LISTA_CONSUMO] Produtos carregados:', {
        periodo: `${dataInicio.toLocaleDateString('pt-BR')} a ${dataFim.toLocaleDateString('pt-BR')}`,
        quantidade: produtosOrdenados.length,
        total: produtosOrdenados.reduce((sum, p) => sum + p.quantidade, 0),
        vendasInternas: vendasInternas?.length || 0,
        detalhes: produtosOrdenados.map(p => `${p.nome}: ${p.quantidade}`)
      })
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : 'Erro ao carregar produtos'
      setErro(mensagem)
      console.error('❌ [LISTA_CONSUMO] Erro ao carregar:', error)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Produtos Consumidos
        </CardTitle>
        <CardDescription>
          Detalhamento dos produtos consumidos internamente no período
        </CardDescription>
      </CardHeader>
      <CardContent>
        {carregando ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Carregando produtos...</span>
            </div>
          </div>
        ) : erro ? (
          <div className="flex items-center gap-2 p-4 bg-destructive/5 border border-destructive/30 rounded-lg text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{erro}</span>
          </div>
        ) : produtos.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">Nenhum produto consumido neste período</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-left">Produto</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="text-right">Unidade</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtos.map((produto, index) => (
                  <TableRow key={`${produto.nome}-${index}`} className="border-border hover:bg-accent">
                    <TableCell className="font-medium text-foreground">
                      {produto.nome}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-foreground/80">
                      {produto.quantidade.toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {produto.unidade}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-success">
                      R$ {produto.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Linha de total */}
                <TableRow className="border-t-2 border-input bg-muted/50 font-semibold">
                  <TableCell className="text-foreground">
                    TOTAL
                  </TableCell>
                  <TableCell className="text-right text-foreground">
                    {produtos.reduce((sum, p) => sum + p.quantidade, 0).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right">
                    un
                  </TableCell>
                  <TableCell className="text-right text-success text-base">
                    R$ {produtos.reduce((sum, p) => sum + p.valorTotal, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
