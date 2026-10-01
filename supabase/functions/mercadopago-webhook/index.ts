import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { lerCredenciaisMercadoPago } from '../_shared/configEstabelecimento.ts'
import { assinaturaValida } from '../_shared/assinaturaMercadoPago.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const jsonResponse = (payload: unknown, status: number) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })


serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Webhook recebido do Mercado Pago')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // O estabelecimento vem da notification_url montada pelo create-pix-payment
    const url = new URL(req.url)
    const estabelecimentoId = url.searchParams.get('estabelecimento_id')
    if (!estabelecimentoId) {
      return jsonResponse({ error: 'estabelecimento_id ausente na URL de notificação' }, 400)
    }

    let body: any
    try {
      body = JSON.parse(await req.text())
    } catch (e) {
      console.error('Erro ao parsear body:', e)
      return jsonResponse({ error: 'Body invalido' }, 400)
    }

    const { data, type } = body

    // Validar se e notificacao de pagamento
    if (type !== 'payment' || !data?.id) {
      console.log('Notificacao ignorada - nao e de pagamento')
      return jsonResponse({ message: 'Notificacao ignorada' }, 200)
    }

    // Assinatura: obrigatória quando o estabelecimento configurou o segredo
    const { webhookSecret, accessToken: mercadoPagoAccessToken } = await lerCredenciaisMercadoPago(supabase, estabelecimentoId)
    if (webhookSecret) {
      const xSignature = req.headers.get('x-signature')
      const dataId = url.searchParams.get('data.id') ?? String(data.id)
      const valida = xSignature !== null &&
        await assinaturaValida(webhookSecret, xSignature, req.headers.get('x-request-id'), dataId)
      if (!valida) {
        console.warn('Assinatura do webhook invalida - notificacao rejeitada')
        return jsonResponse({ error: 'Assinatura invalida' }, 401)
      }
    } else {
      // Sem segredo configurado, a proteção é consultar o pagamento no
      // Mercado Pago com o token do próprio estabelecimento (abaixo).
      console.log('Assinatura secreta nao configurada, validando apenas pela consulta ao Mercado Pago')
    }

    const payment_id = data.id
    console.log(`Processando pagamento ID: ${payment_id}`)

    if (!mercadoPagoAccessToken) {
      return jsonResponse({ error: 'Access Token nao configurado' }, 500)
    }

    // Buscar dados do pagamento no Mercado Pago (fonte da verdade)
    console.log('Consultando pagamento no Mercado Pago...')
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mercadoPagoAccessToken}`
      }
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Erro ao consultar pagamento:', errorData)
      return jsonResponse({ error: 'Erro ao consultar pagamento' }, response.status)
    }

    const paymentData = await response.json()
    console.log('Dados do pagamento:', {
      id: paymentData.id,
      status: paymentData.status,
      external_reference: paymentData.external_reference
    })

    const status = paymentData.status
    const external_reference = paymentData.external_reference // UUID do pedido

    // O pedido precisa ser do mesmo estabelecimento dono das credenciais
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .select('*')
      .eq('id', external_reference)
      .eq('estabelecimento_id', estabelecimentoId)
      .maybeSingle()

    if (pedidoError || !pedido) {
      console.error('Pedido nao encontrado:', external_reference)
      return jsonResponse({ error: 'Pedido nao encontrado' }, 404)
    }

    console.log(`Pedido encontrado: ${pedido.codigo_pedido}`)

    // Atualizar status do pedido baseado no status do pagamento
    let novoStatus = pedido.status
    let observacao = ''

    switch (status) {
      case 'approved': {
        // Pagamento aprovado só confirma o pedido se cobrir o total
        const valorPago = Number(paymentData.transaction_amount)
        if (!(valorPago >= Number(pedido.total) - 0.01)) {
          console.warn(`Valor pago (${valorPago}) menor que o total do pedido (${pedido.total})`)
          observacao = `Pagamento aprovado com valor divergente: pago R$ ${valorPago}, pedido R$ ${pedido.total}`
          break
        }
        novoStatus = 'Pedido criado'
        observacao = 'Pagamento PIX aprovado pelo Mercado Pago via webhook'
        console.log('Pagamento aprovado!')
        break
      }

      case 'pending':
        novoStatus = 'Aguardando pagamento'
        observacao = 'Aguardando confirmacao do pagamento PIX'
        console.log('Pagamento pendente')
        break

      case 'rejected':
      case 'cancelled':
        novoStatus = 'Cancelado'
        observacao = `Pagamento ${status === 'rejected' ? 'rejeitado' : 'cancelado'} pelo Mercado Pago`
        console.log('Pagamento rejeitado/cancelado')
        break

      case 'refunded':
        novoStatus = 'Cancelado'
        observacao = 'Pagamento estornado pelo Mercado Pago'
        console.log('Pagamento estornado')
        break

      default:
        observacao = `Status do pagamento: ${status}`
        console.log(`Status: ${status}`)
    }

    // Atualizar pedido no banco
    const updateData: any = {
      status: novoStatus,
      mercado_pago_status: status,
      forma_pagamento: 'pix'
    }

    // Se o pagamento foi aprovado, salvar a data de aprovação
    if (novoStatus === 'Pedido criado' && paymentData.date_approved) {
      updateData.mercado_pago_date_approved = paymentData.date_approved
    }

    const { error: updateError } = await supabase
      .from('pedidos')
      .update(updateData)
      .eq('id', pedido.id)

    if (updateError) {
      console.error('Erro ao atualizar pedido:', updateError)
      throw updateError
    }

    // Adicionar ao historico com mensagem sobre pagamento
    let observacaoHistorico = observacao
    if (novoStatus === 'Pedido criado') {
      observacaoHistorico = 'Pagamento PIX aprovado pelo Mercado Pago. Pedido confirmado e pronto para preparação.'
    }

    const { error: historicoError } = await supabase
      .from('historico_pedidos')
      .insert({
        pedido_id: pedido.codigo_pedido,
        status: novoStatus,
        observacao: observacaoHistorico,
        // Multi-estabelecimento: preservar o estabelecimento do pedido
        estabelecimento_id: pedido.estabelecimento_id
      })

    if (historicoError) {
      console.error('Erro ao adicionar historico (continuando):', historicoError)
    }

    console.log('Pedido atualizado com sucesso!')

    return jsonResponse({
      success: true,
      message: 'Webhook processado com sucesso',
      pedido: pedido.codigo_pedido,
      status: novoStatus
    }, 200)

  } catch (error) {
    console.error('Erro ao processar webhook:', error)
    return jsonResponse({
      error: 'Erro ao processar webhook',
      message: (error as Error).message
    }, 500)
  }
})
