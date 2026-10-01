import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Roda com o JWT de quem chamou (não com service_role): as políticas RLS
    // limitam a limpeza aos estabelecimentos do próprio usuário.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') ?? '' }
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Não autenticado' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      )
    }

    // Pedidos aguardando pagamento: PIX vence em 10 minutos; cartão no
    // Checkout Pro do catálogo (link de pagamento) em 1 hora
    const dezMinutosAtras = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const umaHoraAtras = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { data: pedidosExpirados, error: fetchError } = await supabaseClient
      .from('pedidos')
      .select('*')
      .eq('status', 'Aguardando pagamento')
      .or(`and(forma_pagamento.eq.pix,criado_em.lt.${dezMinutosAtras}),criado_em.lt.${umaHoraAtras}`)

    if (fetchError) {
      console.error('Erro ao buscar pedidos expirados:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar pedidos expirados' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    if (!pedidosExpirados || pedidosExpirados.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'Nenhum pedido expirado encontrado',
          cancelados: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    console.log(`Encontrados ${pedidosExpirados.length} pedidos expirados`)

    // Cancelar cada pedido expirado
    const resultados = []
    for (const pedido of pedidosExpirados) {
      try {
        // Atualizar status do pedido para cancelado
        const { error: updateError } = await supabaseClient
          .from('pedidos')
          .update({ 
            status: 'Cancelado',
            cancelado: true,
            motivo_cancelamento: pedido.forma_pagamento === 'pix'
              ? 'Tempo de pagamento PIX expirado (10 minutos)'
              : 'Tempo de pagamento online expirado (1 hora)',
            cancelado_em: new Date().toISOString()
          })
          .eq('id', pedido.id)

        if (updateError) {
          console.error(`Erro ao cancelar pedido ${pedido.codigo_pedido}:`, updateError)
          resultados.push({
            pedido_id: pedido.codigo_pedido,
            sucesso: false,
            erro: updateError.message
          })
          continue
        }

        // Decrementar estatísticas do cliente (se houver cliente_id)
        if (pedido.cliente_id && pedido.total) {
          try {
            // Buscar dados atuais do cliente
            const { data: cliente, error: clienteError } = await supabaseClient
              .from('clientes')
              .select('total_pedidos, valor_total_gasto')
              .eq('id', pedido.cliente_id)
              .single()

            if (!clienteError && cliente) {
              // Decrementar estatísticas (não deixar valores negativos)
              const novoTotalPedidos = Math.max(0, cliente.total_pedidos - 1)
              const novoValorGasto = Math.max(0, cliente.valor_total_gasto - pedido.total)

              await supabaseClient
                .from('clientes')
                .update({
                  total_pedidos: novoTotalPedidos,
                  valor_total_gasto: novoValorGasto,
                  atualizado_em: new Date().toISOString()
                })
                .eq('id', pedido.cliente_id)

              console.log(`Estatísticas do cliente ${pedido.cliente_id} decrementadas`)
            }
          } catch (estatisticasError) {
            console.error(`Erro ao decrementar estatísticas do cliente ${pedido.cliente_id}:`, estatisticasError)
            // Não bloquear o cancelamento se falhar
          }
        }

        // Adicionar ao histórico
        await supabaseClient
          .from('historico_pedidos')
          .insert({
            pedido_id: pedido.codigo_pedido,
            status: 'Cancelado',
            observacao: 'Pedido cancelado automaticamente - tempo de pagamento expirado (limpeza automática)',
            // Multi-estabelecimento: preservar o estabelecimento do pedido
            estabelecimento_id: pedido.estabelecimento_id
          })

        console.log(`Pedido ${pedido.codigo_pedido} cancelado com sucesso`)
        resultados.push({
          pedido_id: pedido.codigo_pedido,
          sucesso: true
        })
      } catch (error) {
        console.error(`Erro ao processar pedido ${pedido.codigo_pedido}:`, error)
        resultados.push({
          pedido_id: pedido.codigo_pedido,
          sucesso: false,
          erro: (error as Error).message
        })
      }
    }

    const canceladosComSucesso = resultados.filter(r => r.sucesso).length

    return new Response(
      JSON.stringify({ 
        message: `Processados ${pedidosExpirados.length} pedidos expirados`,
        cancelados: canceladosComSucesso,
        resultados
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Erro geral:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
