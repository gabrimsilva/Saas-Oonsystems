import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { User, MapPin, Search } from "lucide-react"
import { clienteService } from "@/services"
import { type DadosClientePDV } from "./types"

interface ModalClienteProps {
  isOpen: boolean
  onClose: () => void
  dadosCliente: DadosClientePDV
  setDadosCliente: (dados: DadosClientePDV) => void
  entregaDomicilio: boolean
  // Removido onTaxaExtraChange (simplificado)
}

export default function ModalCliente({
  isOpen,
  onClose,
  dadosCliente,
  setDadosCliente,
  entregaDomicilio
}: ModalClienteProps) {
  const [buscandoCliente, setBuscandoCliente] = useState(false)
  const [buscandoCEP, setBuscandoCEP] = useState(false)
  // Removido validação de entrega e taxa extra (simplificado)

  const formatarTelefone = (telefone: string) => {
    // Remove tudo que não é número
    const numeros = telefone.replace(/\D/g, '')
    
    // Aplica a máscara (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
    if (numeros.length === 0) return ''
    if (numeros.length <= 2) return `(${numeros}`
    if (numeros.length <= 6) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`
    if (numeros.length <= 10) return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`
    if (numeros.length === 11) return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`
    
    return telefone
  }

  const buscarClientePorTelefone = async (telefone: string) => {
    // Remove formatação para buscar
    const telefoneNumeros = telefone.replace(/\D/g, '')
    
    if (telefoneNumeros.length < 10) return

    try {
      setBuscandoCliente(true)
      
      // Buscar cliente pelo telefone
      const clientes = await clienteService.buscarTodos()
      const clienteEncontrado = clientes.find(cliente => 
        cliente.telefone.replace(/\D/g, '') === telefoneNumeros
      )

      if (clienteEncontrado) {
        setDadosCliente({
          nome: clienteEncontrado.nome || '',
          sobrenome: clienteEncontrado.sobrenome || '',
          telefone: formatarTelefone(clienteEncontrado.telefone),
          email: clienteEncontrado.email || '',
          endereco: clienteEncontrado.endereco || '',
          numero: clienteEncontrado.numero || '',
          complemento: clienteEncontrado.complemento || '',
          bairro: clienteEncontrado.bairro || '',
          cidade: clienteEncontrado.cidade || '',
          estado: clienteEncontrado.estado || 'PR',
          cep: clienteEncontrado.cep || ''
        })
      }
    } catch (error) {
      console.error('Erro ao buscar cliente:', error)
    } finally {
      setBuscandoCliente(false)
    }
  }

  const formatarCEP = (cep: string) => {
    const numeros = cep.replace(/\D/g, '')
    if (numeros.length <= 5) return numeros
    return `${numeros.slice(0, 5)}-${numeros.slice(5, 8)}`
  }

  const buscarCEP = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '')
    
    if (cepLimpo.length === 8) {
      setBuscandoCEP(true)
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
        const data = await response.json()

        if (!data.erro) {
          setDadosCliente({
            ...dadosCliente,
            endereco: data.logradouro || '',
            bairro: data.bairro || '',
            cidade: data.localidade || '',
            estado: data.uf || ''
          })
        }
      } catch (error) {
        // Erro ao buscar CEP
      } finally {
        setBuscandoCEP(false)
      }
    }
  }

  const handleInputChange = (field: keyof DadosClientePDV, value: string) => {
    if (field === 'telefone') {
      const telefoneFormatado = formatarTelefone(value)
      setDadosCliente({
        ...dadosCliente,
        [field]: telefoneFormatado
      })

      // Buscar cliente quando o telefone estiver completo
      const numeros = value.replace(/\D/g, '')
      if (numeros.length === 10 || numeros.length === 11) {
        buscarClientePorTelefone(telefoneFormatado)
      }
    } else if (field === 'cep') {
      const cepFormatado = formatarCEP(value)
      setDadosCliente({
        ...dadosCliente,
        [field]: cepFormatado
      })

      // Buscar endereço quando CEP estiver completo
      if (cepFormatado.length === 9) {
        buscarCEP(cepFormatado)
      }
    } else {
      setDadosCliente({
        ...dadosCliente,
        [field]: value
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-md:!top-0 max-md:!left-0 max-md:!translate-x-0 max-md:!translate-y-0 max-md:!max-w-full max-md:!w-full max-md:!h-full max-md:!max-h-full max-md:!rounded-none max-w-[calc(100%-2rem)] sm:max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Dados do Cliente
          </DialogTitle>
          <DialogDescription>
            Preencha as informações do cliente
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 min-h-0">
          <div className="space-y-4">
            {/* Telefone primeiro - campo principal para busca */}
            <div>
              <Label htmlFor="telefone" className="flex items-center gap-2">
                Telefone * 
                {buscandoCliente && <Search className="h-4 w-4 animate-spin" />}
              </Label>
              <Input
                id="telefone"
                type="tel"
                inputMode="numeric"
                value={dadosCliente.telefone}
                onChange={(e) => handleInputChange('telefone', e.target.value)}
                placeholder="(41) 99999-9999"
                maxLength={15}
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1">
                Digite o telefone para buscar cliente existente
              </p>
            </div>

            {/* Outros dados pessoais */}
            <div className="grid max-md:grid-cols-1 grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={dadosCliente.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  placeholder="Nome do cliente"
                />
              </div>
              <div>
                <Label htmlFor="sobrenome">Sobrenome</Label>
                <Input
                  id="sobrenome"
                  value={dadosCliente.sobrenome}
                  onChange={(e) => handleInputChange('sobrenome', e.target.value)}
                  placeholder="Sobrenome"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={dadosCliente.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>

            {entregaDomicilio && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Endereço de Entrega
                  </h3>
                  <div className="grid max-md:grid-cols-1 grid-cols-3 gap-4">
                    <div className="max-md:col-span-1 col-span-2">
                      <Label htmlFor="endereco">Endereço</Label>
                      <Input
                        id="endereco"
                        value={dadosCliente.endereco || ''}
                        onChange={(e) => handleInputChange('endereco', e.target.value)}
                        placeholder="Rua, Avenida..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="numero">Número</Label>
                      <Input
                        id="numero"
                        type="tel"
                        inputMode="numeric"
                        value={dadosCliente.numero || ''}
                        onChange={(e) => handleInputChange('numero', e.target.value)}
                        placeholder="123"
                      />
                    </div>
                  </div>
                  <div className="grid max-md:grid-cols-1 grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="complemento">Complemento</Label>
                      <Input
                        id="complemento"
                        value={dadosCliente.complemento || ''}
                        onChange={(e) => handleInputChange('complemento', e.target.value)}
                        placeholder="Apto, Bloco..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="bairro">Bairro</Label>
                      <Input
                        id="bairro"
                        value={dadosCliente.bairro || ''}
                        onChange={(e) => handleInputChange('bairro', e.target.value)}
                        placeholder="Centro"
                      />
                    </div>
                  </div>
                  <div className="grid max-md:grid-cols-1 grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="cidade">Cidade</Label>
                      <Input
                        id="cidade"
                        value={dadosCliente.cidade || ''}
                        onChange={(e) => handleInputChange('cidade', e.target.value)}
                        placeholder="Curitiba"
                      />
                    </div>
                    <div>
                      <Label htmlFor="estado">Estado</Label>
                      <Input
                        id="estado"
                        value={dadosCliente.estado || ''}
                        onChange={(e) => handleInputChange('estado', e.target.value)}
                        placeholder="PR"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cep" className="flex items-center gap-2">
                        CEP
                        {buscandoCEP && <Search className="h-4 w-4 animate-spin" />}
                      </Label>
                      <Input
                        id="cep"
                        type="tel"
                        inputMode="numeric"
                        value={dadosCliente.cep || ''}
                        onChange={(e) => handleInputChange('cep', e.target.value)}
                        placeholder="80000-000"
                        maxLength={9}
                      />
                    </div>
                  </div>

                  {/* Removido validação de área de entrega e taxa extra (simplificado) */}
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onClose}>
            Salvar Dados
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}