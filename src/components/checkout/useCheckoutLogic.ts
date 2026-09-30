import { useState, useEffect } from "react"
import { clienteService } from "@/services"
import { buscarConfiguracaoSegura } from "@/lib/configService"
import type { ItemCarrinho, DadosCliente, Configuracao } from "./types"
import type { Adicional } from "@/types/carrinho"
import { chaveCarrinhoPublico } from '@/services/tenant'

export const useCheckoutLogic = (onNavigate: (page: 'delivery' | 'checkout') => void) => {
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [configuracoes, setConfiguracoes] = useState<Configuracao | null>(null)
  const [processandoPedido, setProcessandoPedido] = useState(false)
  const [carregandoCarrinho, setCarregandoCarrinho] = useState(true)
  const [etapaAtual, setEtapaAtual] = useState<1 | 2>(1)
  const [clienteExistente, setClienteExistente] = useState<any>(null)

  const [dadosCliente, setDadosCliente] = useState<DadosCliente>({
    nome: '',
    sobrenome: '',
    cpf: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    telefone: '',
    email: '',
    formaPagamento: '',
    precisaTroco: false,
    valorTroco: '',
    observacoes: ''
  })

  useEffect(() => {
    const carregarDados = async () => {
      try {
        // Carregar carrinho do localStorage
        const carrinhoSalvo = localStorage.getItem(chaveCarrinhoPublico())
        if (carrinhoSalvo) {
          setCarrinho(JSON.parse(carrinhoSalvo))
        }

        // Carregar configurações usando o serviço seguro
        const [whatsapp, formasPagamento, nomeConfig, enderecoConfig, logoConfig, bannerConfig] = await Promise.all([
          buscarConfiguracaoSegura('whatsapp_loja'),
          buscarConfiguracaoSegura('metodos_pagamento'),
          buscarConfiguracaoSegura('nome_loja'),
          buscarConfiguracaoSegura('endereco_loja'),
          buscarConfiguracaoSegura('logo_url'),
          buscarConfiguracaoSegura('banner_url')
        ])

        // Processar formas de pagamento
        let formasPagamentoObj = {
          dinheiro: true,
          cartaoDebito: true,
          cartaoCredito: true,
          pix: true
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
                pix: pagamentoData.includes('pix')
              }
            } else {
              // Se for objeto (formato antigo)
              formasPagamentoObj = pagamentoData
            }
          } catch (error) {
            console.error('Erro ao processar formas de pagamento:', error)
          }
        }

        // Montar objeto de configurações (sem campos de entrega)
        const configCarregadas: Configuracao = {
          whatsapp: whatsapp?.valor || '',
          formasPagamento: formasPagamentoObj,
          nomeEstabelecimento: nomeConfig?.valor || 'Sua Empresa',
          endereco: enderecoConfig?.valor || 'Rua Exemplo, 123 - Centro',
          logoUrl: logoConfig?.valor || '',
          bannerUrl: bannerConfig?.valor || ''
        }

        setConfiguracoes(configCarregadas)
      } catch (error) {
        console.error('Erro ao carregar configurações:', error)
        // Usar configurações padrão em caso de erro
        setConfiguracoes({
          whatsapp: '',
          formasPagamento: {
            dinheiro: true,
            cartaoDebito: true,
            cartaoCredito: true,
            pix: true
          },
          nomeEstabelecimento: 'Sua Empresa',
          endereco: 'Rua Exemplo, 123 - Centro',
          logoUrl: '',
          bannerUrl: ''
        })
      } finally {
        setCarregandoCarrinho(false)
      }
    }

    carregarDados()
  }, [])

  // Redirecionar se carrinho estiver vazio
  useEffect(() => {
    if (!carregandoCarrinho && carrinho.length === 0) {
      onNavigate('delivery')
    }
  }, [carrinho, onNavigate, carregandoCarrinho])

  const calcularPrecoItem = (item: ItemCarrinho): number => {
    let precoTotal = 0

    // Para combos personalizados, o preço já foi calculado corretamente
    if (item.produto.categoria === 'combo' && item.produto.id.includes('-')) {
      // Combo personalizado - usar preço já calculado
      precoTotal = item.produto.preco || 0
    } else if (item.tamanhoSelecionado) {
      // Para produtos com tamanho (porções), usar o valor do tamanho
      precoTotal = item.tamanhoSelecionado.valor
    } else {
      // Usar preço normal do produto
      precoTotal = (item.produto.precoPromocional && item.produto.precoPromocional > 0)
        ? item.produto.precoPromocional
        : item.produto.preco
    }

    // Para produtos normais (não combos personalizados), adicionar preços extras
    if (!(item.produto.categoria === 'combo' && item.produto.id.includes('-'))) {
      // Adicionar preço dos sabores
      if (item.saboresSelecionados && item.saboresSelecionados.length > 0) {
        const precoSabores = item.saboresSelecionados.reduce((acc, sabor) => acc + (sabor.preco || 0), 0)
        precoTotal += precoSabores
      }

      // Adicionar preço da borda
      if (item.bordaSelecionada) {
        precoTotal += item.bordaSelecionada.preco || 0
      }

      // Adicionar preço dos adicionais
      if (item.adicionaisSelecionados && item.adicionaisSelecionados.length > 0) {
        const precoAdicionais = item.adicionaisSelecionados.reduce(
          (acc: number, adicional: Adicional) => acc + (adicional.valor * adicional.quantidade),
          0
        )
        precoTotal += precoAdicionais
      }
    }

    return precoTotal * item.quantidade
  }

  const calcularSubtotal = (): number => {
    return carrinho.reduce((acc, item) => acc + calcularPrecoItem(item), 0)
  }

  // Sem entrega a domicílio no projeto: taxa sempre zero
  const calcularTaxaEntrega = (): number => 0

  const calcularTotal = (): number => {
    return calcularSubtotal()
  }

  const handleInputChange = (field: keyof DadosCliente, value: string | boolean) => {
    setDadosCliente(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Função para formatar telefone
  const formatarTelefone = (value: string) => {
    const numeros = value.replace(/\D/g, '')

    if (numeros.length <= 2) {
      return numeros
    }
    if (numeros.length <= 3) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`
    }
    if (numeros.length <= 7) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 3)} ${numeros.slice(3)}`
    }
    if (numeros.length <= 11) {
      if (numeros.length === 11) {
        return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 3)} ${numeros.slice(3, 7)}-${numeros.slice(7, 11)}`
      } else {
        return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6, 10)}`
      }
    }
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 3)} ${numeros.slice(3, 7)}-${numeros.slice(7, 11)}`
  }

  // Função para lidar com mudança do telefone
  const handleTelefoneChange = async (value: string) => {
    const telefoneFormatado = formatarTelefone(value)
    handleInputChange('telefone', telefoneFormatado)

    // Se o telefone está completo, buscar cliente existente
    if (telefoneFormatado.length >= 14) { // (99) 9 9999-9999
      try {
        const cliente = await clienteService.buscarPorTelefone(telefoneFormatado)
        if (cliente) {
          setClienteExistente(cliente)
          // Preencher dados básicos automaticamente se o cliente existir
          setDadosCliente(prev => ({
            ...prev,
            nome: cliente.nome || prev.nome,
            sobrenome: cliente.sobrenome || prev.sobrenome,
            cpf: cliente.cpf || prev.cpf,
            email: cliente.email || prev.email,
          }))
        } else {
          setClienteExistente(null)
        }
      } catch (error) {
        console.error('Erro ao buscar cliente:', error)
        setClienteExistente(null)
      }
    } else {
      setClienteExistente(null)
    }
  }

  return {
    // Estados
    carrinho,
    configuracoes,
    processandoPedido,
    carregandoCarrinho,
    etapaAtual,
    setEtapaAtual,
    clienteExistente,
    dadosCliente,

    // Funções de cálculo
    calcularPrecoItem,
    calcularSubtotal,
    calcularTaxaEntrega,
    calcularTotal,

    // Handlers
    handleInputChange,
    handleTelefoneChange,

    // Outras funções
    setProcessandoPedido
  }
}
