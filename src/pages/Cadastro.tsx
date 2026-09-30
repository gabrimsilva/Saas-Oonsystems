import { useState } from 'react'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { authService } from "@/services"
import { cadastrarClientePeloSite } from "@/services/plataformaService"
import './LoginPremium.css'

const DIAS_TESTE = 14

/**
 * Autocadastro pelo site: cria o cliente em período de teste com a primeira
 * loja e já entra no sistema com o login criado.
 */
export default function Cadastro() {
  const [documento, setDocumento] = useState('')
  const [razaoSocial, setRazaoSocial] = useState('')
  const [nomeFantasia, setNomeFantasia] = useState('')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [isca, setIsca] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [error, setError] = useState('')

  const handleCadastrar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (senha.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.')
      return
    }
    if (senha !== confirmarSenha) {
      setError('As senhas não conferem.')
      return
    }

    setCarregando(true)
    try {
      await cadastrarClientePeloSite({
        documento: documento.trim(),
        razao_social: razaoSocial.trim(),
        nome_fantasia: nomeFantasia.trim() || undefined,
        admin_nome: nome.trim(),
        admin_email: email.trim().toLowerCase(),
        admin_senha: senha,
        site: isca,
      })

      // Cadastro concluído: entra direto no sistema com o login criado
      await authService.login(email.trim().toLowerCase(), senha)
      window.location.href = '/sistema'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível concluir o cadastro.')
    } finally {
      setCarregando(false)
    }
  }

  const campo = (
    id: string,
    rotulo: string,
    valor: string,
    setValor: (v: string) => void,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <div className="form-group">
      <label htmlFor={id} className="form-label">{rotulo}</label>
      <input
        id={id}
        value={valor}
        onChange={(ev) => setValor(ev.target.value)}
        className="form-input"
        {...props}
      />
    </div>
  )

  return (
    <div className="login-premium-container">
      <div className="login-bg-gradient"></div>
      <div className="login-bg-texture"></div>
      <div className="login-bg-ambient"></div>

      <div className="login-content">
        <div className="login-left">
          <div className="login-left-bg">
            <div className="pastor-bg-container" />
          </div>
          <div className="login-left-content">
            <div className="title-section">
              <h1 className="title-line-2">OonSystems</h1>
              <p className="subtitle">Teste grátis por {DIAS_TESTE} dias</p>
            </div>
            <div className="description-section">
              <p className="description-text">
                PDV, estoque, comandas e métricas<br />
                em um só lugar.<br />
                Sem cartão de crédito.
              </p>
            </div>
          </div>
        </div>

        <div className="login-right login-right-rolavel">
          <div className="login-card">
            <div className="login-header">
              <h2>Crie sua conta</h2>
              <p>Comece a usar agora. São {DIAS_TESTE} dias de teste.</p>
            </div>

            <form className="login-form" onSubmit={handleCadastrar}>
              {error && (
                <div className="form-error">
                  <p>{error}</p>
                </div>
              )}

              {campo('documento', 'CPF ou CNPJ', documento, setDocumento, {
                placeholder: '000.000.000-00 ou 00.000.000/0000-00', maxLength: 18, required: true,
              })}
              {campo('razao', 'Razão social ou nome completo', razaoSocial, setRazaoSocial, {
                maxLength: 150, required: true,
              })}
              {campo('fantasia', 'Nome da loja (opcional)', nomeFantasia, setNomeFantasia, {
                placeholder: 'Como seus clientes conhecem você', maxLength: 150,
              })}
              {campo('nome', 'Seu nome', nome, setNome, { maxLength: 120, required: true, autoComplete: 'name' })}
              {campo('email', 'E-mail', email, setEmail, { type: 'email', required: true, autoComplete: 'email' })}

              <div className="form-group">
                <label htmlFor="senha" className="form-label">Senha</label>
                <div className="form-input-wrapper">
                  <input
                    id="senha"
                    type={mostrarSenha ? 'text' : 'password'}
                    placeholder="Mínimo de 8 caracteres"
                    value={senha}
                    onChange={(ev) => setSenha(ev.target.value)}
                    className="form-input"
                    minLength={8}
                    autoComplete="new-password"
                    required
                  />
                  <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)} className="form-input-icon">
                    {mostrarSenha ? <EyeOff width={16} height={16} /> : <Eye width={16} height={16} />}
                  </button>
                </div>
              </div>
              {campo('confirmar', 'Confirme a senha', confirmarSenha, setConfirmarSenha, {
                type: mostrarSenha ? 'text' : 'password', required: true, autoComplete: 'new-password',
              })}

              {/* Campo-isca contra robôs: escondido de pessoas */}
              <input
                type="text"
                name="site"
                value={isca}
                onChange={(ev) => setIsca(ev.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, opacity: 0 }}
              />

              <button type="submit" className={`form-button ${carregando ? 'loading' : ''}`} disabled={carregando}>
                {carregando ? (
                  <>
                    <span className="spinner"></span>
                    Criando sua conta...
                  </>
                ) : (
                  <>
                    Começar teste grátis
                    <ArrowRight width={16} height={16} />
                  </>
                )}
              </button>
            </form>

            <div className="login-card-footer">
              <p className="footer-text">
                Já tem conta? <a href="/login">Entrar</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
