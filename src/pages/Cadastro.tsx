import { useState } from 'react'
import { ArrowRight, Building2, IdCard, Lock, Mail, Store, User } from 'lucide-react'
import { authService } from "@/services"
import { cadastrarClientePeloSite } from "@/services/plataformaService"
import { AuthLayout, CampoAuth, CampoSenha } from '@/components/auth/AuthLayout'
import { Button } from '@/components/ui/button'
import { Alerta } from '@/components/ui/feedback'

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

  return (
    <AuthLayout
      titulo="Crie sua conta"
      subtitulo={<>São {DIAS_TESTE} dias de teste grátis, sem cartão de crédito.</>}
      destaque={`Comece hoje: ${DIAS_TESTE} dias para testar tudo, sem compromisso.`}
      rodape={
        <p>
          Já tem conta?{' '}
          <a href="/login" className="font-medium text-primary hover:text-primary-hover hover:underline underline-offset-4">
            Entrar
          </a>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={handleCadastrar}>
        {error && <Alerta tipo="erro">{error}</Alerta>}

        <fieldset className="space-y-4">
          <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sua empresa</legend>
          <CampoAuth id="documento" rotulo="CPF ou CNPJ" icone={IdCard} value={documento}
            onChange={(ev) => setDocumento(ev.target.value)}
            placeholder="000.000.000-00 ou 00.000.000/0000-00" maxLength={18} required />
          <CampoAuth id="razao" rotulo="Razão social ou nome completo" icone={Building2} value={razaoSocial}
            onChange={(ev) => setRazaoSocial(ev.target.value)} maxLength={150} required />
          <CampoAuth id="fantasia" rotulo="Nome da loja (opcional)" icone={Store} value={nomeFantasia}
            onChange={(ev) => setNomeFantasia(ev.target.value)}
            placeholder="Como seus clientes conhecem você" maxLength={150} />
        </fieldset>

        <fieldset className="space-y-4 border-t border-border pt-5">
          <legend className="sr-only">Seu acesso</legend>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seu acesso</p>
          <CampoAuth id="nome" rotulo="Seu nome" icone={User} value={nome}
            onChange={(ev) => setNome(ev.target.value)} maxLength={120} required autoComplete="name" />
          <CampoAuth id="email" rotulo="E-mail" icone={Mail} type="email" value={email}
            onChange={(ev) => setEmail(ev.target.value)} required autoComplete="email" />
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoSenha id="senha" rotulo="Senha" icone={Lock} placeholder="Mín. 8 caracteres"
              value={senha} onChange={(ev) => setSenha(ev.target.value)} minLength={8} autoComplete="new-password" required
              mostrar={mostrarSenha} onAlternar={() => setMostrarSenha(!mostrarSenha)} />
            <CampoSenha id="confirmar" rotulo="Confirme a senha" placeholder="Repita a senha"
              value={confirmarSenha} onChange={(ev) => setConfirmarSenha(ev.target.value)} autoComplete="new-password" required
              mostrar={mostrarSenha} onAlternar={() => setMostrarSenha(!mostrarSenha)}
              aria-invalid={!!confirmarSenha && confirmarSenha !== senha ? true : undefined} />
          </div>
        </fieldset>

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

        <Button type="submit" size="lg" className="w-full" loading={carregando}>
          {carregando ? 'Criando sua conta...' : (
            <>
              Começar teste grátis
              <ArrowRight />
            </>
          )}
        </Button>
      </form>
    </AuthLayout>
  )
}
