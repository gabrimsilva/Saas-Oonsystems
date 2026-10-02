import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import InformacoesEstabelecimentoModal from "@/components/InformacoesEstabelecimentoModal"
import BotoesFlutantes from "@/components/delivery/BotoesFlutantes"
import { configuracaoService } from "@/services"

export default function TermosUso() {
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
          <h1 className="text-2xl font-semibold text-foreground mb-6">Termos de Uso</h1>
          
          <div className="space-y-6 text-foreground/80">
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">1. Aceitação dos Termos</h2>
                <p>
                  Ao utilizar nosso sistema de delivery, você concorda com estes termos de uso. 
                  Se não concordar com algum dos termos, não utilize nossos serviços. Estes termos 
                  podem ser atualizados periodicamente, e é sua responsabilidade revisá-los regularmente.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">2. Uso do Serviço</h2>
                <p>
                  Nosso serviço de delivery está disponível para pedidos de alimentos e bebidas. 
                  Você deve fornecer informações precisas e atualizadas ao fazer pedidos. É proibido:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li>Fornecer informações falsas ou enganosas</li>
                  <li>Usar o serviço para fins ilegais ou não autorizados</li>
                  <li>Tentar acessar áreas restritas do sistema</li>
                  <li>Interferir no funcionamento adequado do serviço</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">3. Pedidos e Pagamentos</h2>
                <p>
                  Todos os pedidos estão sujeitos à disponibilidade dos produtos. 
                  Os preços podem variar sem aviso prévio. O pagamento deve ser efetuado 
                  conforme as opções disponíveis no momento do pedido.
                </p>
                <p className="mt-2">
                  Ao confirmar um pedido, você está fazendo uma oferta de compra. Reservamo-nos 
                  o direito de recusar ou cancelar qualquer pedido por motivos como disponibilidade 
                  de produtos, erros de preço ou suspeita de fraude.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">4. Entrega</h2>
                <p>
                  Os tempos de entrega são estimativas e podem variar conforme a demanda 
                  e condições externas. Não nos responsabilizamos por atrasos causados 
                  por fatores externos como condições climáticas, trânsito ou eventos imprevistos.
                </p>
                <p className="mt-2">
                  É responsabilidade do cliente fornecer um endereço de entrega correto e 
                  estar disponível para receber o pedido no horário estimado.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">5. Cancelamentos e Reembolsos</h2>
                <p>
                  Pedidos podem ser cancelados até o início do preparo. 
                  Após esse momento, o cancelamento pode não ser possível. Em caso de cancelamento 
                  válido, o reembolso será processado conforme a forma de pagamento utilizada.
                </p>
                <p className="mt-2">
                  Se houver problemas com seu pedido, entre em contato conosco imediatamente 
                  para que possamos resolver a situação.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">6. Responsabilidades</h2>
                <p>
                  O {configuracoes.nome_estabelecimento} se compromete a fornecer produtos de qualidade 
                  e serviço adequado, mas não se responsabiliza por danos indiretos 
                  ou consequenciais decorrentes do uso do serviço.
                </p>
                <p className="mt-2">
                  Não nos responsabilizamos por alergias alimentares não informadas previamente 
                  ou por reações adversas a ingredientes listados na descrição dos produtos.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">7. Propriedade Intelectual</h2>
                <p>
                  Todo o conteúdo do site, incluindo textos, imagens, logos e design, 
                  é propriedade do {configuracoes.nome_estabelecimento} e está protegido 
                  por leis de direitos autorais. É proibida a reprodução sem autorização prévia.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">8. Modificações dos Termos</h2>
                <p>
                  Reservamo-nos o direito de modificar estes termos a qualquer momento. 
                  As alterações entrarão em vigor imediatamente após sua publicação no site. 
                  O uso continuado do serviço após as alterações constitui aceitação dos novos termos.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">9. Lei Aplicável</h2>
                <p>
                  Estes termos são regidos pelas leis brasileiras. Qualquer disputa será 
                  resolvida no foro da comarca do estabelecimento.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">10. Contato</h2>
                <p>
                  Para questões sobre estes termos, entre em contato através dos 
                  nossos canais de atendimento disponíveis no site.
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
