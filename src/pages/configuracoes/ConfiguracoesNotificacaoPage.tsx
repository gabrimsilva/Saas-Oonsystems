import { useState, useEffect } from "react"
import { ActionButton } from "@/components/ui/action-button"
import { Save, CheckCircle } from "lucide-react"
import { configuracaoService } from "@/services"
import { ConfiguracoesNotificacao } from "@/components/configuracoes/ConfiguracoesNotificacao"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { CarregandoPagina } from '@/components/ui/feedback'

export default function ConfiguracoesNotificacaoPage() {
  const [somNotificacao, setSomNotificacao] = useState('ding1')
  const [volumeNotificacao, setVolumeNotificacao] = useState(70)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)

  useEffect(() => {
    carregarConfiguracoes()
  }, [])

  const carregarConfiguracoes = async () => {
    try {
      const configuracoes = await configuracaoService.buscarTodas()
      
      configuracoes.forEach(cfg => {
        if (cfg.chave === 'som_notificacao') {
          setSomNotificacao(cfg.valor || 'ding1')
        } else if (cfg.chave === 'volume_notificacao') {
          setVolumeNotificacao(parseInt(cfg.valor) || 70)
        }
      })
    } catch (err) {
      console.error('Erro ao carregar configurações:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSalvar = async () => {
    try {
      setSaving(true)

      await Promise.all([
        configuracaoService.salvar('som_notificacao', somNotificacao, 'Som de notificação para novos pedidos', 'texto', 'notificacao'),
        configuracaoService.salvar('volume_notificacao', volumeNotificacao.toString(), 'Volume das notificações sonoras', 'numero', 'notificacao')
      ])

      setShowSuccessDialog(true)
    } catch (err) {
      console.error('Erro ao salvar configurações:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <CarregandoPagina variante="formulario" />
  }

  return (
    <div className="container mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Notificações</h2>
        <p className="text-muted-foreground">
          Configure sons e alertas de novos pedidos
        </p>
      </div>

      <ConfiguracoesNotificacao
        somNotificacao={somNotificacao}
        volumeNotificacao={volumeNotificacao}
        onSomChange={setSomNotificacao}
        onVolumeChange={setVolumeNotificacao}
      />

      <div className="flex justify-end">
        <ActionButton onClick={handleSalvar} loading={saving}>
          <Save className="h-4 w-4 mr-2" />
          Salvar Configurações
        </ActionButton>
      </div>

      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Sucesso!
            </AlertDialogTitle>
            <AlertDialogDescription>
              Configurações de notificação salvas com sucesso!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
