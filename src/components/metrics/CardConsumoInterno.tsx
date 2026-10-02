/**
 * Card de Métricas - Total de Consumo Interno
 * 
 * Task 3.1: Exibe o total de unidades consumidas internamente
 * com período selecionável e indicador de variação
 */

import { useState, useEffect } from 'react'
import { useConsumoInterno } from '@/hooks/useConsumoInterno'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TrendingUp, TrendingDown, Zap, AlertCircle } from 'lucide-react'
import { subDays, subMonths, startOfDay, endOfDay } from 'date-fns'

type Periodo = '7d' | '30d' | '90d' | '1y'

interface PeriodoConfig {
  label: string
  calcularData: () => { inicio: Date; fim: Date }
}

const PERIODOS: Record<Periodo, PeriodoConfig> = {
  '7d': {
    label: 'Últimos 7 dias',
    calcularData: () => ({
      inicio: startOfDay(subDays(new Date(), 7)),
      fim: endOfDay(new Date())
    })
  },
  '30d': {
    label: 'Últimos 30 dias',
    calcularData: () => ({
      inicio: startOfDay(subDays(new Date(), 30)),
      fim: endOfDay(new Date())
    })
  },
  '90d': {
    label: 'Últimos 90 dias',
    calcularData: () => ({
      inicio: startOfDay(subDays(new Date(), 90)),
      fim: endOfDay(new Date())
    })
  },
  '1y': {
    label: 'Último ano',
    calcularData: () => ({
      inicio: startOfDay(subMonths(new Date(), 12)),
      fim: endOfDay(new Date())
    })
  }
}

interface CardConsumoInternoProps {
  dataInicio?: Date
  dataFim?: Date
}

export default function CardConsumoInterno({ dataInicio: dataInicioExterno, dataFim: dataFimExterno }: CardConsumoInternoProps) {
  const { obterPorPeriodo, carregando, erro, limparErro } = useConsumoInterno()
  
  const [periodo, setPeriodo] = useState<Periodo>('30d')
  const [totalAtual, setTotalAtual] = useState(0)
  const [totalAnterior, setTotalAnterior] = useState(0)
  const [usandoFiltroExterno, setUsandoFiltroExterno] = useState(false)

  // Carregar dados quando período muda OU quando datas externas mudam
  useEffect(() => {
    carregarDados()
  }, [periodo, dataInicioExterno, dataFimExterno])

  const carregarDados = async () => {
    try {
      limparErro()
      
      let inicio: Date
      let fim: Date
      let ehFiltroExterno = false

      // Se há datas externas, usar elas (filtro do usuário)
      if (dataInicioExterno && dataFimExterno) {
        inicio = dataInicioExterno
        fim = dataFimExterno
        ehFiltroExterno = true
        setUsandoFiltroExterno(true)
      } else {
        // Senão, usar as datas pré-configuradas do card
        const config = PERIODOS[periodo]
        const datas = config.calcularData()
        inicio = datas.inicio
        fim = datas.fim
        setUsandoFiltroExterno(false)
      }

      // Carregar consumos do período atual
      const consumosAtual = await obterPorPeriodo(inicio, fim, 'dia')
      const totalAtualVal = consumosAtual.reduce((sum, c) => sum + c.total_unidades, 0)
      setTotalAtual(totalAtualVal)

      // Só calcular período anterior se NÃO for filtro externo
      if (!ehFiltroExterno) {
        // Calcular período anterior (mesma duração)
        const duracao = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
        const fimAnterior = new Date(inicio)
        const inicioAnterior = new Date(fimAnterior)
        inicioAnterior.setDate(inicioAnterior.getDate() - duracao)

        // Carregar consumos do período anterior
        const consumosAnterior = await obterPorPeriodo(inicioAnterior, fimAnterior, 'dia')
        const totalAnteriorVal = consumosAnterior.reduce((sum, c) => sum + c.total_unidades, 0)
        setTotalAnterior(totalAnteriorVal)
      } else {
        // Se for filtro externo, não mostrar comparação
        setTotalAnterior(0)
      }

      console.log('📊 [CARD_CONSUMO] Dados carregados:', {
        periodo,
        filtroExterno: ehFiltroExterno,
        dataInicio: inicio.toLocaleDateString('pt-BR'),
        dataFim: fim.toLocaleDateString('pt-BR'),
        totalAtual: totalAtualVal,
        totalAnterior: ehFiltroExterno ? 'N/A (filtro externo)' : totalAnterior
      })
    } catch (error) {
      console.error('❌ [CARD_CONSUMO] Erro ao carregar dados:', error)
    }
  }

  // Calcular variação
  const calcularVariacao = (): { percentual: number; sinal: 'up' | 'down' | 'equal' } => {
    if (totalAnterior === 0) {
      return { percentual: 0, sinal: totalAtual > 0 ? 'up' : 'equal' }
    }
    const variacao = ((totalAtual - totalAnterior) / totalAnterior) * 100
    if (variacao > 0) return { percentual: Math.round(variacao), sinal: 'up' }
    if (variacao < 0) return { percentual: Math.round(Math.abs(variacao)), sinal: 'down' }
    return { percentual: 0, sinal: 'equal' }
  }

  const variacao = calcularVariacao()
  const statusVisual = totalAtual === 0 ? 'neutral' : variacao.sinal === 'up' ? 'alto' : 'normal'

  return (
    <Card className={`${
      statusVisual === 'alto' 
        ? 'border-warning/30 bg-warning/10' 
        : statusVisual === 'neutral'
        ? 'border-border bg-muted/50'
        : 'border-success/30 bg-success/5'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Consumo Interno
            </CardTitle>
            <CardDescription>
              {usandoFiltroExterno 
                ? 'Total de unidades consumidas no período selecionado'
                : 'Total de unidades consumidas internamente'
              }
            </CardDescription>
          </div>
          {!usandoFiltroExterno && (
            <Select value={periodo} onValueChange={(value) => setPeriodo(value as Periodo)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
                <SelectItem value="1y">Último ano</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {carregando ? (
          <div className="space-y-4">
            <div className="h-12 bg-muted rounded animate-pulse" />
            <div className="h-6 bg-muted rounded animate-pulse w-1/2" />
          </div>
        ) : erro ? (
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{erro}</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Total Grande */}
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-foreground">
                {totalAtual.toLocaleString('pt-BR')}
              </div>
              <div className="text-sm text-muted-foreground">unidades</div>
            </div>

            {/* Variação (não mostrar se filtro externo) */}
            {!usandoFiltroExterno && totalAnterior > 0 && (
              <div className="flex items-center gap-2">
                {variacao.sinal === 'up' ? (
                  <>
                    <TrendingUp className="h-4 w-4 text-warning-foreground" />
                    <span className="text-sm font-semibold text-warning-foreground">
                      +{variacao.percentual}% vs período anterior
                    </span>
                  </>
                ) : variacao.sinal === 'down' ? (
                  <>
                    <TrendingDown className="h-4 w-4 text-success" />
                    <span className="text-sm font-semibold text-success">
                      -{variacao.percentual}% vs período anterior
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-semibold text-muted-foreground">
                    — Sem variação vs período anterior
                  </span>
                )}
              </div>
            )}



            {/* Mensagem se sem dados */}
            {totalAtual === 0 && (
              <div className="p-3 bg-muted rounded text-sm text-foreground/80">
                Nenhum consumo registrado neste período
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
