import { pedidoService, historicoPedidoService, clienteService } from "@/services"
import { getEstabelecimentoAtivo } from "@/services/tenant"
import toast from 'react-hot-toast'
import type { DadosCliente, ItemCarrinho, Configuracao } from "./types"
import { chaveCarrinhoPublico } from '@/services/tenant'

export const validarEtapa1 = (dadosCliente: DadosCliente): { valido: boolean; mensagem?: string } => {
  // Este projeto opera apenas com RETIRADA no local — validação simples.
  if (!dadosCliente.nome.trim()) {
    return { valido: false, mensagem: 'Por favor, preencha seu nome completo.' }
  }
  if (!dadosCliente.telefone.trim()) {
    return { valido: false, mensagem: 'Por favor, preencha o WhatsApp.' }
  }
  return { valido: true }
}

export const validarEtapa2 = (dadosCliente: DadosCliente): { valido: boolean; mensagem?: string } => {
  if (!dadosCliente.formaPagamento) {
    return { valido: false, mensagem: 'Por favor, selecione uma forma de pagamento.' }
  }
  return { valido: true }
}

export const finalizarPedido = async (
  dadosCliente: DadosCliente,
  carrinho: ItemCarrinho[],
  _configuracoes: Configuracao,
  calcularSubtotal: () => number,
  calcularTotal: () => number,
  setProcessandoPedido: (value: boolean) => void,
  estabelecimentoIdOverride?: string | null
) => {
  // Validar etapa 2
  const validacao = validarEtapa2(dadosCliente)
  if (!validacao.valido) {
    toast.error(validacao.mensagem || 'Erro na validação do formulário')
    return
  }

  setProcessandoPedido(true)

  try {
    // Gerar código único para o pedido (mais curto e legível)
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.random().toString(36).substr(2, 4).toUpperCase()
    const codigoPedido = `${timestamp}${random}`
    const pedidoId = `pedido-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Tentar criar ou buscar cliente (não crítico)
    let cliente = null
    try {
      cliente = await clienteService.buscarOuCriar({
        nome: dadosCliente.nome,
        sobrenome: dadosCliente.sobrenome,
        cpf: dadosCliente.cpf || undefined,
        telefone: dadosCliente.telefone,
        email: dadosCliente.email || undefined,
      })
    } catch (clienteError) {
      console.error('Erro ao criar/buscar cliente (continuando sem cliente):', clienteError)
    }

    // Preparar dados do pedido para o Supabase
    // Este projeto opera SOMENTE com retirada no local — sem entrega a domicílio.
    const pedidoData = {
      pedido_id: pedidoId,
      codigo_pedido: codigoPedido,

      // Referência ao cliente (opcional)
      cliente_id: cliente?.id || undefined,

      // Dados do cliente (mantidos para compatibilidade e consultas rápidas)
      cliente_nome: dadosCliente.nome,
      cliente_sobrenome: dadosCliente.sobrenome,
      cliente_cpf: dadosCliente.cpf || undefined,
      cliente_telefone: dadosCliente.telefone,
      cliente_email: dadosCliente.email || undefined,

      // Dados do pedido — sempre retirada no local
      entrega_domicilio: false,
      forma_pagamento: dadosCliente.formaPagamento,
      precisa_troco: dadosCliente.precisaTroco || false,
      valor_troco: dadosCliente.valorTroco ? parseFloat(dadosCliente.valorTroco) : undefined,
      observacoes: dadosCliente.observacoes || undefined,

      // Valores — sem taxa de entrega
      subtotal: calcularSubtotal(),
      taxa_entrega: 0,
      taxa_extra_km: 0,
      total: calcularTotal(),

      // Desconto (não aplicável em pedidos online)
      desconto: 0,
      tipo_desconto: 'valor' as const,

      // Itens do pedido
      itens: carrinho,

      // Status
      status: 'Pedido criado',
      previsao_entrega: 'Retirada no local',

      // IMPORTANTE: Adicionar estabelecimento_id explicitamente para que chegue no Kanban
      // Usar override se fornecido (checkout público), senão usar contexto admin
      estabelecimento_id: estabelecimentoIdOverride || getEstabelecimentoAtivo() || undefined
    }

    // Salvar pedido no Supabase
    const pedidoSalvo = await pedidoService.salvar(pedidoData as any)

    // Tentar atualizar estatísticas do cliente (não crítico)
    if (cliente) {
      try {
        await clienteService.incrementarEstatisticas(cliente.id, pedidoSalvo.total)
      } catch (estatisticasError) {
        console.error('Erro ao atualizar estatísticas do cliente (continuando):', estatisticasError)
      }
    }

    // Tentar criar primeiro registro no histórico (não crítico)
    try {
      const statusInicial = 'Pedido criado'
      const observacaoInicial = dadosCliente.formaPagamento === 'pix'
        ? 'Pedido recebido pelo sistema (PIX)'
        : 'Pedido recebido pelo sistema'
      await historicoPedidoService.adicionarStatus(codigoPedido, statusInicial, observacaoInicial)
    } catch (historicoError) {
      console.error('Erro ao criar histórico do pedido (continuando):', historicoError)
    }

    // Salvar pedido no localStorage também (backup)
    const pedidoLocal = {
      id: pedidoId,
      codigo_pedido: codigoPedido,
      dadosCliente,
      itens: carrinho,
      total: calcularTotal(),
      taxa_extra_km: 0,
      entregaDomicilio: false,
      status: 'Pedido criado',
      dataHora: new Date().toISOString(),
      previsaoEntrega: 'Retirada no local'
    }
    localStorage.setItem(`pedido-${pedidoId}`, JSON.stringify(pedidoLocal))

    // ATENÇÃO — a baixa de estoque NÃO acontece aqui.
    //
    // O checkout público roda como `anon` e as políticas RLS de stock_items,
    // stock_variants e stock_movements são exclusivas do papel `authenticated`.
    // A baixa que existia neste ponto falhava silenciosamente para o cliente
    // final e, quando o checkout era usado por um usuário autenticado, gerava
    // BAIXA DUPLA (aqui e de novo ao mover o pedido para "Finalizado").
    //
    // A validação e a baixa do delivery são feitas em um único lugar:
    // pedidoDeliveryService.finalizarPedidoDelivery(), disparado quando o
    // pedido vai para "Finalizado" no Kanban — momento em que a venda é criada
    // e a mercadoria realmente sai.

    // Limpar carrinho
    localStorage.removeItem(chaveCarrinhoPublico())

    // Envio de WhatsApp desabilitado para este projeto

    // Aguardar um pouco antes de redirecionar
    setTimeout(() => {
      window.location.href = `/meu-pedido/pedido-${codigoPedido}`
    }, 1000)

  } catch (error) {
    console.error('Erro ao finalizar pedido:', error)
    toast.error('Erro ao processar pedido. Tente novamente.')
    setProcessandoPedido(false)
  }
}
