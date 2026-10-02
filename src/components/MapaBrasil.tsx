import { useMemo, useState, useEffect, useRef } from 'react'

interface LocationData {
  state: string
  users: number
  sessions: number
}

interface MapaBrasilProps {
  locations: LocationData[]
}

export default function MapaBrasil({ locations }: MapaBrasilProps) {
  const [hoveredState, setHoveredState] = useState<string | null>(null)
  const [svgContent, setSvgContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Função para remover acentos
  const removerAcentos = (str: string): string => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  }

  const extrairSiglaEstado = (state: string): string | null => {
    const mapeamento: Record<string, string> = {
      'acre': 'AC', 'ac': 'AC', 'alagoas': 'AL', 'al': 'AL',
      'amapa': 'AP', 'ap': 'AP', 'amazonas': 'AM', 'am': 'AM',
      'bahia': 'BA', 'ba': 'BA', 'ceara': 'CE', 'ce': 'CE',
      'distrito federal': 'DF', 'df': 'DF', 'espirito santo': 'ES', 'es': 'ES',
      'goias': 'GO', 'go': 'GO', 'maranhao': 'MA', 'ma': 'MA',
      'mato grosso': 'MT', 'mt': 'MT', 'mato grosso do sul': 'MS', 'ms': 'MS',
      'minas gerais': 'MG', 'mg': 'MG', 'para': 'PA', 'pa': 'PA',
      'paraiba': 'PB', 'pb': 'PB', 'parana': 'PR', 'pr': 'PR',
      'pernambuco': 'PE', 'pe': 'PE', 'piaui': 'PI', 'pi': 'PI',
      'rio de janeiro': 'RJ', 'rj': 'RJ', 'rio grande do norte': 'RN', 'rn': 'RN',
      'rio grande do sul': 'RS', 'rs': 'RS', 'rondonia': 'RO', 'ro': 'RO',
      'roraima': 'RR', 'rr': 'RR', 'santa catarina': 'SC', 'sc': 'SC',
      'sao paulo': 'SP', 'sp': 'SP', 'sergipe': 'SE', 'se': 'SE',
      'tocantins': 'TO', 'to': 'TO',
      'state of parana': 'PR', 'state of sao paulo': 'SP',
      'state of rio de janeiro': 'RJ', 'state of minas gerais': 'MG',
      'state of bahia': 'BA', 'state of rio grande do sul': 'RS',
      'state of santa catarina': 'SC', 'state of goias': 'GO',
      'state of pernambuco': 'PE', 'state of ceara': 'CE',
    }

    // Normaliza removendo acentos e convertendo para minúsculas
    const normalizado = removerAcentos(state.toLowerCase().trim())

    // Se já é uma sigla de 2 letras
    if (normalizado.length === 2) return normalizado.toUpperCase()

    // Busca exata primeiro
    if (mapeamento[normalizado]) return mapeamento[normalizado]

    // Busca por inclusão
    for (const [key, value] of Object.entries(mapeamento)) {
      if (normalizado.includes(key) || key.includes(normalizado)) return value
    }

    // Log para debug - estados não reconhecidos
    console.log('Estado não reconhecido:', state, '-> normalizado:', normalizado)
    return null
  }

  const dadosPorEstado = useMemo(() => {
    const agrupado: Record<string, number> = {}
    console.log('Locations recebidas:', locations)

    locations.forEach(loc => {
      const sigla = extrairSiglaEstado(loc.state)
      console.log(`Processando: "${loc.state}" -> sigla: ${sigla}, users: ${loc.users}`)
      if (sigla) agrupado[sigla] = (agrupado[sigla] || 0) + loc.users
    })

    console.log('Dados por estado:', agrupado)
    return agrupado
  }, [locations])

  const valores = Object.values(dadosPorEstado)
  const maxUsuarios = Math.max(...valores, 1)

  const getColor = (sigla: string) => {
    const usuarios = dadosPorEstado[sigla] || 0
    if (usuarios === 0) return '#E5E7EB'
    const intensity = usuarios / maxUsuarios
    if (intensity > 0.75) return '#1E40AF'
    if (intensity > 0.5) return '#3B82F6'
    if (intensity > 0.25) return '#60A5FA'
    return '#93C5FD'
  }

  const nomeEstados: Record<string, string> = {
    AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas',
    BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo',
    GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul',
    MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná',
    PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
    RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina',
    SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins'
  }

  // Carregar e processar o SVG
  useEffect(() => {
    setLoading(true)
    setError(null)

    fetch('/brazil.svg')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.text()
      })
      .then(svg => {
        console.log('SVG carregado com sucesso, tamanho:', svg.length)
        setSvgContent(svg)
        setLoading(false)
      })
      .catch(err => {
        console.error('Erro ao carregar SVG:', err)
        setError('Não foi possível carregar o mapa')
        setLoading(false)
      })
  }, [])

  // Aplicar cores ao SVG quando os dados mudarem
  useEffect(() => {
    if (!containerRef.current || !svgContent) return

    const container = containerRef.current
    container.innerHTML = svgContent

    const svgElement = container.querySelector('svg')
    if (svgElement) {
      svgElement.style.width = '100%'
      svgElement.style.height = 'auto'
      svgElement.style.maxWidth = '500px'

      // Remover atributos que podem interferir
      svgElement.removeAttribute('width')
      svgElement.removeAttribute('height')
      svgElement.setAttribute('viewBox', '0 0 612.51611 639.04297')
      svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet')

      // Aplicar cores a cada estado
      const paths = svgElement.querySelectorAll('path[id^="BR-"]')
      console.log('Paths encontrados:', paths.length)

      paths.forEach(path => {
        const id = path.getAttribute('id')
        if (id) {
          const sigla = id.replace('BR-', '')
          const cor = getColor(sigla)
          const usuarios = dadosPorEstado[sigla] || 0

          path.setAttribute('fill', cor)
          path.setAttribute('stroke', '#ffffff')
          path.setAttribute('stroke-width', '0.5')
          ;(path as HTMLElement).style.cursor = 'pointer'
          ;(path as HTMLElement).style.transition = 'all 0.2s ease'

          // Eventos de hover
          path.addEventListener('mouseenter', () => {
            setHoveredState(sigla)
            path.setAttribute('fill-opacity', '0.7')
            path.setAttribute('stroke', '#1F2937')
            path.setAttribute('stroke-width', '1.5')
          })

          path.addEventListener('mouseleave', () => {
            setHoveredState(null)
            path.setAttribute('fill-opacity', '1')
            path.setAttribute('stroke', '#ffffff')
            path.setAttribute('stroke-width', '0.5')
          })

          // Tooltip nativo
          path.setAttribute('title', `${nomeEstados[sigla] || sigla}: ${usuarios.toLocaleString()} usuários`)
        }
      })
    }
  }, [svgContent, dadosPorEstado])

  const legendaItems = [
    { color: '#1E40AF', label: 'Muito Alto' },
    { color: '#3B82F6', label: 'Alto' },
    { color: '#60A5FA', label: 'Médio' },
    { color: '#93C5FD', label: 'Baixo' },
    { color: '#E5E7EB', label: 'Sem dados' }
  ]

  return (
    <div className="space-y-6">
      {/* Mapa SVG */}
      <div className="flex justify-center bg-muted/50 rounded-lg p-4 min-h-[400px]">
        {loading && (
          <div className="flex items-center justify-center w-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center w-full text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div ref={containerRef} className="w-full flex justify-center" />
        )}
      </div>

      {/* Tooltip */}
      {hoveredState && (
        <div className="text-center py-2 bg-card border border-border rounded-lg shadow-sm">
          <span className="font-semibold text-foreground">{nomeEstados[hoveredState]}</span>
          <span className="text-muted-foreground"> ({hoveredState}): </span>
          <span className="font-bold text-primary">
            {(dadosPorEstado[hoveredState] || 0).toLocaleString()} usuários
          </span>
        </div>
      )}

      {/* Legenda */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-foreground/80 mb-3">Legenda</h4>
        <div className="flex flex-wrap gap-4 justify-center">
          {legendaItems.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-5 h-5 rounded border border-input" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Estados */}
      {Object.keys(dadosPorEstado).length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h4 className="text-sm font-semibold text-foreground/80 mb-3">Top Estados</h4>
          <div className="space-y-2">
            {Object.entries(dadosPorEstado)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([sigla, users], index) => (
                <div key={sigla} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-foreground/80">
                      {nomeEstados[sigla]}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {users.toLocaleString()} usuários
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
