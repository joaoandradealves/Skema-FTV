import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const topic = url.searchParams.get('topic') || url.searchParams.get('type')
    const id = url.searchParams.get('id') || url.searchParams.get('data.id')

    console.log(`Webhook recebido: Topic=${topic}, ID=${id}`)

    if (topic === 'payment') {
      const MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
      
      // 1. Consultar o pagamento no Mercado Pago
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
        headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
      })
      const paymentData = await response.json()

      if (paymentData.status === 'approved') {
        const bookingId = paymentData.external_reference || paymentData.metadata.booking_id
        const serviceType = paymentData.metadata.service_type

        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 2. Atualizar tabela de pagamentos
        await supabaseAdmin
            .from('payments')
            .update({ status: 'paid', payment_method: paymentData.payment_method_id })
            .eq('reference_id', bookingId)

        // 3. Atualizar a reserva correspondente
        if (serviceType === 'court_rental') {
            await supabaseAdmin
                .from('court_rentals')
                .update({ status: 'aprovado' })
                .eq('id', bookingId)
        } else if (serviceType === 'day_use') {
            await supabaseAdmin
                .from('day_use_bookings')
                .update({ status: 'aprovado' })
                .eq('id', bookingId)
        }

        console.log(`Pagamento aprovado para reserva ${bookingId} (${serviceType})`)
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Erro no Webhook:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
