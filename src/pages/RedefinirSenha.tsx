import { useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import { authService, supabase } from '@/services'
import { AuthLayout, CampoSenha } from '@/components/auth/AuthLayout'
import { Button } from '@/components/ui/button'
import { Alerta } from '@/components/ui/feedback'

type Etapa = 'validando' | 'formulario' | 'invalido' | 'concluido'

/**
 * Destino do link de recuperação (/reset-password). O Supabase abre uma
 * sessão de recuperação a partir do link (#access_token ou ?code=) e aqui o
 * usuário define a nova senha.
 */
export default function RedefinirSenha() {
  const [etapa, setEtapa] = useState<Etapa>('validando')
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let ativo = true
    const liberar = () => { if (ativo) setEtapa('formulario') }

    // Link expirado/usado: o Supabase devolve o erro na URL
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const query = new URLSearchParams(window.location.search)
    if (hash.get('error') || query.get('error')) {
      setEtapa('invalido')
      return
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) liberar()
    })

    const validar = async () => {
      const codigo = query.get('code')
      if (codigo) {
        const { error } = await supabase.auth.exchangeCodeForSession(codigo)
        if (error) { if (ativo) setEtapa('invalido'); return }
        liberar()
        return
      }
      // Fluxo implícito: a sessão já pode ter sido criada a partir do #access_token
      const { data: { session } } = await supabase.auth.getSession()
      if (session) liberar()
      else setTimeout(() => { if (ativo) setEtapa((e) => (e === 'validando' ? 'invalido' : e)) }, 4000)
    }
    validar()

    return () => {
      ativo = false
      subscription.unsubscribe()
    }
  }, [])

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (senha.length < 8) { setError('A senha deve ter no mínimo 8 caracteres.'); return }
    if (senha !== confirmacao) { setError('As senhas não conferem.'); return }

    setCarregando(true)
    try {
      await authService.alterarSenha(senha)
      await authService.logout()
      setEtapa('concluido')
    } catch (err: any) {
      if (err.message?.includes('different from the old')) {
        setError('A nova senha deve ser diferente da anterior.')
      } else if (err.message?.toLowerCase().includes('weak') || err.message?.toLowerCase().includes('pwned')) {
        setError('Senha muito fraca ou já exposta em vazamentos. Escolha outra.')
      } else {
        setError('Não foi possível salvar a nova senha. Tente novamente.')
      }
    } finally {
      setCarregando(false)
    }
  }

  const voltar = (
    <a href="/login" className="font-medium text-primary hover:text-primary-hover hover:underline underline-offset-4">
      Ir para o login
    </a>
  )

  return (
    <AuthLayout titulo="Criar nova senha" subtitulo="Escolha uma senha com pelo menos 8 caracteres." rodape={voltar}>
      {etapa === 'validando' && <p className="text-sm text-muted-foreground">Validando o link...</p>}

      {etapa === 'invalido' && (
        <Alerta tipo="erro" titulo="Link inválido ou expirado">
          Peça um novo link em{' '}
          <a href="/recuperar-senha" className="font-medium underline underline-offset-4">Esqueceu sua senha?</a>
        </Alerta>
      )}

      {etapa === 'concluido' && (
        <Alerta tipo="sucesso" titulo="Senha alterada">
          Sua senha foi redefinida. Entre novamente com a nova senha.
        </Alerta>
      )}

      {etapa === 'formulario' && (
        <form className="space-y-5" onSubmit={handleSalvar}>
          {error && <Alerta tipo="erro">{error}</Alerta>}
          <CampoSenha
            id="senha"
            rotulo="Nova senha"
            icone={Lock}
            placeholder="Mín. 8 caracteres"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            mostrar={mostrar}
            onAlternar={() => setMostrar((v) => !v)}
            minLength={8}
            autoComplete="new-password"
            autoFocus
            required
          />
          <CampoSenha
            id="confirmacao"
            rotulo="Confirmar nova senha"
            icone={Lock}
            placeholder="Repita a senha"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            mostrar={mostrar}
            onAlternar={() => setMostrar((v) => !v)}
            minLength={8}
            autoComplete="new-password"
            required
          />
          <Button type="submit" size="lg" className="w-full" loading={carregando}>
            {carregando ? 'Salvando...' : 'Salvar nova senha'}
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
