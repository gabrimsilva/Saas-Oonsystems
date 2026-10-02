import type { Plano, RegistroAuditoria } from '@/services/plataformaService'
import { formatarData, ROTULO_CAMPO, ROTULO_STATUS_TEXTO } from './comum'

const CAMPOS_DATA = new Set(['vigencia_ate', 'trial_ate'])

function valorLegivel(campo: string, valor: unknown, planos: Plano[]): string {
  if (valor === null || valor === undefined || valor === '') return '—'
  if (campo === 'status') return ROTULO_STATUS_TEXTO[String(valor)] ?? String(valor)
  if (campo === 'plano_id') return planos.find((p) => p.id === valor)?.nome ?? 'plano removido'
  if (campo === 'ciclo') return valor === 'anual' ? 'Anual' : 'Mensal'
  if (CAMPOS_DATA.has(campo)) return formatarData(String(valor))
  if (campo === 'origem') return valor === 'site' ? 'Site (autocadastro)' : 'Plataforma'
  return String(valor)
}

/** Resumo legível de um registro de auditoria ("Status: Em teste → Bloqueado") */
export default function DetalhesAuditoria({ registro, planos }: { registro: RegistroAuditoria; planos: Plano[] }) {
  const entradas = Object.entries(registro.detalhes ?? {})
  if (entradas.length === 0) return <span className="text-muted-foreground/70">—</span>

  return (
    <ul className="space-y-0.5">
      {entradas.map(([campo, valor]) => {
        const rotulo = ROTULO_CAMPO[campo] ?? campo
        const mudanca = valor && typeof valor === 'object' && 'para' in (valor as object)
          ? (valor as { de: unknown; para: unknown })
          : null
        return (
          <li key={campo} className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">{rotulo}:</span>{' '}
            {mudanca ? (
              <>
                <span className="line-through text-muted-foreground/70">{valorLegivel(campo, mudanca.de, planos)}</span>
                {' → '}
                <span className="text-foreground">{valorLegivel(campo, mudanca.para, planos)}</span>
              </>
            ) : Array.isArray(valor) ? (
              valor.join(', ')
            ) : (
              valorLegivel(campo, valor, planos)
            )}
          </li>
        )
      })}
    </ul>
  )
}
