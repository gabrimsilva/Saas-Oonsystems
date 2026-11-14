import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Globe } from "lucide-react"

interface DiaDaSemana {
  nome: string
  aberto: boolean
  abertura: string
  fechamento: string
}

interface HorarioFuncionamentoProps {
  diasSemana: DiaDaSemana[]
  trabalhaFeriado: boolean
  onDiaChange: (index: number, campo: keyof DiaDaSemana, valor: string | boolean) => void
  onTrabalhaFeriadoChange: (value: boolean) => void
}

/**
 * Componente para configuração de horários de funcionamento
 * 
 * Permite configurar horários de abertura e fechamento para cada dia da semana,
 * além de definir se o estabelecimento trabalha em feriados.
 */
export function HorarioFuncionamento({
  diasSemana,
  trabalhaFeriado,
  onDiaChange,
  onTrabalhaFeriadoChange
}: HorarioFuncionamentoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Horário de funcionamento
        </CardTitle>
        <CardDescription>
          Configure os horários de funcionamento para cada dia da semana
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {diasSemana.map((dia, index) => (
          <div key={dia.nome} className="p-3 border rounded-lg space-y-3">
            {/* Layout Desktop */}
            <div className="hidden md:flex items-center gap-4">
              <div className="w-32">
                <span className="text-sm font-medium">{dia.nome}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <select
                  id={`status-desktop-${index}`}
                  name={`status-desktop-${index}`}
                  className="px-3 py-1 border rounded text-sm"
                  value={dia.aberto ? 'aberto' : 'fechado'}
                  onChange={(e) => onDiaChange(index, 'aberto', e.target.value === 'aberto')}
                >
                  <option value="aberto">Aberto</option>
                  <option value="fechado">Fechado</option>
                </select>
              </div>
              
              {dia.aberto && (
                <>
                  <div className="flex items-center gap-2">
                    <label htmlFor={`abertura-${index}`} className="text-sm">Das:</label>
                    <Input
                      id={`abertura-${index}`}
                      name={`abertura-${index}`}
                      type="time" 
                      className="w-32"
                      value={dia.abertura}
                      onChange={(e) => onDiaChange(index, 'abertura', e.target.value)}
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <label htmlFor={`fechamento-${index}`} className="text-sm">Até:</label>
                    <Input
                      id={`fechamento-${index}`}
                      name={`fechamento-${index}`}
                      type="time" 
                      className="w-32"
                      value={dia.fechamento}
                      onChange={(e) => onDiaChange(index, 'fechamento', e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Layout Mobile */}
            <div className="md:hidden space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{dia.nome}</span>
                <select
                  id={`status-mobile-${index}`}
                  name={`status-mobile-${index}`}
                  className="px-3 py-1 border rounded text-sm"
                  value={dia.aberto ? 'aberto' : 'fechado'}
                  onChange={(e) => onDiaChange(index, 'aberto', e.target.value === 'aberto')}
                >
                  <option value="aberto">Aberto</option>
                  <option value="fechado">Fechado</option>
                </select>
              </div>
              
              {dia.aberto && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor={`abertura-mobile-${index}`} className="text-sm text-muted-foreground">Abertura</label>
                    <Input
                      id={`abertura-mobile-${index}`}
                      name={`abertura-mobile-${index}`}
                      type="time" 
                      className="w-full mt-1"
                      value={dia.abertura}
                      onChange={(e) => onDiaChange(index, 'abertura', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor={`fechamento-mobile-${index}`} className="text-sm text-muted-foreground">Fechamento</label>
                    <Input
                      id={`fechamento-mobile-${index}`}
                      name={`fechamento-mobile-${index}`}
                      type="time" 
                      className="w-full mt-1"
                      value={dia.fechamento}
                      onChange={(e) => onDiaChange(index, 'fechamento', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        
        <div className="flex items-center gap-2 pt-4 border-t">
          <input 
            type="checkbox" 
            id="feriado"
            checked={trabalhaFeriado}
            onChange={(e) => onTrabalhaFeriadoChange(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="feriado" className="text-sm font-medium">
            Trabalhamos em feriados
          </label>
        </div>
      </CardContent>
    </Card>
  )
}
