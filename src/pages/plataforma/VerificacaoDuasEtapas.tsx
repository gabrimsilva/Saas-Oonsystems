/**
 * Verificação em duas etapas da administração da plataforma.
 *
 * O banco só libera os dados da plataforma com a sessão em nível aal2 (senha +
 * código do app autenticador). Sem autenticador cadastrado, mostra o QR code
 * para cadastrar; com ele, pede o código de 6 dígitos.
 */

import { useEffect, useState } from 'react'
import { KeyRound, LogOut, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Carregando } from './comum'

type Etapa =
  | { tipo: 'carregando' }
  | { tipo: 'cadastrar'; fatorId: string; qrCode: string; segredo: string }
  | { tipo: 'codigo'; fatorId: string }
  | { tipo: 'erro'; mensagem: string }

export default function VerificacaoDuasEtapas({ onConcluido, onSair }: { onConcluido: () => void; onSair: () => void }) {
  const [etapa, setEtapa] = useState<Etapa>({ tipo: 'carregando' })
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [verificando, setVerificando] = useState(false)

  useEffect(() => {
    let cancelado = false
    ;(async () => {
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (cancelado) return
      if (error) return setEtapa({ tipo: 'erro', mensagem: error.message })

      const verificado = data.totp.find((f) => f.status === 'verified')
      if (verificado) return setEtapa({ tipo: 'codigo', fatorId: verificado.id })

      // Cadastro que ficou pela metade não deixa criar outro com o mesmo nome
      for (const f of data.all.filter((f) => f.factor_type === 'totp' && f.status !== 'verified')) {
        await supabase.auth.mfa.unenroll({ factorId: f.id })
      }
      const novo = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'OonSystems plataforma' })
      if (cancelado) return
      if (novo.error) return setEtapa({ tipo: 'erro', mensagem: novo.error.message })
      setEtapa({ tipo: 'cadastrar', fatorId: novo.data.id, qrCode: novo.data.totp.qr_code, segredo: novo.data.totp.secret })
    })()
    return () => {
      cancelado = true
    }
  }, [])

  const verificar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (etapa.tipo !== 'cadastrar' && etapa.tipo !== 'codigo') return
    if (!/^\d{6}$/.test(codigo)) return setErro('Digite os 6 números do app.')
    setVerificando(true)
    setErro(null)
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: etapa.fatorId, code: codigo })
    setVerificando(false)
    if (error) {
      setCodigo('')
      return setErro('Código inválido ou expirado. Confira o horário do celular e tente de novo.')
    }
    onConcluido()
  }

  if (etapa.tipo === 'carregando') return <div className="min-h-screen"><Carregando /></div>

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Verificação em duas etapas</h1>
            <p className="text-sm text-muted-foreground">Administração da plataforma</p>
          </div>
        </div>

        {etapa.tipo === 'erro' ? (
          <p className="mt-5 text-sm text-destructive" role="alert">
            Não foi possível iniciar a verificação: {etapa.mensagem}
          </p>
        ) : (
          <form onSubmit={verificar} className="mt-5 space-y-4">
            {etapa.tipo === 'cadastrar' ? (
              <>
                <p className="text-sm text-foreground/80">
                  Para proteger os dados de todos os clientes, a plataforma exige um código do celular além da senha.
                  No app autenticador (Google Authenticator, Microsoft Authenticator, Authy...), leia o QR code:
                </p>
                <div className="flex justify-center">
                  <img src={etapa.qrCode} alt="QR code para cadastrar no app autenticador" className="size-44 rounded-lg border border-border bg-white p-2" />
                </div>
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer">Não consegue ler? Digite a chave no app</summary>
                  <code className="mt-2 block break-all rounded bg-muted px-2 py-1.5 font-mono text-foreground">{etapa.segredo}</code>
                </details>
                <p className="text-sm text-foreground/80">Depois, digite o código de 6 números que aparece no app:</p>
              </>
            ) : (
              <p className="text-sm text-foreground/80">Digite o código de 6 números do seu app autenticador.</p>
            )}

            <label className="block">
              <span className="sr-only">Código</span>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  placeholder="000000"
                  className="h-11 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-center font-mono text-lg tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-ring/30"
                  aria-label="Código de 6 números"
                />
              </div>
            </label>
            {erro && <p className="text-sm text-destructive" role="alert">{erro}</p>}
            <Button type="submit" className="w-full" loading={verificando}>
              {etapa.tipo === 'cadastrar' ? 'Ativar e entrar' : 'Entrar'}
            </Button>
          </form>
        )}

        <button
          type="button"
          onClick={onSair}
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <LogOut className="size-4" aria-hidden="true" /> Sair
        </button>
      </div>
    </div>
  )
}
