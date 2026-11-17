import { useState } from 'react'
import toast from 'react-hot-toast'
import { Check } from 'lucide-react'
import { useTemaCliente } from '@/contexts/TemaClienteContext'
import { usePermissoes } from '@/hooks/usePermissoes'
import { TEMAS_SISTEMA, type TemaSistema } from '@/lib/temasSistema'

/** Mini painel com as cores do tema (menu, botão e gráfico) */
function Previa({ tema }: { tema: TemaSistema }) {
  return (
    <div className="flex h-28 overflow-hidden rounded-lg border border-border bg-background" aria-hidden="true">
      <div className="flex w-1/3 flex-col gap-1.5 border-r border-border p-2" style={{ background: tema.menu }}>
        <span className="h-2 w-10 rounded-full bg-foreground/15" />
        <span className="flex items-center gap-1 rounded px-1 py-1" style={{ background: tema.realce }}>
          <span className="size-1.5 rounded-full" style={{ background: tema.primaria }} />
          <span className="h-1.5 w-8 rounded-full" style={{ background: tema.primaria }} />
        </span>
        <span className="h-1.5 w-9 rounded-full bg-foreground/15" />
        <span className="h-1.5 w-7 rounded-full bg-foreground/15" />
      </div>
      <div className="flex flex-1 flex-col justify-between bg-card p-2">
        <div className="flex items-center justify-between">
          <span className="h-2 w-12 rounded-full bg-foreground/20" />
          <span className="h-4 w-10 rounded" style={{ background: tema.primaria }} />
        </div>
        <div className="flex h-12 items-end gap-1">
          {[55, 80, 40, 95, 65].map((h, i) => (
            <span key={i} className="flex flex-1 items-end gap-px">
              <span className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: tema.primaria }} />
              <span className="flex-1 rounded-t-sm" style={{ height: `${h * 0.6}%`, background: tema.secundaria }} />
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ConfiguracoesTemaPage() {
  const { tema, mudarTema } = useTemaCliente()
  const { perfil } = usePermissoes()
  const podeAlterar = perfil === 'administrador_geral'
  const [salvando, setSalvando] = useState<string | null>(null)

  const escolher = async (t: TemaSistema) => {
    if (!podeAlterar || t.id === tema || salvando) return
    setSalvando(t.id)
    try {
      await mudarTema(t.id)
      toast.success(`Tema "${t.nome}" aplicado para todas as lojas`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível mudar o tema')
    } finally {
      setSalvando(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Tema do sistema</h2>
        <p className="text-muted-foreground">
          As cores do painel para todas as lojas da empresa. O catálogo da loja tem as cores dele em Aparência.
        </p>
        {!podeAlterar && (
          <p className="mt-2 text-sm text-warning-foreground">Só o administrador geral pode mudar o tema.</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" role="radiogroup" aria-label="Tema do sistema">
        {TEMAS_SISTEMA.map((t) => {
          const ativo = t.id === tema
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={ativo}
              disabled={!podeAlterar || salvando !== null}
              onClick={() => escolher(t)}
              className={`group rounded-xl border bg-card p-3 text-left transition-shadow disabled:cursor-default ${
                ativo ? 'border-primary ring-2 ring-primary/25' : 'border-border hover:shadow-md enabled:cursor-pointer'
              }`}
            >
              <Previa tema={t} />
              <div className="mt-3 flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{t.nome}</p>
                  <p className="text-xs text-muted-foreground">{t.descricao}</p>
                </div>
                {ativo ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    <Check className="size-3.5" aria-hidden="true" /> Em uso
                  </span>
                ) : salvando === t.id ? (
                  <span className="text-xs text-muted-foreground">Aplicando…</span>
                ) : null}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
