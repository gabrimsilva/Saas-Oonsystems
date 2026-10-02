/**
 * LineChart de Evolução de Consumo Interno
 * 
 * Task 3.2: Gráfico de linha mostrando evolução temporal
 * com granularidades dia/semana/mês e responsividade
 */

import { useState, useEffect } from 'react'
import { useConsumoInterno } from '@/hooks/useConsumoInterno'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { AlertCircle, TrendingUp } from 'lucide-react'
import { subDays, startOfDay, endOfDay } from 'date-fns'
import { format } from 'date-fns'

type Granularidade = 'dia' | 'semana' | 'mes'

interface LineChartConsumoInternoProps {
  dataInicio?: Date
  dataFim?: Date
}

interface DadoGrafico {
  periodo: string
  total_unidades: number
  total_transacoes: number
  media_unidades_transacao: number
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as DadoGrafico
    return (
      <div className="bg-card p-3 border border-input rounded shadow-lg">
        <p className="font-semibold text-foreground">{data.periodo}</p>
        <p className="text-sm text-primary">
          Unidades: {data.total_unidades}
        </p>
        <p className="text-sm text-success">
          Transações: {data.total_transacoes}
        </p>
        <p className="text-sm text-warning-foreground">
          Média: {data.media_unidades_transacao.toFixed(2)}
        </p>
      </div>
    )
  }
  return null
}

export default function LineChartConsumoInterno({ dataInicio: dataInicioExterno, dataFim: dataFimExterno }: LineChartConsumoInternoProps) {
  const { obterPorPeriodo, carregando, erro, limparErro } = useConsumoInterno()

  const [granularidade, setGranularidade] = useState<Granularidade>('dia')
  const [dados, setDados] = useState<DadoGrafico[]>([])

  // Carregar dados quando datas externas mudam
  useEffect(() => {
    carregarDados()
  }, [dataInicioExterno, dataFimExterno, granularidade])

  const carregarDados = async () => {
    try {
      limparErro()

      // Usar datas externas se disponíveis
      const inicio = dataInicioExterno || startOfDay(subDays(new Date(), 30))
      const fim = dataFimExterno || endOfDay(new Date())

      console.log('📈 [LINECHART] Carregando consumos:', {
        granularidade,
        inicio: format(inicio, 'yyyy-MM-dd'),
        fim: format(fim, 'yyyy-MM-dd')
      })

      const consumos = await obterPorPeriodo(inicio, fim, granularidade)
      setDados(consumos)

      console.log('✅ [LINECHART] Dados carregados:', consumos.length, 'períodos')
    } catch (error) {
      console.error('❌ [LINECHART] Erro ao carregar dados:', error)
    }
  }

  // Calcular estatísticas
  const stats = {
    totalUnidades: dados.reduce((sum, d) => sum + d.total_unidades, 0),
    totalTransacoes: dados.reduce((sum, d) => sum + d.total_transacoes, 0),
    maxPeriodo: dados.length > 0 ? Math.max(...dados.map(d => d.total_unidades)) : 0,
    minPeriodo: dados.length > 0 ? Math.min(...dados.map(d => d.total_unidades)) : 0
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Evolução de Consumo Interno
            </CardTitle>
            <CardDescription>
              Histórico de consumo ao longo do tempo
            </CardDescription>
          </div>

          {/* Seletor de Granularidade */}
          <Select value={granularidade} onValueChange={(value) => setGranularidade(value as Granularidade)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dia">Por dia</SelectItem>
              <SelectItem value="semana">Por semana</SelectItem>
              <SelectItem value="mes">Por mês</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {carregando ? (
          <div className="h-80 bg-muted/60 rounded flex items-center justify-center">
            <div className="text-center">
              <div className="h-12 w-12 border-4 border-input border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-muted-foreground">Carregando dados...</p>
            </div>
          </div>
        ) : erro ? (
          <div className="h-80 flex items-center justify-center">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{erro}</span>
            </div>
          </div>
        ) : dados.length === 0 ? (
          <div className="h-80 flex items-center justify-center bg-muted/50 rounded">
            <div className="text-center text-muted-foreground">
              <p className="font-semibold">Nenhum dado disponível</p>
              <p className="text-sm mt-1">Não há consumos registrados para o período selecionado</p>
            </div>
          </div>
        ) : (
          <>
            {/* Estatísticas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 p-3 bg-muted/50 rounded">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold text-foreground">{stats.totalUnidades}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Transações</p>
                <p className="text-lg font-bold text-foreground">{stats.totalTransacoes}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pico</p>
                <p className="text-lg font-bold text-warning-foreground">{stats.maxPeriodo}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mínimo</p>
                <p className="text-lg font-bold text-success">{stats.minPeriodo}</p>
              </div>
            </div>

            {/* Gráfico */}
            <ResponsiveContainer width="100%" height={350}>
              <LineChart
                data={dados}
                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="periodo"
                  stroke="#666"
                  style={{ fontSize: '12px' }}
                  angle={dados.length > 20 ? -45 : 0}
                  textAnchor={dados.length > 20 ? 'end' : 'middle'}
                  height={dados.length > 20 ? 80 : 30}
                />
                <YAxis
                  stroke="#666"
                  style={{ fontSize: '12px' }}
                  label={{ value: 'Unidades', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={36}
                  wrapperStyle={{ paddingBottom: '15px' }}
                />
                <Line
                  type="monotone"
                  dataKey="total_unidades"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  dot={dados.length <= 30}
                  activeDot={{ r: 6 }}
                  name="Unidades Consumidas"
                  isAnimationActive={true}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Info adicional */}
            <div className="mt-4 p-3 bg-info/5 rounded text-sm text-info">
              <p className="font-semibold">Dica</p>
              <p className="mt-1">
                Mude a granularidade (dia/semana/mês) para visualizar diferentes níveis de detalhe
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
