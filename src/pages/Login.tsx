import { useState, useEffect } from 'react'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { authService, estabelecimentoService, supabase } from "@/services"
import type { Estabelecimento } from "@/types/estabelecimento"
import './LoginPremium.css'

interface LoginProps {
  onLogin: (credentials: { login: string; senha: string }) => void
}

export default function Login({ onLogin }: LoginProps) {
  const [estabelecimentoId, setEstabelecimentoId] = useState('')
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([])
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [lembrarMe, setLembrarMe] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [error, setError] = useState('')
  const [carregandoEstabs, setCarregandoEstabs] = useState(true)

  // Carregar estabelecimentos ativos
  useEffect(() => {
    const carregar = async () => {
      try {
        const lista = await estabelecimentoService.buscarAtivos()
        setEstabelecimentos(lista)
        if (lista.length === 1) {
          setEstabelecimentoId(lista[0].id)
        }
      } catch (err) {
        console.error('Erro ao carregar estabelecimentos:', err)
      } finally {
        setCarregandoEstabs(false)
      }
    }
    carregar()
  }, [])

  const handleEntrar = async (e: React.FormEvent) => {
    e.preventDefault()
    setCarregando(true)
    setError('')

    if (!estabelecimentoId) {
      setError('Selecione um estabelecimento')
      setCarregando(false)
      return
    }

    try {
      // 1. Autenticar
      await authService.login(email.trim(), senha.trim())

      // 2. Buscar o vínculo/perfil do usuário
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Não foi possível validar a sessão. Tente novamente.')
        await authService.logout()
        return
      }

      // 3. Buscar vínculo com estabelecimento
      const { data: vinculo } = await supabase
        .from('usuarios_estabelecimento')
        .select('perfil, estabelecimento_id, ativo')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!vinculo || !vinculo.ativo) {
        setError('Seu usuário não possui acesso ativo a nenhum estabelecimento.')
        await authService.logout()
        return
      }

      // 4. Validar estabelecimento escolhido
      const ehAdminGeral = vinculo.perfil === 'administrador_geral'
      if (!ehAdminGeral && vinculo.estabelecimento_id !== estabelecimentoId) {
        const nomeEscolhido = estabelecimentos.find(e => e.id === estabelecimentoId)?.nome || 'selecionado'
        setError(`Seu usuário não está configurado para acessar "${nomeEscolhido}".`)
        await authService.logout()
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
            {/* Logo LIRI */}
            <div className="liri-logo-container">
              <img 
                src="/img/liri-logo.png" 
                alt="LIRI Personalizados" 
                className="liri-logo"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>

            {/* Título */}
            <div className="title-section">
              <h1 className="title-line-2">LÍRI</h1>
              <p className="subtitle">Personalizados</p>
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
              <p className="verse-reference">LIRI Personalizados</p>
            </div>
          </div>

          {/* Logo Grande Marca D'água - Background */}
          <div className="santa-ceia-container">
            <img 
              src="/img/liri-logo.png" 
              alt="" 
              className="santa-ceia-image"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
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

              {/* Estabelecimento */}
              <div className="form-group">
                <label htmlFor="estab" className="form-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                  Estabelecimento
                </label>
                <select
                  id="estab"
                  value={estabelecimentoId}
                  onChange={(e) => setEstabelecimentoId(e.target.value)}
                  className="form-input form-select"
                  disabled={carregandoEstabs}
                >
                  <option value="">
                    {carregandoEstabs ? 'Carregando...' : 'Selecione um estabelecimento'}
                  </option>
                  {estabelecimentos.map(est => (
                    <option key={est.id} value={est.id}>
                      {est.nome}
                    </option>
                  ))}
                </select>
              </div>

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
                disabled={carregando || !estabelecimentoId}
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
