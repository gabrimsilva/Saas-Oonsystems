import { useState, useEffect } from "react"
import { Users, Loader2 } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import FuncionarioForm from "@/components/FuncionarioForm"
import { funcionarioService, type FuncionarioSupabase } from "@/services"
import toast from "react-hot-toast"

type Funcionario = FuncionarioSupabase

export default function EditarFuncionario() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [funcionario, setFuncionario] = useState<Funcionario | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)

  useEffect(() => {
    if (id) {
      carregarFuncionario()
    } else {
      toast.error('ID do funcionário não encontrado')
      navigate('/sistema/funcionarios')
    }
  }, [id])

  const carregarFuncionario = async () => {
    try {
      setIsLoadingData(true)
      
      if (!id) return

      const funcionarios = await funcionarioService.buscarTodos()
      const funcionarioData = funcionarios.find(func => String(func.id) === String(id))
      
      if (funcionarioData) {
        setFuncionario(funcionarioData)
      } else {
        toast.error('Funcionário não encontrado')
        navigate('/sistema/funcionarios')
      }
    } catch (err) {
      console.error('Erro ao carregar funcionário:', err)
      toast.error('Erro ao carregar funcionário')
      navigate('/sistema/funcionarios')
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleSubmit = async (funcionarioData: {
    nome: string
    funcao: 'atendente' | 'garcom' | 'entregador'
    telefone: string
    email: string
    bloqueado?: boolean
  }) => {
    if (!id) return
    
    try {
      setIsLoading(true)
      
      await funcionarioService.atualizar(id, {
        nome: funcionarioData.nome,
        funcao: funcionarioData.funcao,
        telefone: funcionarioData.telefone,
        email: funcionarioData.email,
        bloqueado: funcionarioData.bloqueado
      })
      
      toast.success('Funcionário atualizado com sucesso!')
      navigate('/sistema/funcionarios')
    } catch (err) {
      console.error('Erro ao atualizar funcionário:', err)
      toast.error('Erro ao atualizar funcionário. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    navigate('/sistema/funcionarios')
  }

  if (isLoadingData) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Carregando funcionário...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!funcionario) {
    return null
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Users className="h-6 w-6" />
          Editar Funcionário
        </h1>
        <p className="text-muted-foreground">
          Edite as informações do funcionário "{funcionario.nome}"
        </p>
      </div>

      <FuncionarioForm
        funcionarioInicial={funcionario}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </div>
  )
}
