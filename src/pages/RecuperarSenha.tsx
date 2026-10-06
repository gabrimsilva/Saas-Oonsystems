import { useState } from 'react'
import { ArrowLeft, Mail } from 'lucide-react'
import { authService } from '@/services'
import { AuthLayout, CampoAuth } from '@/components/auth/AuthLayout'
import { Button } from '@/components/ui/button'
import { Alerta } from '@/components/ui/feedback'

/**
 * "Esqueceu sua senha?": envia o e-mail com o link para /reset-password.
 * A resposta é sempre a mesma, exista ou não a conta (não revela e-mails cadastrados).
 */
export default function RecuperarSenha() {
  const [email, setEmail] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setCarregando(true)
    setError('')
    try {
      await authService.solicitarResetSenha(email.trim())
      setEnviado(true)
    } catch (err: any) {
      if (err.message?.includes('rate limit') || err.message?.includes('Too many requests')) {
        setError('Muitas tentativas. Aguarde alguns minutos e tente novamente.')
      } else {
        setError('Não foi possível enviar o e-mail. Tente novamente.')
      }
    } finally {
      setCarregando(false)
    }
  }

  return (
    <AuthLayout
      titulo="Recuperar senha"
      subtitulo="Informe o e-mail da sua conta para receber o link de redefinição."
      rodape={
        <a href="/login" className="inline-flex items-center gap-1 font-medium text-primary hover:text-primary-hover hover:underline underline-offset-4">
          <ArrowLeft className="size-4" />
          Voltar para o login
        </a>
      }
    >
      {enviado ? (
        <Alerta tipo="sucesso" titulo="Verifique seu e-mail">
          Se houver uma conta com <strong>{email.trim()}</strong>, você receberá em instantes um link para criar
          uma nova senha. Confira também a caixa de spam.
        </Alerta>
      ) : (
        <form className="space-y-5" onSubmit={handleEnviar}>
          {error && <Alerta tipo="erro">{error}</Alerta>}
          <CampoAuth
            id="email"
            rotulo="E-mail"
            icone={Mail}
            type="email"
            placeholder="voce@empresa.com.br"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoFocus
            required
          />
          <Button type="submit" size="lg" className="w-full" loading={carregando}>
            {carregando ? 'Enviando...' : 'Enviar link'}
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
