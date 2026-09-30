import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { lerConfig } from '../_shared/configEstabelecimento.ts'

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
    const { payment_id } = await req.json()

    if (!payment_id) {
      return new Response(
        JSON.stringify({ error: 'payment_id não fornecido' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // O pagamento pertence a um pedido; o pedido diz de qual estabelecimento
    // (e portanto de qual conta do Mercado Pago) ele é.
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .select('estabelecimento_id')
      .eq('mercado_pago_payment_id', String(payment_id))
      .maybeSingle()

    if (pedidoError || !pedido) {
      return new Response(
        JSON.stringify({ error: 'Pagamento não encontrado' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Buscar Access Token do Mercado Pago do estabelecimento
    const mercadoPagoAccessToken = await lerConfig(supabase, pedido.estabelecimento_id, 'mercado_pago_access_token')

    if (!mercadoPagoAccessToken) {
      return new Response(
        JSON.stringify({ 
          error: 'Access Token do Mercado Pago não configurado',
          message: 'Configure o Access Token em: Configurações > Formas de Pagamento > PIX'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Consultar status do pagamento no Mercado Pago
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mercadoPagoAccessToken}`
      }
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Erro ao consultar pagamento:', errorData)
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao consultar status do pagamento',
          details: errorData 
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const paymentData = await response.json()

    // Incluir dados do QR Code se o pagamento ainda está pendente (para recuperação)
    const responsePayload: any = {
      payment_id: paymentData.id,
      status: paymentData.status,
      status_detail: paymentData.status_detail,
      transaction_amount: paymentData.transaction_amount,
      date_approved: paymentData.date_approved,
      expiration_date: paymentData.date_of_expiration
    }

    // Se ainda está pendente, incluir dados do PIX para reutilização
    if (paymentData.status === 'pending' && paymentData.point_of_interaction?.transaction_data) {
      responsePayload.qr_code = paymentData.point_of_interaction.transaction_data.qr_code
      responsePayload.qr_code_base64 = paymentData.point_of_interaction.transaction_data.qr_code_base64
      responsePayload.ticket_url = paymentData.point_of_interaction.transaction_data.ticket_url
    }

    return new Response(
      JSON.stringify(responsePayload),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Erro na função check-payment-status:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno ao verificar status',
        message: (error as Error).message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
