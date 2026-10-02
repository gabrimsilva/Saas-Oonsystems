import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog"
import { X, Clock, Phone, Mail } from "lucide-react"

interface ModalInformacoesEstabelecimentoProps {
  isOpen: boolean
  onClose: () => void
  nomeEstabelecimento: string
  telefone: string
  email: string
  horarioFuncionamento: string
}

export default function ModalInformacoesEstabelecimento({
  isOpen,
  onClose,
  nomeEstabelecimento,
  telefone,
  email,
  horarioFuncionamento
}: ModalInformacoesEstabelecimentoProps) {
  // Formata o horário de funcionamento do JSON
  const formatarHorario = (horarioJson: string): string => {
    if (!horarioJson) return 'Não informado'
    
    try {
      const horarios = JSON.parse(horarioJson)
      
      // Formato array (novo): [{ nome, aberto, abertura, fechamento }]
      if (Array.isArray(horarios)) {
        return horarios
          .filter(dia => dia.aberto)
          .map(dia => `${dia.nome}: ${dia.abertura} - ${dia.fechamento}`)
          .join('\n') || 'Fechado'
      }
      
      // Formato objeto (antigo): { "segunda": "09:00-18:00" }
      const diasMap: { [key: string]: string } = {
        'segunda': 'Segunda-feira',
        'terca': 'Terça-feira',
        'quarta': 'Quarta-feira',
        'quinta': 'Quinta-feira',
        'sexta': 'Sexta-feira',
        'sabado': 'Sábado',
        'domingo': 'Domingo'
      }
      
      return Object.entries(horarios)
        .map(([dia, horario]) => `${diasMap[dia] || dia}: ${horario}`)
        .join('\n')
    } catch {
      return horarioJson
    }
  }

  const horarioFormatado = formatarHorario(horarioFuncionamento)

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="w-[500px] max-w-[calc(100%-2rem)] p-0 overflow-hidden">
        {/* Botão fechar */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-1.5 hover:bg-white transition-colors shadow-md cursor-pointer"
          aria-label="Fechar"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Header neutro */}
        <div className="bg-muted border-b border-border p-6 text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold text-foreground">
              {nomeEstabelecimento}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm">
              Informações de contato e atendimento
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-4">
          {/* Horário de Funcionamento */}
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
            <div className="bg-muted p-2 rounded-full">
              <Clock className="h-5 w-5 text-foreground/80" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">Horário de Funcionamento</h3>
              <p className="text-muted-foreground text-sm whitespace-pre-line">
                {horarioFormatado}
              </p>
            </div>
          </div>

          {/* Telefone */}
          {telefone && (
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="bg-success/10 p-2 rounded-full">
                <Phone className="h-5 w-5 text-success" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">Telefone / WhatsApp</h3>
                <a 
                  href={`https://wa.me/55${telefone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-success hover:text-success font-medium text-sm"
                >
                  {telefone}
                </a>
              </div>
            </div>
          )}

          {/* Email */}
          {email && (
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="bg-info/10 p-2 rounded-full">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">E-mail</h3>
                <a 
                  href={`mailto:${email}`}
                  className="text-primary hover:text-info font-medium text-sm break-all"
                >
                  {email}
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <AlertDialogFooter className="p-6 pt-0">
          <Button
            onClick={onClose}
            className="w-full bg-neutral-800 hover:bg-neutral-900 text-white cursor-pointer"
          >
            Fechar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
