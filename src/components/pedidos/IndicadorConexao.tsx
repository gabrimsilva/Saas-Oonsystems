import { Button } from "@/components/ui/button"
import { Wifi, WifiOff } from "lucide-react"

/**
 * Props do componente IndicadorConexao
 */
interface IndicadorConexaoProps {
  /** Indica se a conexão realtime está ativa */
  conectado: boolean
  /** Data/hora da última atualização */
  ultimaAtualizacao: Date
  /** Callback para reconectar manualmente */
  onReconectar: () => void
  /** Indica se está em processo de carregamento */
  carregando?: boolean
  /** Variante de exibição (desktop ou mobile) */
  variante?: 'desktop' | 'mobile'
}

/**
 * Componente que exibe o status da conexão realtime e permite reconexão manual
 * 
 * @example
 * ```tsx
 * // Versão desktop (padrão)
 * <IndicadorConexao
 *   conectado={realtimeConnected}
 *   ultimaAtualizacao={lastUpdate}
 *   onReconectar={reconectarRealtime}
 *   carregando={loading}
 * />
 * 
 * // Versão mobile
 * <IndicadorConexao
 *   conectado={realtimeConnected}
 *   ultimaAtualizacao={lastUpdate}
 *   onReconectar={reconectarRealtime}
 *   variante="mobile"
 * />
 * ```
 */
export function IndicadorConexao({
  conectado,
  ultimaAtualizacao,
  onReconectar,
  carregando = false,
  variante = 'desktop'
}: IndicadorConexaoProps) {
  // Versão mobile - mais compacta
  if (variante === 'mobile') {
    return (
      <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
        {conectado ? (
          <div className="flex items-center gap-1 text-success">
            <Wifi className="h-4 w-4" />
            <span>Online</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-warning-foreground">
            <WifiOff className="h-4 w-4" />
            <span>Offline</span>
          </div>
        )}
        <span className="text-muted-foreground text-xs">
          {ultimaAtualizacao.toLocaleTimeString()}
        </span>
      </div>
    )
  }

  // Versão desktop - completa
  return (
    <div className="flex items-center gap-3">
      {/* Status da Conexão */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {conectado ? (
          <div className="flex items-center gap-1 text-success">
            <Wifi className="h-4 w-4" />
            <span>Online</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-warning-foreground">
            <WifiOff className="h-4 w-4" />
            <span>Offline</span>
          </div>
        )}
        <span className="text-muted-foreground">
          Última atualização: {ultimaAtualizacao.toLocaleTimeString()}
        </span>
      </div>

      {/* Botão de Reconexão (apenas quando offline) */}
      {!conectado && (
        <Button
          variant="outline"
          size="sm"
          onClick={onReconectar}
          disabled={carregando}
          className="flex items-center gap-2 text-warning-foreground border-warning/30 hover:bg-warning/10"
        >
          <Wifi className="h-4 w-4" />
          Reconectar
        </Button>
      )}
    </div>
  )
}
