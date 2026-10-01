import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { CreditCard } from "lucide-react"

interface FormasPagamento {
  dinheiro: boolean
  cartaoDebito: boolean
  cartaoCredito: boolean
  pix: boolean
}

interface FormasPagamentoConfigProps {
  formasPagamento: FormasPagamento
  onFormasPagamentoChange: (forma: keyof FormasPagamento, value: boolean) => void
}

/**
 * Componente para configuração de formas de pagamento
 * 
 * Formas que o cliente pode escolher para pagar na retirada/entrega (inclusive
 * nos pedidos do catálogo quando a loja não cobra online).
 */
export function FormasPagamentoConfig({
  formasPagamento,
  onFormasPagamentoChange
}: FormasPagamentoConfigProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Formas de Pagamento
        </CardTitle>
        <CardDescription>
          Formas aceitas para pagar na retirada/entrega
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
            <p className="text-sm text-muted-foreground">PIX da loja na retirada/entrega</p>
          </div>
          <Switch 
            checked={formasPagamento.pix}
            onChange={(checked: boolean) => onFormasPagamentoChange('pix', checked)}
          />
        </div>
        
      </CardContent>
    </Card>
  )
}
