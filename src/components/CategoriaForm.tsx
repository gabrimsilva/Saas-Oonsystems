import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ActionButton } from "@/components/ui/action-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { type CategoriaSupabase } from "@/services"

type Categoria = CategoriaSupabase

interface CategoriaFormProps {
  categoriaInicial?: Categoria | null
  categoriasExistentes?: Categoria[]
  onSubmit: (categoria: Omit<Categoria, 'id' | 'criado_em' | 'atualizado_em'>) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export default function CategoriaForm({ 
  categoriaInicial, 
  categoriasExistentes = [], 
  onSubmit, 
  onCancel,
  isLoading = false
}: CategoriaFormProps) {
  const [nome, setNome] = useState("")
  const [descricao, setDescricao] = useState("")
  const [ativa, setAtiva] = useState(true)
  const [ordem, setOrdem] = useState("")
  const [erroOrdem, setErroOrdem] = useState("")

  // Preencher campos quando há categoria inicial
  useEffect(() => {
    if (categoriaInicial) {
      setNome(categoriaInicial.nome)
      setDescricao(categoriaInicial.descricao)
      setAtiva(categoriaInicial.ativa)
      setOrdem(categoriaInicial.ordem.toString())
    }
  }, [categoriaInicial])

  // Verificar se a ordem já existe
  const verificarOrdemExistente = (novaOrdem: string) => {
    if (!novaOrdem) {
      setErroOrdem("")
      return false
    }

    const ordemNumero = parseInt(novaOrdem)
    
    // Verificar se já existe uma categoria com essa ordem
    // Excluir a categoria atual se estiver editando
    const ordemJaExiste = categoriasExistentes.some(cat => {
      if (categoriaInicial && cat.id === categoriaInicial.id) {
        return false // Ignorar a própria categoria na edição
      }
      return cat.ordem === ordemNumero
    })

    if (ordemJaExiste) {
      const categoriaComMesmaOrdem = categoriasExistentes.find(cat => 
        cat.ordem === ordemNumero && (!categoriaInicial || cat.id !== categoriaInicial.id)
      )
      setErroOrdem(`A ordem ${ordemNumero} já está sendo usada pela categoria "${categoriaComMesmaOrdem?.nome}"`)
      return true
    }

    setErroOrdem("")
    return false
  }

  const handleOrdemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novaOrdem = e.target.value
    setOrdem(novaOrdem)
    verificarOrdemExistente(novaOrdem)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!nome.trim() || !descricao.trim() || !ordem) return
    
    // Verificar ordem antes de salvar
    if (verificarOrdemExistente(ordem)) {
      return
    }
    
    const categoriaData = {
      nome: nome.trim(),
      descricao: descricao.trim(),
      ativa,
      ordem: parseInt(ordem),
      tem_sabores: false,
      tem_borda: false,
      tem_tamanhos: false,
      tem_adicionais: false
    }
    
    await onSubmit(categoriaData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Categoria *</Label>
            <Input
              id="nome"
              type="text"
              placeholder="Exemplo: Linha de Tratamento Facial"
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
              placeholder="Descreva a categoria..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              required
              disabled={isLoading}
              className="w-full min-h-[100px] px-3 py-2 border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ordem">Ordem de Exibição *</Label>
            <Input
              id="ordem"
              type="number"
              placeholder="1"
              min="1"
              value={ordem}
              onChange={handleOrdemChange}
              required
              disabled={isLoading}
              className={erroOrdem ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {erroOrdem && (
              <p className="text-sm text-destructive mt-1">
                {erroOrdem}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Define a ordem em que a categoria aparece no menu
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="ativa"
              checked={ativa}
              onChange={(e) => setAtiva(e.target.checked)}
              disabled={isLoading}
              className="h-4 w-4 text-primary border-input rounded focus:ring-ring/30 disabled:opacity-50"
            />
            <Label htmlFor="ativa">Categoria ativa</Label>
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
          disabled={!nome.trim() || !descricao.trim() || !ordem || !!erroOrdem}
          loading={isLoading}
        >
          {categoriaInicial ? "Atualizar Categoria" : "Criar Categoria"}
        </ActionButton>
      </div>
    </form>
  )
}
