/**
 * Faixa no topo do sistema avisando o cliente sobre prazos da assinatura:
 * dias restantes do período de teste, ou mensalidade vencendo/vencida (com a
 * data em que o acesso será suspenso por atraso). O botão leva a "Meu plano".
 *
 * @module components/AvisoTeste
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { CONTATO_ASSINATURA } from '@/config/plataforma'
import { dataBloqueioPorAtraso } from '@/services/plataformaService'
import { usePermissoes } from '@/hooks/usePermissoes'

const UM_DIA = 24 * 60 * 60 * 1000
/** Avisa a mensalidade com esta antecedência */
const DIAS_AVISO_MENSALIDADE = 5
const classeBotao =
  'inline-flex h-7 items-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary-hover'

const diasAte = (data: Date) => Math.max(0, Math.ceil((data.getTime() - Date.now()) / UM_DIA))
const quando = (dias: number) => (dias === 0 ? 'hoje' : dias === 1 ? 'amanhã' : `em ${dias} dias`)

interface Aviso {
  texto: string
  urgente: boolean
  acao: string
}

export default function AvisoTeste() {
  const [aviso, setAviso] = useState<Aviso | null>(null)
  // Só o administrador geral paga a assinatura (Meu plano); os demais falam com a OonSystems
  const { perfil } = usePermissoes()

  useEffect(() => {
    let cancelado = false
    // A RLS devolve apenas o tenant do usuário logado
    supabase
      .from('tenants')
      .select('status, trial_ate, vigencia_ate')
      .maybeSingle()
      .then(({ data }) => {
        if (cancelado || !data) return

        if (data.status === 'trial' && data.trial_ate) {
          const fim = new Date(data.trial_ate)
          const dias = diasAte(fim)
          setAviso({
            texto: `Seu período de teste termina ${quando(dias)} (${fim.toLocaleDateString('pt-BR')}).`,
            urgente: dias <= 3,
            acao: 'Assinar agora',
          })
          return
        }

        if (data.status === 'ativo' && data.vigencia_ate) {
          const vencimento = new Date(data.vigencia_ate)
          const bloqueio = dataBloqueioPorAtraso(data.vigencia_ate)!
          if (vencimento.getTime() < Date.now()) {
            setAviso({
              texto: `Sua mensalidade venceu em ${vencimento.toLocaleDateString('pt-BR')}. ` +
                `Regularize para evitar a suspensão do acesso ${quando(diasAte(bloqueio))} (${bloqueio.toLocaleDateString('pt-BR')}).`,
              urgente: true,
              acao: 'Pagar agora',
            })
          } else if (diasAte(vencimento) <= DIAS_AVISO_MENSALIDADE) {
            setAviso({
              texto: `Sua mensalidade vence ${quando(diasAte(vencimento))} (${vencimento.toLocaleDateString('pt-BR')}).`,
              urgente: false,
              acao: 'Pagar agora',
            })
          }
        }
      })
    return () => { cancelado = true }
  }, [])

  if (!aviso) return null
  const { urgente } = aviso

  return (
    <div
      role="status"
      className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-sm md:px-6 ${
        urgente ? 'border-warning/40 bg-warning/10 text-foreground' : 'border-primary/15 bg-primary/5 text-foreground'
      }`}
    >
      <span className="flex items-center gap-2">
        <Clock className={`size-4 flex-shrink-0 ${urgente ? 'text-warning-foreground' : 'text-primary'}`} />
        {aviso.texto}
      </span>
      {perfil === 'administrador_geral' ? (
        <Link to="/sistema/meu-plano" className={classeBotao}>{aviso.acao}</Link>
      ) : (
        <a href={CONTATO_ASSINATURA} className={classeBotao}>Falar com a OonSystems</a>
      )}
    </div>
  )
}
