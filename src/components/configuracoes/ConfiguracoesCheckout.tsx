import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Globe } from "lucide-react"

interface ConfiguracoesCheckoutProps {
  modoCardapioWhatsapp: boolean
  onModoCardapioWhatsappChange: (value: boolean) => void
}

/**
 * Componente para configurações de checkout
 * 
 * Permite ativar o modo cardápio com WhatsApp para checkout simplificado.
 * Por padrão, o sistema usa checkout step-by-step.
 */
export function ConfiguracoesCheckout({
  modoCardapioWhatsapp,
  onModoCardapioWhatsappChange
}: ConfiguracoesCheckoutProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Configurações de Checkout
        </CardTitle>
        <CardDescription>
          Configure o tipo de checkout e modos especiais
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-muted/50 border border-border rounded-lg mb-4">
          <p className="text-sm text-foreground/80">
            <strong>ℹ️ Checkout Padrão:</strong> O sistema usa checkout step-by-step dividido em etapas:
            <br />
            1) Dados para entrega, 2) Informações de pagamento
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Ativar Modo Cardápio com WhatsApp</p>
            <p className="text-sm text-muted-foreground">
              Quando ativado, usa checkout simplificado pedindo apenas Nome e WhatsApp
            </p>
          </div>
          <Switch 
            checked={modoCardapioWhatsapp}
            onChange={onModoCardapioWhatsappChange}
          />
        </div>
        
        {modoCardapioWhatsapp && (
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-start gap-2">
              <div className="text-primary mt-0.5">ℹ️</div>
              <div className="text-sm text-primary">
                <p className="font-medium mb-1">Como funciona:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Cliente escolhe produtos normalmente</li>
                  <li>No checkout, pede apenas Nome e WhatsApp</li>
                  <li>Pedido é enviado automaticamente para o WhatsApp da loja</li>
                  <li>Ideal para clientes que estão no estabelecimento</li>
                </ul>
                <p className="mt-2 font-medium">
                  ⚠️ Certifique-se de que o WhatsApp da loja está configurado corretamente acima.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
