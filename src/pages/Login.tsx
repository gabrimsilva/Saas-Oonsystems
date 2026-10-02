import { useState } from 'react'
import { ArrowRight, Lock, Mail } from 'lucide-react'
import { authService, supabase } from "@/services"
import { plataformaService } from "@/services/plataformaService"
import { AuthLayout, CampoAuth, CampoSenha } from '@/components/auth/AuthLayout'
import { Button } from '@/components/ui/button'
import { Alerta } from '@/components/ui/feedback'

interface LoginProps {
  onLogin: (credentials: { login: string; senha: string }) => void
}

/**
 * Login do SaaS: pede apenas email e senha. O estabelecimento vem do vínculo
 * do usuário (nenhum dado de clientes é exibido antes da autenticação).
 */
export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [lembrarMe, setLembrarMe] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [error, setError] = useState('')

  const recusar = async (mensagem: string) => {
    setError(mensagem)
    await authService.logout()
  }

  const handleEntrar = async (e: React.FormEvent) => {
    e.preventDefault()
    setCarregando(true)
    setError('')

    try {
      // 1. Autenticar
      await authService.login(email.trim(), senha.trim())

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        await recusar('Não foi possível validar a sessão. Tente novamente.')
        return
      }

      // 2. Administração da plataforma não depende de estabelecimento
      if (await plataformaService.ehAdminPlataforma()) {
        onLogin({ login: email.trim(), senha: senha.trim() })
        return
      }

      // 3. Vínculo do usuário com o cliente/estabelecimento
      const { data: vinculo } = await supabase
        .from('usuarios_estabelecimento')
        .select('perfil, estabelecimento_id, ultimo_estabelecimento_id, ativo, tenants(status)')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!vinculo || !vinculo.ativo) {
        await recusar('Seu usuário não possui acesso ativo a nenhum estabelecimento.')
        return
      }
      // tenants só é visível com o cliente em teste/ativo (RLS)
      if (!vinculo.tenants) {
        await recusar('O período de teste terminou ou o acesso está suspenso. Entre em contato com a OonSystems.')
        return
      }

      // 4. Estabelecimento de entrada: o do vínculo, ou (admin geral) o último usado
      let estabelecimentoId: string | null = vinculo.estabelecimento_id
      if (vinculo.perfil === 'administrador_geral') {
        estabelecimentoId = vinculo.ultimo_estabelecimento_id
        if (!estabelecimentoId) {
          const { data: primeiro } = await supabase
            .from('estabelecimentos')
            .select('id')
            .eq('ativo', true)
            .order('criado_em', { ascending: true })
            .limit(1)
            .maybeSingle()
          estabelecimentoId = primeiro?.id ?? null
        }
      }
      if (!estabelecimentoId) {
        await recusar('Nenhum estabelecimento ativo encontrado para o seu usuário.')
        return
      }

      // 5. Persistir estabelecimento
      await supabase
        .from('usuarios_estabelecimento')
        .update({ ultimo_estabelecimento_id: estabelecimentoId })
        .eq('user_id', user.id)
      try {
        localStorage.setItem('estabelecimento_atual_id', estabelecimentoId)
      } catch { /* ignore */ }

      // 6. Sucesso
      onLogin({ login: email.trim(), senha: senha.trim() })
    } catch (err: any) {
      console.error('Erro no login:', err)

      if (err.message === 'USUARIO_BLOQUEADO') {
        window.location.href = '/usuario-bloqueado'
        return
      } else if (err.message?.includes('Invalid login credentials')) {
        setError('Email ou senha incorretos')
      } else if (err.message?.includes('Email not confirmed')) {
        setError('Email não confirmado.')
      } else if (err.message?.includes('Too many requests')) {
        setError('Muitas tentativas. Tente novamente em alguns minutos.')
      } else {
        setError('Erro ao fazer login. Tente novamente.')
      }
    } finally {
      setCarregando(false)
    }
  }

  return (
    <AuthLayout
      titulo="Entrar na sua conta"
      subtitulo="Use o e-mail e a senha cadastrados para acessar o painel."
      rodape={
        <>
          <p>
            Ainda não tem conta?{' '}
            <a href="/cadastro" className="font-medium text-primary hover:text-primary-hover hover:underline underline-offset-4">
              Teste grátis por 14 dias
            </a>
          </p>
          <p className="text-xs">
            Criado por{' '}
            <a href="https://oonsystems.tech" target="_blank" rel="noopener noreferrer" className="hover:text-foreground hover:underline underline-offset-4">
              OonSystems
            </a>
          </p>
        </>
      }
    >
      <form className="space-y-5" onSubmit={handleEntrar} noValidate={false}>
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
          aria-invalid={!!error || undefined}
        />

        <CampoSenha
          id="senha"
          rotulo="Senha"
          icone={Lock}
          placeholder="Digite sua senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoComplete="current-password"
          required
          aria-invalid={!!error || undefined}
          acessorio={
            <a href="#" className="text-xs font-medium text-primary hover:text-primary-hover hover:underline underline-offset-4">
              Esqueceu sua senha?
            </a>
          }
        />

        <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground select-none">
          <input
            type="checkbox"
            checked={lembrarMe}
            onChange={(e) => setLembrarMe(e.target.checked)}
            className="size-4 rounded border-input"
          />
          Lembrar-me neste dispositivo
        </label>

        <Button type="submit" size="lg" className="w-full" loading={carregando}>
          {carregando ? 'Entrando...' : (
            <>
              Entrar
              <ArrowRight />
            </>
          )}
        </Button>
      </form>
    </AuthLayout>
  )
}
