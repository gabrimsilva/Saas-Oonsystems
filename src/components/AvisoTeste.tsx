/**
 * Faixa no topo do sistema avisando quantos dias faltam para o fim do
 * período de teste do cliente. Não aparece para clientes com assinatura ativa.
 *
 * @module components/AvisoTeste
 */

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { CONTATO_ASSINATURA } from '@/config/plataforma'

const UM_DIA = 24 * 60 * 60 * 1000

export default function AvisoTeste() {
  const [trialAte, setTrialAte] = useState<Date | null>(null)

  useEffect(() => {
    let cancelado = false
    // A RLS devolve apenas o tenant do usuário logado
    supabase
      .from('tenants')
      .select('status, trial_ate')
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelado && data?.status === 'trial' && data.trial_ate) {
          setTrialAte(new Date(data.trial_ate))
        }
      })
    return () => { cancelado = true }
  }, [])

  if (!trialAte) return null

  const dias = Math.max(0, Math.ceil((trialAte.getTime() - Date.now()) / UM_DIA))
  const urgente = dias <= 3
  const quando = dias === 0 ? 'hoje' : dias === 1 ? 'amanhã' : `em ${dias} dias`

  return (
    <div
      role="status"
      className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-sm md:px-6 ${
        urgente ? 'border-warning/40 bg-warning/10 text-foreground' : 'border-primary/15 bg-primary/5 text-foreground'
      }`}
    >
      <span className="flex items-center gap-2">
        <Clock className={`size-4 flex-shrink-0 ${urgente ? 'text-warning-foreground' : 'text-primary'}`} />
        Seu período de teste termina {quando} ({trialAte.toLocaleDateString('pt-BR')}).
      </span>
      <a
        href={CONTATO_ASSINATURA}
        className="inline-flex h-7 items-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary-hover"
      >
        Assinar agora
      </a>
    </div>
  )
}
