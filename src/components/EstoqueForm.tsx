import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ActionButton } from "@/components/ui/action-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { type EstoqueSupabase } from "@/services"

type ItemEstoque = EstoqueSupabase

interface EstoqueFormProps {
  itemInicial?: ItemEstoque | null
  onSubmit: (item: Omit<EstoqueSupabase, 'id' | 'criado_em' | 'atualizado_em'>) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export default function EstoqueForm({ 
  itemInicial, 
  onSubmit, 
  onCancel,
  isLoading = false
}: EstoqueFormProps) {
  const [nome, setNome] = useState("")
  const [descricao, setDescricao] = useState("")
  const [validade, setValidade] = useState("")
  const [quantidade, setQuantidade] = useState("")
  const [quantidadeMinima, setQuantidadeMinima] = useState("")

  // Preencher campos quando há item inicial
  useEffect(() => {
    if (itemInicial) {
      setNome(itemInicial.nome)
      setDescricao(itemInicial.descricao)
      setValidade(itemInicial.validade)
      setQuantidade(itemInicial.quantidade.toString())
      setQuantidadeMinima(itemInicial.quantidade_minima.toString())
    }
  }, [itemInicial])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!nome.trim() || !descricao.trim() || !validade.trim() || !quantidade || !quantidadeMinima) return
    
    const itemData = {
      nome: nome.trim(),
      descricao: descricao.trim(),
      validade: validade.trim(),
      quantidade: parseInt(quantidade),
      quantidade_minima: parseInt(quantidadeMinima)
    }
    
    await onSubmit(itemData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informações do item</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Item *</Label>
            <Input
              id="nome"
              type="text"
              placeholder="Ex: Massa de Pizza, Queijo Mussarela..."
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição *</Label>
            <textarea
              id="descricao"
              placeholder="Descreva o item do estoque..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              required
              disabled={isLoading}
              className="w-full min-h-[100px] px-3 py-2 border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="validade">Validade *</Label>
            <Input
              id="validade"
              type="date"
              value={validade}
              onChange={(e) => setValidade(e.target.value)}
              required
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Data de validade do item no estoque
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantidade">Quantidade Atual *</Label>
              <Input
                id="quantidade"
                type="number"
                min="0"
                placeholder="0"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                required
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Quantidade disponível em estoque
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantidadeMinima">Quantidade Mínima *</Label>
              <Input
                id="quantidadeMinima"
                type="number"
                min="0"
                placeholder="0"
                value={quantidadeMinima}
                onChange={(e) => setQuantidadeMinima(e.target.value)}
                required
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Alerta quando atingir este valor
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <ActionButton
          type="submit"
          disabled={!nome.trim() || !descricao.trim() || !validade.trim() || !quantidade || !quantidadeMinima}
          loading={isLoading}
        >
          {itemInicial ? "Atualizar Item" : "Adicionar Item"}
        </ActionButton>
      </div>
    </form>
  )
}
