import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ActionButton } from "@/components/ui/action-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff, ShieldOff, ShieldCheck } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type FuncionarioSupabase } from "@/services"
import { useFormPersist } from "@/hooks/useFormPersist"

type Funcionario = FuncionarioSupabase

interface FuncionarioFormProps {
  funcionarioInicial?: Funcionario | null
  onSubmit: (funcionario: {
    nome: string
    funcao: 'atendente' | 'garcom' | 'entregador'
    telefone: string
    email: string
    senha?: string
    bloqueado?: boolean
  }) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export default function FuncionarioForm({
  funcionarioInicial,
  onSubmit,
  onCancel,
  isLoading = false
}: FuncionarioFormProps) {
  const [nome, setNome] = useState("")
  const [funcao, setFuncao] = useState<'atendente' | 'garcom' | 'entregador'>('atendente')
  const [telefone, setTelefone] = useState("")
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [confirmarSenha, setConfirmarSenha] = useState("")
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false)
  const [erroSenha, setErroSenha] = useState("")
  const [bloqueado, setBloqueado] = useState(false)

  const isEditing = !!funcionarioInicial

  // Persistência automática do formulário (apenas para novo funcionário)
  const { loadPersistedData, clearPersistedData } = useFormPersist(
    'novo-funcionario-form',
    { nome, funcao, telefone, email },
    !isEditing // Só persiste se não estiver editando
  )

  // Função para formatar telefone
  const formatarTelefone = (value: string) => {
    const numeros = value.replace(/\D/g, '')
    
    if (numeros.length <= 2) {
      return numeros
    }
    if (numeros.length <= 3) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`
    }
    if (numeros.length <= 7) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 3)} ${numeros.slice(3)}`
    }
    if (numeros.length <= 11) {
      if (numeros.length === 11) {
        return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 3)} ${numeros.slice(3, 7)}-${numeros.slice(7, 11)}`
      } else {
        return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6, 10)}`
      }
    }
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 3)} ${numeros.slice(3, 7)}-${numeros.slice(7, 11)}`
  }

  const handleTelefoneChange = (value: string) => {
    const telefoneFormatado = formatarTelefone(value)
    setTelefone(telefoneFormatado)
  }

  // Preencher campos quando estiver editando OU carregar dados salvos
  useEffect(() => {
    if (funcionarioInicial) {
      setNome(funcionarioInicial.nome)
      setFuncao(funcionarioInicial.funcao)
      setTelefone(formatarTelefone(funcionarioInicial.telefone))
      setEmail(funcionarioInicial.email)
      setSenha("")
      setConfirmarSenha("")
      setBloqueado(funcionarioInicial.bloqueado || false)
    } else {
      // Tentar carregar dados salvos
      const saved = loadPersistedData()
      if (saved) {
        if (saved.nome) setNome(saved.nome)
        if (saved.funcao) setFuncao(saved.funcao as 'atendente' | 'garcom' | 'entregador')
        if (saved.telefone) setTelefone(saved.telefone)
        if (saved.email) setEmail(saved.email)
      }
      setBloqueado(false)
    }
  }, [funcionarioInicial, loadPersistedData])

  // Validar senhas
  useEffect(() => {
    if (!isEditing) {
      if (senha && senha.length < 6) {
        setErroSenha("A senha deve ter no mínimo 6 caracteres")
      } else if (senha && confirmarSenha && senha !== confirmarSenha) {
        setErroSenha("As senhas não coincidem")
      } else {
        setErroSenha("")
      }
    }
  }, [senha, confirmarSenha, isEditing])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!nome.trim() || !funcao || !telefone.trim() || !email.trim()) return
    
    if (!isEditing) {
      if (!senha || senha.length < 6) {
        setErroSenha("A senha deve ter no mínimo 6 caracteres")
        return
      }
      if (senha !== confirmarSenha) {
        setErroSenha("As senhas não coincidem")
        return
      }
    }

    const funcionarioData = {
      nome: nome.trim(),
      funcao,
      telefone: telefone.trim(),
      email: email.trim(),
      ...((!isEditing && senha) && { senha }),
      ...(isEditing && { bloqueado })
    }
    
    await onSubmit(funcionarioData)
    // Limpar dados salvos após sucesso
    clearPersistedData()
  }

  const handleCancel = () => {
    // Limpar dados salvos ao cancelar
    clearPersistedData()
    onCancel()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informações do Funcionário</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome Completo *</Label>
            <Input
              id="nome"
              name="nome"
              autoComplete="name"
              placeholder="Nome completo do funcionário"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone *</Label>
              <Input
                id="telefone"
                name="telefone"
                autoComplete="tel"
                placeholder="(41) 9 9999-9999"
                value={telefone}
                onChange={(e) => handleTelefoneChange(e.target.value)}
                maxLength={16}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="funcao">Função *</Label>
              <Select 
                value={funcao} 
                onValueChange={(value: 'atendente' | 'garcom' | 'entregador') => setFuncao(value)}
                disabled={isLoading}
              >
                <SelectTrigger id="funcao">
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="atendente">Atendente</SelectItem>
                  <SelectItem value="garcom">Garçom</SelectItem>
                  <SelectItem value="entregador">Entregador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading || isEditing}
            />
            {isEditing && (
              <p className="text-xs text-muted-foreground">
                O email não pode ser alterado após o cadastro
              </p>
            )}
          </div>

          {isEditing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  {bloqueado ? (
                    <ShieldOff className="h-5 w-5 text-destructive" />
                  ) : (
                    <ShieldCheck className="h-5 w-5 text-success" />
                  )}
                  <div>
                    <Label htmlFor="bloqueado" className="text-base font-medium cursor-pointer">
                      {bloqueado ? 'Funcionário Bloqueado' : 'Funcionário Ativo'}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {bloqueado 
                        ? 'Este funcionário não pode acessar o sistema' 
                        : 'Este funcionário pode acessar o sistema normalmente'}
                    </p>
                  </div>
                </div>
                <Switch
                  id="bloqueado"
                  checked={bloqueado}
                  onChange={setBloqueado}
                  disabled={isLoading}
                />
              </div>
              {bloqueado && (
                <div className="bg-destructive/5 border border-destructive/30 rounded-lg p-3">
                  <p className="text-sm text-destructive">
                    Ao bloquear este funcionário, ele será desconectado automaticamente e não poderá mais fazer login no sistema.
                  </p>
                </div>
              )}
            </div>
          )}

          {!isEditing && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="senha">Senha *</Label>
                  <div className="relative">
                    <Input
                      id="senha"
                      name="senha"
                      type={mostrarSenha ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Mínimo 6 caracteres"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setMostrarSenha(!mostrarSenha)}
                      disabled={isLoading}
                    >
                      {mostrarSenha ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmarSenha">Confirmar Senha *</Label>
                  <div className="relative">
                    <Input
                      id="confirmarSenha"
                      type={mostrarConfirmarSenha ? "text" : "password"}
                      placeholder="Digite a senha novamente"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
                      disabled={isLoading}
                    >
                      {mostrarConfirmarSenha ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {erroSenha && (
                <p className="text-sm text-destructive">
                  {erroSenha}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <ActionButton
          type="submit"
          disabled={
            !nome.trim() || 
            !funcao || 
            !telefone.trim() || 
            !email.trim() ||
            (!isEditing && (!senha || senha.length < 6 || senha !== confirmarSenha || !!erroSenha))
          }
          loading={isLoading}
        >
          {isEditing ? "Atualizar Funcionário" : "Criar Funcionário"}
        </ActionButton>
      </div>
    </form>
  )
}
