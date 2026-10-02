import { useState, useEffect } from "react"
import { ActionButton } from "@/components/ui/action-button"
import { Save, CheckCircle } from "lucide-react"
import { configuracaoService } from "@/services"
import { ConfiguracoesVisuais } from "@/components/configuracoes/ConfiguracoesVisuais"
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

export default function ConfiguracoesVisuaisPage() {
  const [config, setConfig] = useState({
    logoUrl: '',
    bannerUrl: ''
  })
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
        switch (cfg.chave) {
          case 'logo_url':
            setConfig(prev => ({ ...prev, logoUrl: cfg.valor }))
            break
          case 'banner_url':
            setConfig(prev => ({ ...prev, bannerUrl: cfg.valor }))
            break
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
        configuracaoService.salvar('logo_url', config.logoUrl, 'URL do logo da loja', 'texto', 'visual'),
        configuracaoService.salvar('banner_url', config.bannerUrl, 'URL do banner principal', 'texto', 'visual')
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
        <h2 className="text-2xl font-bold">Aparência</h2>
        <p className="text-muted-foreground">
          Personalize a identidade visual do sistema
        </p>
      </div>

      <ConfiguracoesVisuais
        logoUrl={config.logoUrl}
        bannerUrl={config.bannerUrl}
        onLogoChange={(url) => setConfig({ ...config, logoUrl: url })}
        onBannerChange={(url) => setConfig({ ...config, bannerUrl: url })}
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
              Configurações visuais salvas com sucesso!
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
