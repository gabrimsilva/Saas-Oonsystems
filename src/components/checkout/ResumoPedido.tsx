import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ShoppingCart } from "lucide-react"
import type { ItemCarrinho } from "./types"
import type { Adicional } from "@/types/carrinho"

interface ResumoPedidoProps {
  carrinho: ItemCarrinho[]
  calcularPrecoItem: (item: ItemCarrinho) => number
  calcularSubtotal: () => number
  calcularTaxaEntrega?: () => number
  calcularTotal: () => number
}

const ResumoPedido = ({
  carrinho,
  calcularPrecoItem,
  calcularSubtotal,
  calcularTotal
}: ResumoPedidoProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          Resumo do Pedido
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {carrinho.map((item, index) => (
            <div key={index} className="flex gap-3 items-start">
              {/* Imagem do produto */}
              <img
                src={item.produto.urlImagem}
                alt={item.produto.nome}
                className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder-food.svg';
                }}
              />

              <div className="flex-1 min-w-0">
                <h4 className="font-medium">{item.produto.nome}</h4>
                <div className="text-sm text-muted-foreground">
                  {item.tamanhoSelecionado && (
                    <span>Tamanho: {item.tamanhoSelecionado.nome} • </span>
                  )}
                  {item.saboresSelecionados && item.saboresSelecionados.length > 0 && (
                    <span>Sabores: {item.saboresSelecionados.map(s => s.nome).join(', ')} • </span>
                  )}
                  {item.bordaSelecionada && (
                    <span>Borda: {item.bordaSelecionada.nome} • </span>
                  )}
                  {item.adicionaisSelecionados && item.adicionaisSelecionados.length > 0 && (
                    <span>Adicionais: {item.adicionaisSelecionados.map((a: Adicional) =>
                      `${a.quantidade}x ${a.nome}`
                    ).join(', ')} • </span>
                  )}
                  <span>Qtd: {item.quantidade}</span>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <span className="font-medium">
                  R$ {calcularPrecoItem(item).toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>
          ))}
        </div>

        <Separator className="my-4" />

        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>R$ {calcularSubtotal().toFixed(2).replace('.', ',')}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Retirada no local:</span>
            <span className="text-success font-medium">Grátis</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span>R$ {calcularTotal().toFixed(2).replace('.', ',')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ResumoPedido
