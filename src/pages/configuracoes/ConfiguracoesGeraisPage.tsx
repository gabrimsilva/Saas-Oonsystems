import { useState, useEffect } from "react"
import { ActionButton } from "@/components/ui/action-button"
import { Save, CheckCircle, AlertCircle } from "lucide-react"
import { configuracaoService } from "@/services"
import { useFormatacao } from "@/hooks/useFormatacao"
import { ConfiguracoesGerais } from "@/components/configuracoes/ConfiguracoesGerais"
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

export default function ConfiguracoesGeraisPage() {
  const [config, setConfig] = useState({
    nomeEstabelecimento: '',
    endereco: '',
    cep: '',
    telefone: '',
    email: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { formatarTelefone } = useFormatacao()

  useEffect(() => {
    carregarConfiguracoes()
  }, [])

  const carregarConfiguracoes = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const configuracoes = await configuracaoService.buscarTodas()

      const configCarregada = {
        nomeEstabelecimento: '',
        endereco: '',
        cep: '',
        telefone: '',
        email: ''
      }

      configuracoes.forEach(cfg => {
        switch (cfg.chave) {
          case 'nome_estabelecimento':
            configCarregada.nomeEstabelecimento = cfg.valor
            break
          case 'endereco':
            configCarregada.endereco = cfg.valor
            break
          case 'cep':
            configCarregada.cep = cfg.valor
            break
          case 'telefone':
            configCarregada.telefone = formatarTelefone(cfg.valor)
            break
          case 'email':
            configCarregada.email = cfg.valor
            break
        }
      })

      setConfig(configCarregada)
    } catch (err) {
      console.error('Erro ao carregar configurações:', err)
      setError(`Erro ao carregar configurações: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSalvar = async () => {
    try {
      setSaving(true)
      setError(null)

      const configuracoesParaSalvar = [
        { chave: 'nome_estabelecimento', valor: config.nomeEstabelecimento, categoria: 'loja', descricao: 'Nome do estabelecimento' },
        { chave: 'endereco', valor: config.endereco, categoria: 'loja', descricao: 'Endereço' },
        { chave: 'cep', valor: config.cep, categoria: 'loja', descricao: 'CEP' },
        { chave: 'telefone', valor: config.telefone, categoria: 'loja', descricao: 'Telefone WhatsApp' },
        { chave: 'email', valor: config.email, categoria: 'loja', descricao: 'Email' }
      ]

      for (const cfg of configuracoesParaSalvar) {
        await configuracaoService.salvar(cfg.chave, cfg.valor, cfg.descricao, undefined, cfg.categoria)
      }

      setShowSuccessDialog(true)
    } catch (err) {
      console.error('Erro ao salvar configurações:', err)
      setError('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  const handleConfigChange = (field: string, value: string) => {
    setConfig({ ...config, [field]: value })
  }

  if (loading) {
    return <CarregandoPagina variante="formulario" />
  }

  return (
    <div className="container mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Informações Gerais</h2>
        <p className="text-muted-foreground">
          Configure os dados básicos do estabelecimento
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-destructive/5 border border-destructive/30 rounded-lg text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      <ConfiguracoesGerais
        nomeEstabelecimento={config.nomeEstabelecimento}
        endereco={config.endereco}
        cep={config.cep}
        telefone={config.telefone}
        email={config.email}
        onChange={handleConfigChange}
      />

      <div className="flex justify-end gap-2">
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
              Configurações salvas com sucesso!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowSuccessDialog(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
