import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Shield } from "lucide-react"
import { useFormatacao } from "@/hooks/useFormatacao"

interface ConfiguracoesGeraisProps {
  nomeEstabelecimento: string
  endereco: string
  cep: string
  telefone: string
  email: string
  onChange: (field: string, value: string) => void
}

/**
 * Componente para configurações gerais do estabelecimento
 * 
 * Gerencia informações básicas como nome, endereço e contatos.
 * Utiliza o hook useFormatacao para formatar telefones automaticamente.
 */
export function ConfiguracoesGerais({
  nomeEstabelecimento,
  endereco,
  cep,
  telefone,
  email,
  onChange
}: ConfiguracoesGeraisProps) {
  const { formatarTelefone } = useFormatacao()

  const handleTelefoneChange = (field: string, value: string) => {
    const telefoneFormatado = formatarTelefone(value)
    onChange(field, telefoneFormatado)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Configurações gerais
        </CardTitle>
        <CardDescription>
          Informações básicas do estabelecimento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <label htmlFor="nome-estabelecimento" className="text-sm font-medium">Nome do Estabelecimento</label>
          <Input
            id="nome-estabelecimento"
            name="nome-estabelecimento"
            placeholder="Digite o nome do seu estabelecimento" 
            value={nomeEstabelecimento}
            onChange={(e) => onChange('nomeEstabelecimento', e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="endereco-config" className="text-sm font-medium">Endereço</label>
          <Input
            id="endereco-config"
            name="endereco-config"
            placeholder="Endereço completo" 
            value={endereco}
            onChange={(e) => onChange('endereco', e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="cep-config" className="text-sm font-medium">CEP</label>
          <Input
            id="cep-config"
            name="cep-config"
            placeholder="00000-000" 
            value={cep}
            onChange={(e) => onChange('cep', e.target.value)}
            maxLength={9}
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="telefone-config" className="text-sm font-medium">Telefone</label>
          <Input
            id="telefone-config"
            name="telefone-config"
            placeholder="(11) 9 9999-9999" 
            value={telefone}
            onChange={(e) => handleTelefoneChange('telefone', e.target.value)}
            maxLength={16}
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="email-config" className="text-sm font-medium">Email</label>
          <Input
            id="email-config"
            name="email-config"
            placeholder="contato@estabelecimento.com" 
            value={email}
            onChange={(e) => onChange('email', e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  )
}
