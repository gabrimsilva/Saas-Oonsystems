import { useState, useEffect } from "react"
import { ActionButton } from "@/components/ui/action-button"
import { Save, CheckCircle } from "lucide-react"
import { configuracaoService } from "@/services"
import { HorarioFuncionamento } from "@/components/configuracoes/HorarioFuncionamento"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { CarregandoPagina } from '@/components/ui/feedback'

interface DiaDaSemana {
  nome: string
  aberto: boolean
  abertura: string
  fechamento: string
}

const diasIniciais: DiaDaSemana[] = [
  { nome: 'Segunda-feira', aberto: true, abertura: '18:00', fechamento: '23:00' },
  { nome: 'Terça-feira', aberto: true, abertura: '18:00', fechamento: '23:00' },
  { nome: 'Quarta-feira', aberto: true, abertura: '18:00', fechamento: '23:00' },
  { nome: 'Quinta-feira', aberto: true, abertura: '18:00', fechamento: '23:00' },
  { nome: 'Sexta-feira', aberto: true, abertura: '18:00', fechamento: '23:00' },
  { nome: 'Sábado', aberto: true, abertura: '17:00', fechamento: '00:00' },
  { nome: 'Domingo', aberto: false, abertura: '17:00', fechamento: '23:00' }
]

export default function ConfiguracoesHorarioPage() {
  const [diasSemana, setDiasSemana] = useState<DiaDaSemana[]>(diasIniciais)
  const [trabalhaFeriado, setTrabalhaFeriado] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)

  useEffect(() => {
    carregarConfiguracoes()
  }, [])

  const carregarConfiguracoes = async () => {
    try {
      const configuracoes = await configuracaoService.buscarTodas()
      
      configuracoes.forEach(cfg => {
        if (cfg.chave === 'horario_funcionamento') {
          try {
            const horarios = JSON.parse(cfg.valor)
            if (Array.isArray(horarios) && horarios.length === 7) {
              setDiasSemana(horarios)
            }
          } catch (e) {
            console.error('Erro ao parsear horários:', e)
          }
        } else if (cfg.chave === 'trabalha_feriado') {
          setTrabalhaFeriado(cfg.valor === 'true')
        }
      })
    } catch (err) {
      console.error('Erro ao carregar configurações:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSalvar = async () => {
    try {
      setSaving(true)

      await Promise.all([
        configuracaoService.salvar('horario_funcionamento', JSON.stringify(diasSemana), 'Horários de funcionamento', 'json', 'sistema'),
        configuracaoService.salvar('trabalha_feriado', trabalhaFeriado.toString(), 'Trabalha em feriados', 'booleano', 'sistema')
      ])

      setShowSuccessDialog(true)
    } catch (err) {
      console.error('Erro ao salvar configurações:', err)
    } finally {
      setSaving(false)
    }
  }

  const updateDia = (index: number, campo: keyof DiaDaSemana, valor: string | boolean) => {
    const novosDias = [...diasSemana]
    novosDias[index] = { ...novosDias[index], [campo]: valor }
    setDiasSemana(novosDias)
  }

  if (loading) {
    return <CarregandoPagina variante="formulario" />
  }

  return (
    <div className="container mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Horário de Funcionamento</h2>
        <p className="text-muted-foreground">
          Configure os dias e horários de atendimento
        </p>
      </div>

      <HorarioFuncionamento
        diasSemana={diasSemana}
        trabalhaFeriado={trabalhaFeriado}
        onDiaChange={updateDia}
        onTrabalhaFeriadoChange={setTrabalhaFeriado}
      />

      <div className="flex justify-end">
        <ActionButton onClick={handleSalvar} loading={saving}>
          <Save className="h-4 w-4 mr-2" />
          Salvar Configurações
        </ActionButton>
      </div>

      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Sucesso!
            </AlertDialogTitle>
            <AlertDialogDescription>
              Horários salvos com sucesso!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
