import { useState } from 'react'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { authService, supabase } from "@/services"
import { plataformaService } from "@/services/plataformaService"
import './LoginPremium.css'

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
  const [mostrarSenha, setMostrarSenha] = useState(false)
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
        await recusar('O acesso deste cliente está suspenso. Entre em contato com a OonSystems.')
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
    <div className="login-premium-container">
      {/* Background com gradiente e texturas */}
      <div className="login-bg-gradient"></div>
      <div className="login-bg-texture"></div>
      <div className="login-bg-ambient"></div>

      {/* Conteúdo Principal */}
      <div className="login-content">
        {/* Lado Esquerdo - 50% */}
        <div className="login-left">
          {/* Background com textura sutil */}
          <div className="login-left-bg">
            <div className="pastor-bg-container" />
          </div>

          {/* Conteúdo Esquerdo Overlay */}
          <div className="login-left-content">
            {/* Título */}
            <div className="title-section">
              <h1 className="title-line-2">OonSystems</h1>
              <p className="subtitle">Gestão para o seu negócio</p>
            </div>

            {/* Descrição */}
            <div className="description-section">
              <p className="description-text">
                Sistema completo de gestão<br />
                para o seu negócio.<br />
                Modernidade e eficiência.
              </p>
            </div>

            {/* Card Destaque */}
            <div className="verse-card">
              <svg className="verse-quote" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p className="verse-text">
                Gestão inteligente de estoque, vendas e métricas em um só lugar.
              </p>
              <p className="verse-reference">OonSystems</p>
            </div>
          </div>

        </div>

        {/* Lado Direito - 40% */}
        <div className="login-right">
          {/* Login Card */}
          <div className="login-card">
            {/* Header */}
            <div className="login-header">
              <h2>Bem-vindo(a)!</h2>
              <p>Faça login para acessar o sistema.</p>
            </div>

            {/* Form */}
            <form className="login-form" onSubmit={handleEntrar}>
              {/* Erro */}
              {error && (
                <div className="form-error">
                  <p>{error}</p>
                </div>
              )}

              {/* Email */}
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                  </svg>
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="Digite seu e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              {/* Senha */}
              <div className="form-group">
                <label htmlFor="senha" className="form-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  Senha
                </label>
                <div className="form-input-wrapper">
                  <input
                    id="senha"
                    type={mostrarSenha ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="form-input"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="form-input-icon"
                  >
                    {mostrarSenha ? (
                      <EyeOff width={16} height={16} />
                    ) : (
                      <Eye width={16} height={16} />
                    )}
                  </button>
                </div>
              </div>

              {/* Checkbox e Link */}
              <div className="form-footer">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={lembrarMe}
                    onChange={(e) => setLembrarMe(e.target.checked)}
                    className="checkbox-input"
                  />
                  <span>Lembrar-me</span>
                </label>
                <a href="#" className="form-link">
                  Esqueceu sua senha?
                </a>
              </div>

              {/* Botão */}
              <button
                type="submit"
                className={`form-button ${carregando ? 'loading' : ''}`}
                disabled={carregando}
              >
                {carregando ? (
                  <>
                    <span className="spinner"></span>
                    Entrando...
                  </>
                ) : (
                  <>
                    Entrar
                    <ArrowRight width={16} height={16} />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="login-card-footer">
              <p className="footer-text">
                Criado por <a href="https://oonsystems.tech" target="_blank" rel="noopener noreferrer">OonSystems</a>
              </p>
            </div>


          </div>
        </div>
      </div>
    </div>
  )
}
