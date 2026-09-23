import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { CreditCard } from "lucide-react"

interface FormasPagamento {
  dinheiro: boolean
  cartaoDebito: boolean
  cartaoCredito: boolean
  pix: boolean
}

interface FormasPagamentoConfigProps {
  formasPagamento: FormasPagamento
  mercadoPagoAccessToken?: string
  mercadoPagoWebhookSecret?: string
  onFormasPagamentoChange: (forma: keyof FormasPagamento, value: boolean) => void
  onMercadoPagoAccessTokenChange?: (value: string) => void
  onMercadoPagoWebhookSecretChange?: (value: string) => void
}

/**
 * Componente para configuração de formas de pagamento
 * 
 * Permite habilitar/desabilitar diferentes métodos de pagamento aceitos
 * pelo estabelecimento, incluindo configuração de tickets promocionais.
 */
export function FormasPagamentoConfig({
  formasPagamento,
  mercadoPagoAccessToken = '',
  mercadoPagoWebhookSecret = '',
  onFormasPagamentoChange,
  onMercadoPagoAccessTokenChange,
  onMercadoPagoWebhookSecretChange
}: FormasPagamentoConfigProps) {
  // Estados para controlar edição
  const [editandoToken, setEditandoToken] = React.useState(false)
  const [editandoSecret, setEditandoSecret] = React.useState(false)

  // Função para mascarar o token (mostra apenas os primeiros 10 caracteres)
  const mascararToken = (token: string) => {
    if (!token) return ''
    if (token.length <= 10) return token
    return token.substring(0, 10) + '...'
  }

  // Valor exibido no campo: primeiros 10 caracteres + asteriscos
  const valorExibidoTokenComAsteriscos = mercadoPagoAccessToken 
    ? mascararToken(mercadoPagoAccessToken) + '**********************'
    : ''

  const valorExibidoSecretComAsteriscos = mercadoPagoWebhookSecret 
    ? mascararToken(mercadoPagoWebhookSecret) + '**********************'
    : ''
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Formas de Pagamento
        </CardTitle>
        <CardDescription>
          Configure as formas de pagamento aceitas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Dinheiro</p>
            <p className="text-sm text-muted-foreground">Pagamento em espécie na entrega</p>
          </div>
          <Switch 
            checked={formasPagamento.dinheiro}
            onChange={(checked: boolean) => onFormasPagamentoChange('dinheiro', checked)}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Cartão de Débito</p>
            <p className="text-sm text-muted-foreground">Maquininha na entrega</p>
          </div>
          <Switch 
            checked={formasPagamento.cartaoDebito}
            onChange={(checked: boolean) => onFormasPagamentoChange('cartaoDebito', checked)}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Cartão de Crédito</p>
            <p className="text-sm text-muted-foreground">Maquininha na entrega</p>
          </div>
          <Switch 
            checked={formasPagamento.cartaoCredito}
            onChange={(checked: boolean) => onFormasPagamentoChange('cartaoCredito', checked)}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">PIX</p>
            <p className="text-sm text-muted-foreground">Pagamento via QR Code (Mercado Pago)</p>
          </div>
          <Switch 
            checked={formasPagamento.pix}
            onChange={(checked: boolean) => onFormasPagamentoChange('pix', checked)}
          />
        </div>
        
        {formasPagamento.pix && (
          <div className="grid gap-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            {/* Access Token */}
            <div className="grid gap-2">
              <label htmlFor="mercado-pago-token" className="text-sm font-medium text-indigo-900">
                Access Token do Mercado Pago
              </label>
              {mercadoPagoAccessToken && !editandoToken ? (
                <>
                  <div className="flex gap-2">
                    <Input
                      id="mercado-pago-token"
                      name="mercado-pago-token"
                      value={valorExibidoTokenComAsteriscos}
                      readOnly
                      className="font-mono text-sm bg-gray-100 cursor-not-allowed flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditandoToken(true)}
                      className="text-red-600 hover:text-red-700 shrink-0"
                    >
                      Alterar Token
                    </Button>
                  </div>
                  <p className="text-xs text-green-700">
                    ✅ Token configurado: {mascararToken(mercadoPagoAccessToken)}
                  </p>
                </>
              ) : (
                <>
                  <Input
                    id="mercado-pago-token"
                    name="mercado-pago-token"
                    placeholder="Cole seu Access Token aqui" 
                    defaultValue=""
                    onChange={(e) => onMercadoPagoAccessTokenChange?.(e.target.value)}
                    type="password"
                    className="font-mono text-sm"
                  />
                  {editandoToken && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditandoToken(false)}
                      className="text-gray-600"
                    >
                      Cancelar
                    </Button>
                  )}
                </>
              )}
              <p className="text-xs text-indigo-700">
                🔐 Obtenha seu Access Token em:{' '}
                <a 
                  href="https://www.mercadopago.com.br/developers/panel/app" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:text-indigo-900"
                >
                  Mercado Pago Developers
                </a>
              </p>
              <p className="text-xs text-indigo-600">
                💡 Use o token de <strong>TESTE</strong> para testar e o de <strong>PRODUÇÃO</strong> para vendas reais
              </p>
            </div>
            
            {/* Assinatura Secreta do Webhook */}
            <div className="grid gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <label htmlFor="mercado-pago-webhook-secret" className="text-sm font-medium text-yellow-900">
                Assinatura Secreta do Webhook (Opcional)
              </label>
              {mercadoPagoWebhookSecret && !editandoSecret ? (
                <>
                  <div className="flex gap-2">
                    <Input
                      id="mercado-pago-webhook-secret"
                      name="mercado-pago-webhook-secret"
                      value={valorExibidoSecretComAsteriscos}
                      readOnly
                      className="font-mono text-sm bg-gray-100 cursor-not-allowed flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditandoSecret(true)}
                      className="text-red-600 hover:text-red-700 shrink-0"
                    >
                      Alterar
                    </Button>
                  </div>
                  <p className="text-xs text-green-700">
                    ✅ Assinatura configurada: {mascararToken(mercadoPagoWebhookSecret)}
                  </p>
                </>
              ) : (
                <>
                  <Input
                    id="mercado-pago-webhook-secret"
                    name="mercado-pago-webhook-secret"
                    placeholder="Cole a assinatura secreta gerada pelo Mercado Pago" 
                    defaultValue=""
                    onChange={(e) => onMercadoPagoWebhookSecretChange?.(e.target.value)}
                    type="password"
                    className="font-mono text-sm"
                  />
                  {editandoSecret && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditandoSecret(false)}
                      className="text-gray-600"
                    >
                      Cancelar
                    </Button>
                  )}
                </>
              )}
              <p className="text-xs text-yellow-700">
                🔒 Assinatura secreta gerada ao configurar o webhook no Mercado Pago. Adiciona camada extra de segurança.
              </p>
            </div>
          </div>
        )}
        
      </CardContent>
    </Card>
  )
}
