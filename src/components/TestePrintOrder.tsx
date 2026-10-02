import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Printer } from "lucide-react"
import PrintOrder from "./PrintOrder"
import PrintOrderPreview from "./PrintOrderPreview"
import { type PedidoSupabase } from "@/services"

export default function TestePrintOrder({ fontSizes: propFontSizes }: {
  fontSizes?: {
    base: number
    storeName: number
    sectionTitle: number
    itemSub: number
    totals: number
    totalFinal: number
  }
}) {
  const [mostrarTeste, setMostrarTeste] = useState(false)
  const [fontSizes, setFontSizes] = useState({
    base: 11,
    storeName: 16,
    sectionTitle: 11,
    itemSub: 10,
    totals: 12,
    totalFinal: 14
  })

  // Atualizar fontSizes quando receber via props
  useEffect(() => {
    if (propFontSizes) {
      setFontSizes(propFontSizes)
    }
  }, [propFontSizes])

  // Pedido de exemplo para teste
  const pedidoTeste: PedidoSupabase = {
    id: "1",
    pedido_id: "ped-123456789",
    codigo_pedido: "1234",
    cliente_nome: "João",
    cliente_sobrenome: "Silva",
    cliente_telefone: "(11) 99999-9999",
    cliente_email: "joao@email.com",
    cliente_endereco: "Rua das Flores, 123",
    cliente_numero: "123",
    cliente_complemento: "Apto 45",
    cliente_bairro: "Centro",
    cliente_cidade: "São Paulo",
    cliente_estado: "SP",
    cliente_cep: "01234-567",
    entrega_domicilio: true,
    forma_pagamento: "pix",
    precisa_troco: false,
    subtotal: 45.00,
    taxa_entrega: 5.00,
    total: 50.00,
    desconto: 0,
    tipo_desconto: 'valor',
    status: "Pedido criado",
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
    itens: [
      {
        quantidade: 1,
        produto: {
          nome: "Pizza Margherita",
          preco: 35.00,
          categoria: "Pizzas"
        },
        tamanhoSelecionado: {
          nome: "Grande",
          tamanho: "35cm",
          valor: 35.00
        },
        saboresSelecionados: [
          { nome: "Margherita" }
        ],
        bordaSelecionada: {
          nome: "Catupiry",
          valor: 0
        }
      },
      {
        quantidade: 1,
        produto: {
          nome: "Refrigerante 2L",
          preco: 10.00,
          categoria: "Bebidas"
        }
      }
    ]
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="h-5 w-5" />
          Teste de Impressão
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Use este botão para testar a funcionalidade de impressão com um pedido de exemplo.
        </p>
        
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={() => setMostrarTeste(!mostrarTeste)}
            variant="outline"
            className="flex-shrink-0"
          >
            {mostrarTeste ? 'Ocultar' : 'Mostrar'} Preview de Impressão
          </Button>
          
          {mostrarTeste && (
            <div className="flex-shrink-0">
              <PrintOrder pedido={pedidoTeste} />
            </div>
          )}
        </div>

        {mostrarTeste && (
          <div className="mt-6">
            <h4 className="font-medium mb-4 text-center">Preview da Impressão Térmica</h4>
            <PrintOrderPreview pedido={pedidoTeste} fontSizes={fontSizes} />
            <p className="text-xs text-muted-foreground text-center mt-2">
              O preview atualiza em tempo real conforme você altera os tamanhos de fonte
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}