import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ActionButton } from "@/components/ui/action-button"

import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Users, Search, Edit, Trash2, Phone, AlertCircle, Mail, UserCheck, Bike, ChefHat, Plus } from "lucide-react"
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog"
import { funcionarioService, type FuncionarioSupabase } from "@/services"
import { useNavigation } from "@/contexts/NavigationContext"
import { CarregandoPagina } from '@/components/ui/feedback'

type Funcionario = FuncionarioSupabase

export default function Funcionarios() {
  const { navigateTo } = useNavigation()
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    carregarFuncionarios()
  }, [])

  const carregarFuncionarios = async () => {
    try {
      setLoading(true)
      setError(null)
      const funcionariosData = await funcionarioService.buscarTodos()
      setFuncionarios(funcionariosData)
    } catch (err) {
      console.error('Erro ao carregar funcionários:', err)
      setError('Erro ao carregar funcionários do servidor.')
    } finally {
      setLoading(false)
    }
  }

  const handleNovoFuncionario = () => {
    navigateTo('novo-funcionario' as any)
  }

  const handleEditarFuncionario = (funcionario: Funcionario) => {
    navigateTo(`editar-funcionario/${funcionario.id}` as any)
  }

  const handleRemoveFuncionario = async (id: string) => {
    try {
      setSaving(true)
      setError(null)
      
      await funcionarioService.excluir(id)
      await carregarFuncionarios()
    } catch (err) {
      console.error('Erro ao remover funcionário:', err)
      setError('Erro ao remover funcionário.')
    } finally {
      setSaving(false)
    }
  }

  const filteredFuncionarios = funcionarios.filter(funcionario =>
    funcionario.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    funcionario.funcao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    funcionario.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatarFuncao = (funcao: string) => {
    const funcoes: Record<string, string> = {
      'atendente': 'Atendente',
      'garcom': 'Garçom',
      'entregador': 'Entregador'
    }
    return funcoes[funcao] || funcao
  }

  const getIconeFuncao = (funcao: string) => {
    const icones: Record<string, any> = {
      'atendente': UserCheck,
      'garcom': ChefHat,
      'entregador': Bike
    }
    return icones[funcao] || Users
  }

  const getCorFuncao = (funcao: string) => {
    const cores: Record<string, string> = {
      'atendente': 'bg-primary/10 text-primary hover:bg-primary/10',
      'garcom': 'bg-success/10 text-success hover:bg-success/10',
      'entregador': 'bg-warning/15 text-warning-foreground hover:bg-warning/15'
    }
    return cores[funcao] || 'bg-muted text-foreground'
  }

  if (loading) {
    return <CarregandoPagina variante="tabela" />
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Desktop */}
      <div className="hidden md:flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6" />
            Funcionários
          </h1>
          <p className="text-muted-foreground">
            Gerencie os funcionários do seu delivery
          </p>
        </div>
        <ActionButton onClick={handleNovoFuncionario} loading={saving}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Funcionário
        </ActionButton>
      </div>

      {/* Header Mobile */}
      <div className="md:hidden space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight flex items-center justify-center gap-2">
            <Users className="h-6 w-6" />
            Funcionários
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            Gerencie os funcionários do seu delivery
          </p>
        </div>
        <ActionButton onClick={handleNovoFuncionario} loading={saving} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Novo Funcionário
        </ActionButton>
      </div>

      {error && (
        <div className="flex flex-col gap-2 p-4 bg-destructive/5 border border-destructive/30 rounded-lg text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Barra de busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/70 h-4 w-4" />
        <Input
          id="buscar-funcionarios"
          name="buscar-funcionarios"
          placeholder="Buscar funcionários..." 
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Lista de funcionários */}
      {filteredFuncionarios.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              {searchTerm ? "Nenhum funcionário encontrado" : "Nenhum funcionário cadastrado"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm
                ? "Tente buscar com outros termos"
                : "Comece adicionando funcionários ao sistema"
              }
            </p>
            {!searchTerm && (
              <ActionButton onClick={handleNovoFuncionario} loading={saving}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Funcionário
              </ActionButton>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredFuncionarios.map((funcionario) => (
            <Card key={funcionario.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    {(() => {
                      const IconeFuncao = getIconeFuncao(funcionario.funcao)
                      return <IconeFuncao className="h-5 w-5" />
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{funcionario.nome}</p>
                    <Badge className={`${getCorFuncao(funcionario.funcao)} text-xs mt-1`}>
                      {formatarFuncao(funcionario.funcao)}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 flex-shrink-0" />
                    <span>{funcionario.telefone}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Mail className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span className={`text-xs truncate ${
                      funcionario.email.includes('@temp.local') 
                        ? 'text-warning-foreground font-medium' 
                        : 'text-muted-foreground'
                    }`}>
                      {funcionario.email}
                    </span>
                  </div>
                  {funcionario.email.includes('@temp.local') && (
                    <div className="text-xs text-warning-foreground flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>Email temporário - Atualizar</span>
                    </div>
                  )}
                </div>
                
                {/* Botões Desktop */}
                <div className="hidden md:flex items-center space-x-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditarFuncionario(funcionario)}
                    disabled={saving}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  
                  <ConfirmDeleteDialog
                    trigger={
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={saving}
                        className="flex-1"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remover
                      </Button>
                    }
                    title="Excluir Funcionário"
                    description={`Tem certeza que deseja excluir o funcionário "${funcionario.nome}"? Esta ação não pode ser desfeita.`}
                    onConfirm={() => handleRemoveFuncionario(funcionario.id)}
                    disabled={saving}
                  />
                </div>

                {/* Botões Mobile */}
                <div className="md:hidden space-y-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditarFuncionario(funcionario)}
                    disabled={saving}
                    className="w-full"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar Funcionário
                  </Button>
                  
                  <ConfirmDeleteDialog
                    trigger={
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={saving}
                        className="w-full text-destructive hover:text-destructive hover:bg-destructive/5"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remover Funcionário
                      </Button>
                    }
                    title="Excluir Funcionário"
                    description={`Tem certeza que deseja excluir o funcionário "${funcionario.nome}"? Esta ação não pode ser desfeita.`}
                    onConfirm={() => handleRemoveFuncionario(funcionario.id)}
                    disabled={saving}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
