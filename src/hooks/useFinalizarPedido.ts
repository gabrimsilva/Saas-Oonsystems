import { useState } from 'react'
import { pedidoService, historicoPedidoService, clienteService, configuracaoService } from '@/services'
import { receiptService } from '@/services/receiptService'
import { printJobService } from '@/services/printJobService'
import { calcularSubtotal, calcularTotal } from '@/utils/calculos'
import {
  sanitizeInput,
  sanitizeCheckoutData,
  sanitizeCartItems,
  sanitizeFreeText
} from '@/utils/sanitizacao'
import { useError, ErrorType, ErrorSeverity } from '@/contexts/ErrorContext'
import { withRetry, RETRY_PRESETS } from '@/utils/retry'
import { googleAnalytics } from '@/services/googleAnalyticsService'
import { chaveCarrinhoPublico } from '@/services/tenant'

/**
 * Dados do cliente para finalização do pedido
 */
interface DadosCliente {
  /** Nome do cliente */
  nome: string
  /** Sobrenome do cliente */
  sobrenome: string
  /** CPF do cliente */
  cpf: string
  /** Telefone do cliente */
  telefone: string
  /** Email do cliente */
  email: string
  /** CEP do endereço de entrega */
  cep: string
  /** Logradouro do endereço */
  endereco: string
  /** Número do endereço */
  numero: string
  /** Complemento do endereço */
  complemento: string
  /** Bairro do endereço */
  bairro: string
  /** Cidade do endereço */
  cidade: string
  /** Estado (UF) do endereço */
  estado: string
  /** Forma de pagamento escolhida */
  formaPagamento: string
  /** Se precisa de troco */
  precisaTroco: boolean
  /** Valor do troco */
  valorTroco: string
  /** Observações adicionais do pedido */
  observacoes?: string
}

/**
 * Hook para gerenciar a finalização do pedido com retry automático e error handling
 *
 * Gerencia o processo completo de finalização de pedido incluindo:
 * - Validação e sanitização de dados
 * - Criação ou busca de cliente existente
 * - Salvamento do pedido no banco de dados
 * - Registro no histórico de pedidos
 * - Retry automático em caso de falhas de rede
 * - Tratamento de erros com feedback visual
 *
 * @returns Objeto contendo:
 *   - processando: boolean - Indica se está processando o pedido
 *   - finalizar: function - Função para finalizar o pedido
 *
 * @example
 * ```tsx
 * const { processando, finalizar } = useFinalizarPedido()
 *
 * const handleFinalizar = async () => {
 *   await finalizar(
 *     dadosCliente,
 *     carrinho,
 *     true, // entregaDomicilio
 *     '5.00', // valorEntrega
 *     '5511999999999' // whatsapp
 *   )
 * }
 * ```
 */
export function useFinalizarPedido() {
  const [processando, setProcessando] = useState(false)
  const { reportError, showSuccess } = useError()

  /**
   * Finaliza o pedido realizando todas as etapas necessárias
   *
   * Executa as seguintes operações com retry automático:
   * 1. Sanitiza os dados do cliente e itens do carrinho
   * 2. Busca ou cria o cliente no banco de dados
   * 3. Salva o pedido com status 'pendente'
   * 4. Registra entrada no histórico de pedidos
   * 5. Abre conversa no WhatsApp com a mensagem
   * 6. Limpa o carrinho do localStorage
   * 7. Exibe notificação de sucesso
   *
   * @param dadosCliente - Dados completos do cliente
   * @param carrinho - Itens do carrinho a serem incluídos no pedido
   * @param entregaDomicilio - Se é entrega a domicílio ou retirada
   * @param valorEntrega - Valor da taxa de entrega (string numérica)
   * @param whatsapp - Número do WhatsApp da loja para enviar pedido
   *
   * @throws {Error} Se houver falha na criação do cliente
   * @throws {Error} Se houver falha ao salvar o pedido
   *
   * @example
   * ```tsx
   * try {
   *   await finalizar(
   *     {
   *       nome: 'João',
   *       sobrenome: 'Silva',
   *       telefone: '11999999999',
   *       // ... outros campos
   *     },
   *     carrinho,
   *     true,
   *     '5.00',
   *     '5511999999999'
   *   )
   *   // Pedido finalizado com sucesso
   * } catch (error) {
   *   // Erro já tratado internamente com toast
   * }
   * ```
   */
  const finalizar = async (
    dadosCliente: DadosCliente,
    carrinho: any[],
    entregaDomicilio: boolean,
    valorEntrega: string
  ) => {
    if (processando) return

    setProcessando(true)

    try {
      const pedidoId = `pedido-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Sanitizar dados do cliente antes de salvar
      const dadosClienteSanitizados = sanitizeCheckoutData({
        cliente_nome: dadosCliente.nome,
        cliente_sobrenome: dadosCliente.sobrenome,
        cliente_cpf: dadosCliente.cpf,
        cliente_telefone: dadosCliente.telefone,
        cliente_email: dadosCliente.email,
        cliente_cep: dadosCliente.cep,
        cliente_endereco: dadosCliente.endereco,
        cliente_numero: dadosCliente.numero,
        cliente_complemento: dadosCliente.complemento,
        cliente_bairro: dadosCliente.bairro,
        cliente_cidade: dadosCliente.cidade,
        cliente_estado: dadosCliente.estado,
        observacoes: dadosCliente.observacoes
      })

      // Criar ou buscar cliente com retry
      let cliente = null
      try {
        cliente = await withRetry(
          async () => {
            return await clienteService.buscarOuCriar({
              nome: dadosClienteSanitizados.cliente_nome,
              sobrenome: dadosClienteSanitizados.cliente_sobrenome,
              cpf: dadosClienteSanitizados.cliente_cpf || undefined,
              telefone: dadosClienteSanitizados.cliente_telefone,
              email: dadosClienteSanitizados.cliente_email || undefined,
              cep: dadosClienteSanitizados.cliente_cep || undefined,
              endereco: dadosClienteSanitizados.cliente_endereco || undefined,
              numero: dadosClienteSanitizados.cliente_numero || undefined,
              complemento: dadosClienteSanitizados.cliente_complemento || undefined,
              bairro: dadosClienteSanitizados.cliente_bairro || undefined,
              cidade: dadosClienteSanitizados.cliente_cidade || undefined,
              estado: dadosClienteSanitizados.cliente_estado || undefined,
            })
          },
          RETRY_PRESETS.NORMAL
        )
      } catch (error) {
        // Cliente não pode ser criado/atualizado, continuando sem vincular cliente
      }

      // Sanitizar itens do carrinho (observações, nomes, etc)
      const carrinhoSanitizado = sanitizeCartItems(carrinho)

      const subtotal = calcularSubtotal(carrinhoSanitizado)
      const total = calcularTotal(carrinhoSanitizado)
      const taxaEntrega = 0

      // Salvar pedido com dados sanitizados
      const pedidoData = {
        pedido_id: pedidoId,
        cliente_id: cliente?.id,
        cliente_nome: dadosClienteSanitizados.cliente_nome,
        cliente_sobrenome: dadosClienteSanitizados.cliente_sobrenome,
        cliente_cpf: dadosClienteSanitizados.cliente_cpf || undefined,
        cliente_telefone: dadosClienteSanitizados.cliente_telefone,
        cliente_email: dadosClienteSanitizados.cliente_email || undefined,
        cliente_cep: dadosClienteSanitizados.cliente_cep || undefined,
        cliente_endereco: dadosClienteSanitizados.cliente_endereco || undefined,
        cliente_numero: dadosClienteSanitizados.cliente_numero || undefined,
        cliente_complemento: dadosClienteSanitizados.cliente_complemento || undefined,
        cliente_bairro: dadosClienteSanitizados.cliente_bairro || undefined,
        cliente_cidade: dadosClienteSanitizados.cliente_cidade || undefined,
        cliente_estado: dadosClienteSanitizados.cliente_estado || undefined,
        entrega_domicilio: entregaDomicilio,
        forma_pagamento: sanitizeInput(dadosCliente.formaPagamento),
        precisa_troco: dadosCliente.precisaTroco,
        valor_troco: dadosCliente.valorTroco ? parseFloat(dadosCliente.valorTroco) : undefined,
        observacoes: sanitizeFreeText(dadosClienteSanitizados.observacoes, 500),
        subtotal,
        taxa_entrega: taxaEntrega,
        total,
        desconto: 0,
        tipo_desconto: 'valor' as const,
        itens: carrinhoSanitizado.map(item => ({
          produto: item.produto,
          quantidade: item.quantidade,
          saboresSelecionados: item.saboresSelecionados,
          bordaSelecionada: item.bordaSelecionada,
          tamanhoSelecionado: item.tamanhoSelecionado,
          adicionaisSelecionados: item.adicionaisSelecionados,
          observacoes: item.observacoes, // Incluir observações do item
          produtosCombo: item.produtosCombo // Incluir produtos do combo personalizado
        })),
        status: 'Pedido criado',
        previsao_entrega: entregaDomicilio ? '45-60 min' : '30-45 min'
      }

      // Salvar pedido com retry (operação crítica)
      const pedidoSalvo = await withRetry(
        async () => {
          const resultado = await pedidoService.salvar(pedidoData)
          if (!resultado) throw new Error('Pedido não foi salvo corretamente')
          return resultado
        },
        RETRY_PRESETS.CRITICAL
      )

      // Atualizar estatísticas do cliente (usar o total do pedido salvo que já inclui taxa_extra_km)
      if (cliente) {
        try {
          await withRetry(
            async () => {
              await clienteService.incrementarEstatisticas(cliente.id, pedidoSalvo.total)
            },
            RETRY_PRESETS.FAST
          )
        } catch (error) {
          // Erro ao atualizar estatísticas do cliente (não crítico)
        }
      }

      // Criar histórico
      try {
        await withRetry(
          async () => {
            await historicoPedidoService.adicionarStatus(
              pedidoId,
              'Pedido criado',
              'Pedido recebido pelo sistema'
            )
          },
          RETRY_PRESETS.NORMAL
        )
      } catch (error) {
        // Erro ao criar histórico do pedido (não crítico)
      }

      // IMPRESSÃO AUTOMÁTICA DO PEDIDO (se configurado)
      try {
        const configImpressaoAuto = await configuracaoService.buscarPorChave('impressao_automatica_pedidos')
        const impressaoAutomaticaAtiva = configImpressaoAuto?.valor === 'true'

        if (impressaoAutomaticaAtiva) {
          // Gerar cupom do pedido
          const cupomHTML = await receiptService.generateOrderReceipt(pedidoSalvo.id)

          // Criar print job
          await printJobService.create({
            refType: 'ORDER',
            refId: pedidoSalvo.id,
            receiptHtml: cupomHTML
          })

          // Tentar imprimir automaticamente
          await printJobService.print(pedidoSalvo.id, 'ORDER')
        }
      } catch (errorImpressao) {
        // Não falhar o pedido se impressão falhar, apenas logar
        console.warn('Aviso: Falha na impressão automática do pedido, mas pedido foi criado com sucesso:', errorImpressao)
      }

      // Backup no localStorage
      localStorage.setItem(`pedido-${pedidoId}`, JSON.stringify({
        id: pedidoId,
        dadosCliente,
        itens: carrinho,
        total,
        entregaDomicilio,
        status: 'Pedido criado',
        dataHora: new Date().toISOString(),
        previsaoEntrega: entregaDomicilio ? '45-60 min' : '30-45 min'
      }))

      // Envio de WhatsApp desabilitado para este projeto

      // Limpar carrinho
      localStorage.removeItem(chaveCarrinhoPublico())

      // Rastrear compra finalizada no Google Analytics
      const items = carrinho.map(item => {
        let precoItem = 0
        if (item.produto.categoria === 'combo' && item.produto.id.includes('-')) {
          precoItem = item.produto.preco || 0
        } else if (item.tamanhoSelecionado) {
          precoItem = item.tamanhoSelecionado.valor
        } else {
          precoItem = (item.produto.precoPromocional && item.produto.precoPromocional > 0)
            ? item.produto.precoPromocional
            : item.produto.preco || 0
        }
        
        return {
          id: item.produto.id,
          name: item.produto.nome,
          category: item.produto.categoria,
          price: precoItem,
          quantity: item.quantidade,
        }
      })
      
      googleAnalytics.trackPurchase(
        pedidoId,
        items,
        total,
        parseFloat(valorEntrega) || 0,
        dadosCliente.formaPagamento
      )

      // Mostrar mensagem de sucesso
      showSuccess('Pedido realizado com sucesso! Redirecionando...')

      // Redirecionar
      const codigoPedido = pedidoSalvo.codigo_pedido || pedidoId.split('-').pop() || pedidoId
      window.location.href = `/meu-pedido/pedido-${codigoPedido}`

    } catch (error) {
      reportError({
        type: ErrorType.DATABASE,
        severity: ErrorSeverity.CRITICAL,
        message: 'Não foi possível finalizar seu pedido',
        technicalMessage: 'Falha ao processar e salvar pedido no banco de dados',
        originalError: error,
        retryable: true,
        action: 'Por favor, verifique sua conexão e tente novamente. Se o problema persistir, entre em contato conosco.'
      })
      setProcessando(false)
    }
  }

  return { finalizar, processando }
}
