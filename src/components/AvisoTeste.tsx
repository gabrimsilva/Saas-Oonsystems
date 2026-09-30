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
      className={`flex flex-wrap items-center justify-between gap-2 px-6 py-2 text-sm border-b ${
        urgente ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-blue-50 border-blue-200 text-blue-900'
      }`}
    >
      <span className="flex items-center gap-2">
        <Clock className="h-4 w-4 flex-shrink-0" />
        Seu período de teste termina {quando} ({trialAte.toLocaleDateString('pt-BR')}).
      </span>
      <a
        href={CONTATO_ASSINATURA}
        className={`font-semibold underline-offset-2 hover:underline ${urgente ? 'text-amber-900' : 'text-blue-900'}`}
      >
        Assinar agora
      </a>
    </div>
  )
}
