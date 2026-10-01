import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { lerConfig, lerCredenciaisMercadoPago } from '../_shared/configEstabelecimento.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Valor, referência e URL de notificação NÃO vêm do navegador: são
    // derivados do pedido no banco (senão o comprador paga R$ 0,01 por
    // qualquer pedido ou aponta o webhook para outro estabelecimento).
    const {
      pedido_id,
      description,
      payer,
      items
    } = await req.json()

    // Validar dados obrigatórios
    if (!pedido_id || !payer?.email) {
      return new Response(
        JSON.stringify({ error: 'Dados obrigatórios não fornecidos' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // VERIFICAÇÃO DE SEGURANÇA: Verificar se o pedido já foi pago
    const { data: pedidoExistente, error: pedidoError } = await supabase
      .from('pedidos')
      .select('id, codigo_pedido, total, estabelecimento_id, status, mercado_pago_payment_id, mercado_pago_status')
      .eq('id', pedido_id)
      .single()

    if (pedidoError) {
      console.error('Erro ao buscar pedido:', pedidoError)
      return new Response(
        JSON.stringify({ error: 'Pedido não encontrado' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Se o pedido já foi pago ou não está aguardando pagamento, bloquear criação de novo PIX
    if (pedidoExistente.status !== 'Aguardando pagamento') {
      console.log('Pedido já processado, bloqueando criação de novo PIX:', pedidoExistente.status)
      return new Response(
        JSON.stringify({ 
          error: 'Pedido já processado',
          message: 'Este pedido já foi pago ou processado. Não é possível gerar novo QR Code.',
          status: pedidoExistente.status
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Se já existe um pagamento aprovado no Mercado Pago, bloquear
    if (pedidoExistente.mercado_pago_status === 'approved') {
      console.log('Pagamento já aprovado no Mercado Pago, bloqueando criação de novo PIX')
      return new Response(
        JSON.stringify({ 
          error: 'Pagamento já aprovado',
          message: 'O pagamento deste pedido já foi aprovado.',
          payment_id: pedidoExistente.mercado_pago_payment_id
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Credenciais do Mercado Pago do estabelecimento dono do pedido
    const estabelecimentoId = pedidoExistente.estabelecimento_id
    const { accessToken: mercadoPagoAccessToken } = await lerCredenciaisMercadoPago(supabase, estabelecimentoId)

    if (!mercadoPagoAccessToken) {
      return new Response(
        JSON.stringify({
          error: 'Access Token do Mercado Pago não configurado',
          message: 'Configure o Access Token em: Configurações > Pagamento > Loja online'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Buscar nome da loja para o statement_descriptor
    const nomeLoja = await lerConfig(supabase, estabelecimentoId, 'nome_loja') || 'Delivery'

    // Criar pagamento PIX no Mercado Pago com todos os campos recomendados
    const paymentData = {
      transaction_amount: Number(pedidoExistente.total),
      description: description || `Pedido #${pedidoExistente.codigo_pedido}`,
      payment_method_id: 'pix',

      // Referência externa (obrigatório) - UUID do pedido, único em todo o SaaS
      external_reference: pedidoExistente.id,

      // Statement descriptor (recomendado) - aparece na fatura do cartão
      statement_descriptor: nomeLoja.substring(0, 22), // Máximo 22 caracteres

      // Notification URL (obrigatório) - o webhook usa o estabelecimento da
      // URL para achar as credenciais certas
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook?estabelecimento_id=${estabelecimentoId}`,
      
      // Dados do pagador
      payer: {
        email: payer.email,
        first_name: payer.first_name || 'Cliente',
        last_name: payer.last_name || '',
        identification: {
          type: payer.identification?.type || 'CPF',
          number: payer.identification?.number || '00000000000'
        }
      },
      
      // Itens do pedido (recomendado) - melhora aprovação e previne fraudes
      ...(items && items.length > 0 ? {
        additional_info: {
          items: items.map((item: any) => ({
            id: item.id || item.produto_id || 'item',
            title: item.title || item.nome || 'Produto',
            description: item.description || item.descricao || item.nome || 'Produto do pedido',
            category_id: item.category_id || 'food', // Categoria: food para delivery
            quantity: item.quantity || item.quantidade || 1,
            unit_price: parseFloat(item.unit_price || item.preco || 0)
          }))
        }
      } : {})
    }

    console.log('Criando pagamento PIX:', paymentData)

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mercadoPagoAccessToken}`,
        'X-Idempotency-Key': `${pedido_id}-${Date.now()}`
      },
      body: JSON.stringify(paymentData)
    })

    const responseData = await response.json()

    if (!response.ok) {
      console.error('Erro ao criar pagamento no Mercado Pago:', responseData)
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao criar pagamento PIX',
          details: responseData 
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Extrair dados do PIX da resposta
    const pixData = {
      payment_id: responseData.id,
      status: responseData.status,
      status_detail: responseData.status_detail,
      qr_code: responseData.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: responseData.point_of_interaction?.transaction_data?.qr_code_base64,
      ticket_url: responseData.point_of_interaction?.transaction_data?.ticket_url,
      transaction_amount: responseData.transaction_amount,
      expiration_date: responseData.date_of_expiration
    }

    // Salvar payment_id no pedido
    await supabase
      .from('pedidos')
      .update({ 
        mercado_pago_payment_id: responseData.id,
        mercado_pago_status: responseData.status
      })
      .eq('id', pedido_id)

    console.log('Pagamento PIX criado com sucesso:', pixData)

    return new Response(
      JSON.stringify(pixData),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Erro na função create-pix-payment:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno ao processar pagamento',
        message: (error as Error).message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
