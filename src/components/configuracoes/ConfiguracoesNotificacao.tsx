import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Volume2, Play } from "lucide-react"
import { audioService } from "@/lib/audioService"

interface ConfiguracoesNotificacaoProps {
  somNotificacao: string
  volumeNotificacao: number
  onSomChange: (som: string) => void
  onVolumeChange: (volume: number) => void
}

/**
 * Componente para configurações de notificações sonoras
 * 
 * Permite selecionar o som de notificação, ajustar o volume e testar
 * a reprodução do som escolhido.
 */
export function ConfiguracoesNotificacao({
  somNotificacao,
  volumeNotificacao,
  onSomChange,
  onVolumeChange
}: ConfiguracoesNotificacaoProps) {
  const handleTestSound = () => {
    audioService.setVolume(volumeNotificacao / 100)
    audioService.testSound(somNotificacao)
  }

  const handleVolumeChange = (volume: number) => {
    onVolumeChange(volume)
    // Atualizar volume em tempo real
    audioService.setVolume(volume / 100)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Notificações Sonoras
        </CardTitle>
        <CardDescription>
          Configure os sons de notificação para novos pedidos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Seleção do Som */}
          <div className="space-y-2">
            <label htmlFor="som-notificacao" className="text-sm font-medium text-foreground/80">
              Som de Notificação
            </label>
            <select
              id="som-notificacao"
              name="som-notificacao"
              value={somNotificacao}
              onChange={(e) => onSomChange(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring/30"
            >
              {audioService.getSoundOptions().map(option => (
                <option key={option.key} value={option.key}>
                  {option.name}
                </option>
              ))}
            </select>
            
            {/* Botão de Teste */}
            {somNotificacao !== 'none' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestSound}
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Testar Som
              </Button>
            )}
          </div>

          {/* Controle de Volume */}
          <div className="space-y-2">
            <label htmlFor="volume-notificacao" className="text-sm font-medium text-foreground/80">
              Volume: {volumeNotificacao}%
            </label>
            <input
              id="volume-notificacao"
              name="volume-notificacao"
              type="range"
              min="0"
              max="100"
              step="5"
              value={volumeNotificacao}
              onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider"
              disabled={somNotificacao === 'none'}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* Informações sobre o Som */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Volume2 className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-primary">Como funciona</h4>
              <p className="text-sm text-primary mt-1">
                O som será reproduzido automaticamente quando um novo pedido for recebido no sistema. 
                Certifique-se de que o volume do seu navegador e sistema estejam habilitados.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
