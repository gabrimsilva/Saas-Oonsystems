import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User } from "lucide-react"
import type { DadosCliente } from "./types"

interface FormularioRetiradaProps {
  dadosCliente: DadosCliente
  handleInputChange: (field: keyof DadosCliente, value: string | boolean) => void
  handleTelefoneChange: (value: string) => void
  clienteExistente: any
  enderecoEstabelecimento: string
}

const FormularioRetirada = ({
  dadosCliente,
  handleInputChange,
  handleTelefoneChange,
  clienteExistente,
  enderecoEstabelecimento
}: FormularioRetiradaProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Seus Dados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="telefone">WhatsApp *</Label>
          <Input
            id="telefone"
            type="tel"
            value={dadosCliente.telefone}
            onChange={(e) => handleTelefoneChange(e.target.value)}
            placeholder="(41) 9 9999-9999"
            maxLength={16}
          />
          {clienteExistente && (
            <div className="mt-2 p-2 bg-success/5 border border-success/30 rounded-md">
              <p className="text-sm text-success">
                ✅ Cliente encontrado!
                <span className="text-xs block">
                  {clienteExistente.total_pedidos || 0} pedido(s) anterior(es) •
                  Total gasto: R$ {(clienteExistente.valor_total_gasto || 0).toFixed(2).replace('.', ',')}
                </span>
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              value={dadosCliente.nome}
              onChange={(e) => handleInputChange('nome', e.target.value)}
              placeholder="Seu nome"
            />
          </div>

          <div>
            <Label htmlFor="sobrenome">Sobrenome *</Label>
            <Input
              id="sobrenome"
              value={dadosCliente.sobrenome}
              onChange={(e) => handleInputChange('sobrenome', e.target.value)}
              placeholder="Seu sobrenome"
            />
          </div>
        </div>

        {/* Endereço da loja */}
        <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <h3 className="font-medium text-primary mb-2">📍 Endereço da Loja</h3>
          <p className="text-primary">{enderecoEstabelecimento}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default FormularioRetirada
