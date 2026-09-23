import { useState, useEffect } from "react"
import { ActionButton } from "@/components/ui/action-button"
import { Save, Loader2, CheckCircle } from "lucide-react"
import { configuracaoService } from "@/services"
import { FormasPagamentoConfig } from "@/components/configuracoes/FormasPagamentoConfig"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function ConfiguracoesPagamentoPage() {
  const [formasPagamento, setFormasPagamento] = useState({
    dinheiro: true,
    cartaoDebito: true,
    cartaoCredito: true,
    pix: true
  })
  const [mercadoPagoAccessToken, setMercadoPagoAccessToken] = useState('')
  const [mercadoPagoWebhookSecret, setMercadoPagoWebhookSecret] = useState('')
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
        if (cfg.chave === 'metodos_pagamento') {
          try {
            const metodos = JSON.parse(cfg.valor)
            setFormasPagamento({
              dinheiro: metodos.includes('dinheiro'),
              cartaoDebito: metodos.includes('cartao_debito'),
              cartaoCredito: metodos.includes('cartao_credito'),
              pix: metodos.includes('pix')
            })
          } catch (e) {
            console.error('Erro ao parsear métodos de pagamento:', e)
          }
        } else if (cfg.chave === 'mercado_pago_access_token') {
          setMercadoPagoAccessToken(cfg.valor)
        } else if (cfg.chave === 'mercado_pago_webhook_secret') {
          setMercadoPagoWebhookSecret(cfg.valor)
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

      const metodosPagamento = [
        ...(formasPagamento.dinheiro ? ['dinheiro'] : []),
        ...(formasPagamento.cartaoDebito ? ['cartao_debito'] : []),
        ...(formasPagamento.cartaoCredito ? ['cartao_credito'] : []),
        ...(formasPagamento.pix ? ['pix'] : [])
      ]

      const promises = [
        configuracaoService.salvar('metodos_pagamento', JSON.stringify(metodosPagamento), 'Métodos de pagamento aceitos', 'json', 'pagamento')
      ]

      // Salvar Access Token do Mercado Pago se PIX estiver ativado
      if (formasPagamento.pix && mercadoPagoAccessToken) {
        promises.push(
          configuracaoService.salvar('mercado_pago_access_token', mercadoPagoAccessToken, 'Access Token do Mercado Pago para pagamentos PIX', 'texto', 'pagamento')
        )
      }

      // Salvar Webhook Secret do Mercado Pago se fornecido
      if (formasPagamento.pix && mercadoPagoWebhookSecret) {
        promises.push(
          configuracaoService.salvar('mercado_pago_webhook_secret', mercadoPagoWebhookSecret, 'Assinatura secreta do webhook do Mercado Pago', 'texto', 'pagamento')
        )
      }

      await Promise.all(promises)

      setShowSuccessDialog(true)
    } catch (err) {
      console.error('Erro ao salvar configurações:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleFormasPagamentoChange = (forma: keyof typeof formasPagamento, value: boolean) => {
    setFormasPagamento({ ...formasPagamento, [forma]: value })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Formas de Pagamento</h2>
        <p className="text-muted-foreground">
          Configure os métodos de pagamento aceitos
        </p>
      </div>

      <FormasPagamentoConfig
        formasPagamento={formasPagamento}
        mercadoPagoAccessToken={mercadoPagoAccessToken}
        mercadoPagoWebhookSecret={mercadoPagoWebhookSecret}
        onFormasPagamentoChange={handleFormasPagamentoChange}
        onMercadoPagoAccessTokenChange={setMercadoPagoAccessToken}
        onMercadoPagoWebhookSecretChange={setMercadoPagoWebhookSecret}
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
              <CheckCircle className="h-5 w-5 text-green-600" />
              Sucesso!
            </AlertDialogTitle>
            <AlertDialogDescription>
              Formas de pagamento salvas com sucesso!
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
