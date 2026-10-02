import { useState, useEffect } from "react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction
} from "@/components/ui/alert-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  MapPin,
  Phone,
  MessageCircle,
  Mail,
  CreditCard,
  Calendar,
  X
} from "lucide-react"
import { configuracaoService } from "@/services"

interface DiaDaSemana {
  nome: string
  aberto: boolean
  abertura: string
  fechamento: string
}

interface Configuracao {
  nomeEstabelecimento: string
  endereco: string
  cep: string
  telefone: string
  telefoneFixo: string
  whatsapp: string
  email: string
  diasSemana: DiaDaSemana[]
  trabalhaFeriado: boolean
  logoUrl: string
  formasPagamento: {
    dinheiro: boolean
    cartaoDebito: boolean
    cartaoCredito: boolean
    pix: boolean
    pixEntrega: boolean
    cartaoVR: boolean
    cartaoVA: boolean
    ticketPromo: boolean
  }
  ticketsPromocionais: string
}

interface InformacoesEstabelecimentoModalProps {
  isOpen: boolean
  onClose: () => void
}

const configDefault: Configuracao = {
  nomeEstabelecimento: '',
  endereco: '',
  cep: '',
  telefone: '',
  telefoneFixo: '',
  whatsapp: '',
  email: '',
  diasSemana: [],
  trabalhaFeriado: false,
  logoUrl: '',
  formasPagamento: {
    dinheiro: false,
    cartaoDebito: false,
    cartaoCredito: false,
    pix: false,
    pixEntrega: false,
    cartaoVR: false,
    cartaoVA: false,
    ticketPromo: false
  },
  ticketsPromocionais: '0'
}

export default function InformacoesEstabelecimentoModal({
  isOpen,
  onClose
}: InformacoesEstabelecimentoModalProps) {
  const [config, setConfig] = useState<Configuracao>(configDefault)
  const [loading, setLoading] = useState(false)

  // Carregar configurações do Supabase
  useEffect(() => {
    if (isOpen) {
      carregarConfiguracoes()
    }
  }, [isOpen])



  const carregarConfiguracoes = async () => {
    try {
      setLoading(true)

      // Carregar todas as configurações diretamente
      const [
        nome, endereco, cep, telefone, telefoneFixo, whatsapp, email,
        trabalhaFeriado, logoUrl, formasPagamento, horariosFuncionamento, ticketsPromocionais
      ] = await Promise.all([
        configuracaoService.buscarPorChave('nome_loja').catch(() => null),
        configuracaoService.buscarPorChave('endereco_loja').catch(() => null),
        configuracaoService.buscarPorChave('cep_loja').catch(() => null),
        configuracaoService.buscarPorChave('telefone_loja').catch(() => null),
        configuracaoService.buscarPorChave('telefone_fixo_loja').catch(() => null),
        configuracaoService.buscarPorChave('whatsapp_loja').catch(() => null),
        configuracaoService.buscarPorChave('email_loja').catch(() => null),
        configuracaoService.buscarPorChave('trabalha_feriado').catch(() => null),
        configuracaoService.buscarPorChave('logo_url').catch(() => null),
        configuracaoService.buscarPorChave('metodos_pagamento').catch(() => null),
        configuracaoService.buscarPorChave('horarios_funcionamento').catch(() => null),
        configuracaoService.buscarPorChave('tickets_promocionais').catch(() => null)
      ])

      // Processar horários de funcionamento
      let diasSemana: DiaDaSemana[] = []
      if (horariosFuncionamento?.valor) {
        try {
          diasSemana = JSON.parse(horariosFuncionamento.valor)
        } catch (error) {
          diasSemana = []
        }
      }

      // Processar formas de pagamento
      let formasPagamentoObj = {
        dinheiro: false,
        cartaoDebito: false,
        cartaoCredito: false,
        pix: false,
        pixEntrega: false,
        cartaoVR: false,
        cartaoVA: false,
        ticketPromo: false
      }

      if (formasPagamento?.valor) {
        try {
          const pagamentoData = JSON.parse(formasPagamento.valor)

          // Se for array (formato metodos_pagamento)
          if (Array.isArray(pagamentoData)) {
            formasPagamentoObj = {
              dinheiro: pagamentoData.includes('dinheiro'),
              cartaoDebito: pagamentoData.includes('cartao_debito'),
              cartaoCredito: pagamentoData.includes('cartao_credito'),
              pix: pagamentoData.includes('pix'),
              pixEntrega: pagamentoData.includes('pix_entrega'),
              cartaoVR: pagamentoData.includes('cartao_vr'),
              cartaoVA: pagamentoData.includes('cartao_va'),
              ticketPromo: pagamentoData.includes('ticket_promo')
            }
          } else {
            // Se for objeto (formato formas_pagamento)
            formasPagamentoObj = {
              dinheiro: pagamentoData.dinheiro || false,
              cartaoDebito: pagamentoData.cartaoDebito || false,
              cartaoCredito: pagamentoData.cartaoCredito || false,
              pix: pagamentoData.pix || false,
              pixEntrega: pagamentoData.pixEntrega || false,
              cartaoVR: pagamentoData.cartaoVR || false,
              cartaoVA: pagamentoData.cartaoVA || false,
              ticketPromo: pagamentoData.ticketPromo || false
            }
          }
        } catch (error) {
          // Erro ao processar formas de pagamento
        }
      }

      setConfig({
        nomeEstabelecimento: nome?.valor || 'Estabelecimento',
        endereco: endereco?.valor || 'Endereço não informado',
        cep: cep?.valor || 'CEP não informado',
        telefone: telefone?.valor || 'Telefone não informado',
        telefoneFixo: telefoneFixo?.valor || '',
        whatsapp: whatsapp?.valor || 'WhatsApp não informado',
        email: email?.valor || 'Email não informado',
        trabalhaFeriado: trabalhaFeriado?.valor === 'true',
        logoUrl: logoUrl?.valor || '',
        formasPagamento: formasPagamentoObj,
        diasSemana,
        ticketsPromocionais: ticketsPromocionais?.valor || '0'
      })

    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      // Em caso de erro, usar valores padrão mais informativos
      setConfig({
        ...configDefault,
        nomeEstabelecimento: 'Estabelecimento',
        endereco: 'Informações não disponíveis no momento',
        telefone: 'Informações não disponíveis no momento',
        whatsapp: 'Informações não disponíveis no momento',
        email: 'Informações não disponíveis no momento',
        logoUrl: ''
      })
    } finally {
      setLoading(false)
    }
  }

  const obterFormasPagamento = () => {
    const formas = []
    if (config.formasPagamento.dinheiro) formas.push('Dinheiro')
    if (config.formasPagamento.cartaoDebito) formas.push('Cartão de Débito')
    if (config.formasPagamento.cartaoCredito) formas.push('Cartão de Crédito')
    if (config.formasPagamento.pix) formas.push('PIX')
    if (config.formasPagamento.pixEntrega) formas.push('PIX na Entrega')
    if (config.formasPagamento.cartaoVR) formas.push('Cartão VR')
    if (config.formasPagamento.cartaoVA) formas.push('Cartão VA')
    if (config.formasPagamento.ticketPromo) formas.push(`Tickets Promocionais (${config.ticketsPromocionais} disponíveis)`)
    return formas
  }

  if (!isOpen) return null

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-4xl max-h-[600px] max-md:!p-0 max-md:flex max-md:flex-col">
        {/* Botão fechar mobile */}
        <button
          onClick={onClose}
          className="hidden max-md:block absolute right-4 top-4 z-20 rounded-full bg-card p-2 hover:bg-accent transition-colors shadow-md cursor-pointer"
          aria-label="Fechar"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>

        <AlertDialogHeader className="max-md:p-4 max-md:pb-2 max-md:sticky max-md:top-0 max-md:bg-card max-md:z-10 max-md:border-b max-md:flex-shrink-0">
          <AlertDialogTitle className="flex items-center gap-3 max-md:pr-10">
            <div className="w-8 h-8 bg-destructive rounded-full flex items-center justify-center overflow-hidden shadow-sm">
              {config.logoUrl ? (
                <img
                  src={config.logoUrl}
                  alt={config.nomeEstabelecimento}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <span className={`text-white text-sm font-bold ${config.logoUrl ? 'hidden' : ''}`}>🍕</span>
            </div>
            {config.nomeEstabelecimento}
          </AlertDialogTitle>
          <AlertDialogDescription className="max-md:text-left">
            Informações completas sobre nosso estabelecimento
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ScrollArea className="max-h-[400px] pr-6 max-md:max-h-none max-md:flex-1 max-md:overflow-y-auto max-md:pr-0">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-destructive mx-auto mb-4"></div>
              <p className="text-muted-foreground text-lg">Carregando informações...</p>
            </div>
          ) : (
            <div className="space-y-6 pb-4 max-md:px-4 max-md:pb-4">
              {/* Informações de Contato */}
              <div className="border border-border rounded-lg p-5">
                <h3 className="text-base font-semibold text-foreground mb-4">
                  Informações de Contato
                </h3>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground mb-1">Endereço</p>
                      <p className="text-foreground/80">{config.endereco}</p>
                      {config.cep && config.cep !== 'CEP não informado' && (
                        <p className="text-sm text-muted-foreground mt-1">CEP: {config.cep}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground mb-1">Telefones</p>
                      <p className="text-foreground/80">Celular: {config.telefone}</p>
                      {config.telefoneFixo && config.telefoneFixo.trim() !== '' && (
                        <p className="text-foreground/80">Fixo: {config.telefoneFixo}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MessageCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground mb-1">WhatsApp</p>
                      <p className="text-foreground/80">{config.whatsapp}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground mb-1">E-mail</p>
                      <p className="text-foreground/80">{config.email}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Horários de Funcionamento */}
              <div className="border border-border rounded-lg p-5">
                <h3 className="text-base font-semibold text-foreground mb-4">
                  Horários de Funcionamento
                </h3>

                <div className="grid gap-3 mb-4">
                  {config.diasSemana.map((dia) => (
                    <div key={dia.nome} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                      <span className="font-medium text-foreground">{dia.nome}</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${dia.aberto
                        ? 'bg-success/10 text-success'
                        : 'bg-destructive/10 text-destructive'
                        }`}>
                        {dia.aberto
                          ? `${dia.abertura} às ${dia.fechamento}`
                          : 'Fechado'
                        }
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-border">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Feriados</p>
                    <p className="text-foreground/80">
                      {config.trabalhaFeriado ? 'Funcionamos normalmente' : 'Fechado'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Formas de Pagamento */}
              <div className="border border-border rounded-lg p-5">
                <h3 className="text-base font-semibold text-foreground mb-4">
                  Formas de Pagamento
                </h3>

                {obterFormasPagamento().length > 0 ? (
                  <div className="space-y-3">
                    {obterFormasPagamento().map((forma, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                        <span className="text-foreground/80">{forma}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <CreditCard className="h-8 w-8 text-muted-foreground/70 mx-auto mb-2" />
                    <p className="text-muted-foreground">Nenhuma forma de pagamento configurada</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </ScrollArea>

        <AlertDialogFooter className="max-md:sticky max-md:bottom-0 max-md:bg-card max-md:p-4 max-md:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] max-md:flex-shrink-0">
          <AlertDialogAction onClick={onClose} className="cursor-pointer">
            Entendi
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}