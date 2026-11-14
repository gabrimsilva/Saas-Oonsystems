import { useState } from "react"
import { Users } from "lucide-react"
import FuncionarioForm from "@/components/FuncionarioForm"
import { funcionarioService } from "@/services"
import toast from "react-hot-toast"
import { useNavigation } from "@/contexts/NavigationContext"
import { CabecalhoPagina } from '@/components/ui/feedback'

export default function NovoFuncionario() {
  const { navigateTo } = useNavigation()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (funcionarioData: {
    nome: string
    funcao: 'atendente' | 'garcom' | 'entregador'
    telefone: string
    email: string
    senha?: string
  }) => {
    try {
      setIsLoading(true)
      
      if (!funcionarioData.senha) {
        toast.error('Senha é obrigatória')
        return
      }

      await funcionarioService.criarComAcesso({
        nome: funcionarioData.nome,
        funcao: funcionarioData.funcao,
        telefone: funcionarioData.telefone,
        email: funcionarioData.email,
        senha: funcionarioData.senha
      })
      
      toast.success('Funcionário criado com sucesso!')
      navigateTo('funcionarios')
    } catch (err: any) {
      console.error('Erro ao criar funcionário:', err)
      
      if (err.message?.includes('already registered') || err.message?.includes('already been registered')) {
        toast.error('Este email já está cadastrado.')
      } else if (err.message?.includes('invalid') && err.message?.includes('email')) {
        toast.error('Erro ao criar conta: Verifique se a confirmação de email está desabilitada no Supabase.')
      } else if (err.message?.includes('email')) {
        toast.error('Email inválido ou já cadastrado.')
      } else if (err.message?.includes('password')) {
        toast.error('Senha inválida. Use no mínimo 6 caracteres.')
      } else {
        toast.error(`Erro ao criar funcionário: ${err.message || 'Tente novamente.'}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    navigateTo('funcionarios')
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <CabecalhoPagina titulo="Novo funcionário" descricao="Cadastre um novo funcionário no sistema" icone={Users} />

      <FuncionarioForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </div>
  )
}
