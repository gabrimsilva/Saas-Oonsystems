import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import InformacoesEstabelecimentoModal from "@/components/InformacoesEstabelecimentoModal"
import BotoesFlutantes from "@/components/delivery/BotoesFlutantes"
import { configuracaoService } from "@/services"

export default function PoliticasPrivacidade() {
  const navigate = useNavigate()
  const [modalAberto, setModalAberto] = useState(false)
  const [configuracoes, setConfiguracoes] = useState({
    nome_estabelecimento: "Estabelecimento",
    logo_url: "",
    banner_url: ""
  })

  useEffect(() => {
    carregarConfiguracoes()
  }, [])

  const carregarConfiguracoes = async () => {
    try {
      const configsMap = await configuracaoService.buscarMultiplas([
        'nome_loja',
        'logo_url',
        'banner_url'
      ])

      setConfiguracoes({
        nome_estabelecimento: configsMap.get('nome_loja')?.valor || "Estabelecimento",
        logo_url: configsMap.get('logo_url')?.valor || "",
        banner_url: configsMap.get('banner_url')?.valor || ""
      })
    } catch (error) {
      console.error("Erro ao carregar configurações:", error)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/50">
      <Header
        nomeEstabelecimento={configuracoes.nome_estabelecimento}
        logoUrl={configuracoes.logo_url}
        bannerUrl={configuracoes.banner_url}
        onMaisInformacoes={() => setModalAberto(true)}
        showBackButton={true}
        onBack={() => navigate("/")}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
        <div className="bg-card rounded-lg shadow-sm p-6 md:p-8">
          <h1 className="text-2xl font-semibold text-foreground mb-6">Políticas de Privacidade</h1>
          
          <div className="space-y-6 text-foreground/80">
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">1. Informações Coletadas</h2>
                <p>
                  Coletamos informações necessárias para processar seus pedidos e melhorar 
                  nossos serviços. As informações coletadas incluem:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li>Nome completo</li>
                  <li>Telefone para contato</li>
                  <li>Endereço de entrega</li>
                  <li>E-mail (quando fornecido)</li>
                  <li>Histórico de pedidos</li>
                  <li>Preferências alimentares e observações</li>
                  <li>Informações de pagamento (processadas de forma segura)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">2. Uso das Informações</h2>
                <p>
                  Suas informações são utilizadas exclusivamente para:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li>Processar e entregar seus pedidos</li>
                  <li>Entrar em contato sobre o status do pedido</li>
                  <li>Melhorar nossos serviços e experiência do usuário</li>
                  <li>Enviar promoções e ofertas (apenas com seu consentimento)</li>
                  <li>Cumprir obrigações legais e regulatórias</li>
                  <li>Prevenir fraudes e garantir a segurança do serviço</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">3. Compartilhamento de Dados</h2>
                <p>
                  Não compartilhamos suas informações pessoais com terceiros para fins 
                  comerciais. Seus dados podem ser compartilhados apenas nas seguintes situações:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li>Com entregadores parceiros, apenas as informações necessárias para a entrega</li>
                  <li>Com processadores de pagamento, para completar transações</li>
                  <li>Quando exigido por lei ou ordem judicial</li>
                  <li>Para proteger nossos direitos legais</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">4. Segurança dos Dados</h2>
                <p>
                  Implementamos medidas de segurança técnicas e organizacionais adequadas 
                  para proteger suas informações contra acesso não autorizado, alteração, 
                  divulgação ou destruição. Isso inclui:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li>Criptografia de dados sensíveis</li>
                  <li>Acesso restrito às informações pessoais</li>
                  <li>Monitoramento regular de segurança</li>
                  <li>Treinamento de funcionários sobre proteção de dados</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">5. Cookies e Tecnologias Similares</h2>
                <p>
                  Utilizamos cookies e tecnologias similares para:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li>Melhorar sua experiência de navegação</li>
                  <li>Lembrar suas preferências e configurações</li>
                  <li>Analisar o uso do nosso serviço</li>
                  <li>Personalizar conteúdo e ofertas</li>
                </ul>
                <p className="mt-2">
                  Você pode gerenciar suas preferências de cookies através das configurações 
                  do seu navegador.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">6. Retenção de Dados</h2>
                <p>
                  Mantemos suas informações pessoais apenas pelo tempo necessário para 
                  cumprir as finalidades descritas nesta política, a menos que um período 
                  de retenção mais longo seja exigido ou permitido por lei.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">7. Seus Direitos (LGPD)</h2>
                <p>
                  De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem os seguintes direitos:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li>Confirmar a existência de tratamento de dados</li>
                  <li>Acessar seus dados pessoais</li>
                  <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
                  <li>Solicitar a anonimização, bloqueio ou eliminação de dados</li>
                  <li>Solicitar a portabilidade dos dados</li>
                  <li>Revogar o consentimento</li>
                  <li>Opor-se ao tratamento de dados</li>
                </ul>
                <p className="mt-2">
                  Para exercer esses direitos, entre em contato conosco através dos 
                  canais de atendimento.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">8. Menores de Idade</h2>
                <p>
                  Nosso serviço não é direcionado a menores de 18 anos. Não coletamos 
                  intencionalmente informações de menores. Se você é pai ou responsável 
                  e acredita que seu filho forneceu informações, entre em contato conosco.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">9. Alterações na Política</h2>
                <p>
                  Podemos atualizar esta política de privacidade periodicamente. 
                  Notificaremos sobre alterações significativas através do site ou 
                  por e-mail. Recomendamos revisar esta página regularmente.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">10. Contato</h2>
                <p>
                  Para questões sobre privacidade, exercer seus direitos ou reportar 
                  preocupações, entre em contato através dos nossos canais de atendimento 
                  disponíveis no site.
                </p>
                <p className="mt-2">
                  Encarregado de Dados: {configuracoes.nome_estabelecimento}
                </p>
              </section>

              <div className="mt-8 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Última atualização: {new Date().toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
        </div>
      </main>

      <BotoesFlutantes />

      <Footer nomeEstabelecimento={configuracoes.nome_estabelecimento} />


      <InformacoesEstabelecimentoModal
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
      />
    </div>
  )
}
