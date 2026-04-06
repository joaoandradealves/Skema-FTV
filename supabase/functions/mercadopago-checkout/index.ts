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
    const { booking_id, service_type } = await req.json()
    
    // Auth check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: corsHeaders })
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) return new Response(JSON.stringify({ error: 'Sessão expirada' }), { status: 401, headers: corsHeaders })

    // Build Admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let amount = 0
    let title = ""
    
    if (service_type === 'court_rental') {
      const { data: rental } = await supabaseAdmin.from('court_rentals').select('*').eq('id', booking_id).single()
      if (!rental) throw new Error("Reserva de quadra não encontrada")
      amount = Number(rental.total_price)
      title = `Aluguel de Quadra - ${rental.court_name}`
    } else if (service_type === 'day_use') {
      const { data: dayUse } = await supabaseAdmin.from('day_use_bookings').select('*').eq('id', booking_id).single()
      if (!dayUse) throw new Error("Reserva de Day Use não encontrada")
      amount = Number(dayUse.price)
      title = `Day Use - Skema Beach Club`
    }

    const MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
    if (!MP_ACCESS_TOKEN) throw new Error("Configuração do Mercado Pago ausente (Token)")

    const preference = {
      items: [
        {
          id: booking_id,
          title: title,
          unit_price: amount,
          quantity: 1,
          currency_id: 'BRL'
        }
      ],
      back_urls: {
        success: `${req.headers.get('origin')}/student?payment=success`,
        failure: `${req.headers.get('origin')}/student?payment=failure`,
        pending: `${req.headers.get('origin')}/student?payment=pending`
      },
      auto_return: 'approved',
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`,
      external_reference: booking_id,
      metadata: {
          booking_id,
          service_type,
          student_id: user.id
      }
    }

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preference)
    })

    const mpData = await response.json()
    if (!mpData.id) throw new Error("Erro ao criar preferência no Mercado Pago")
    
    // Save payment record
    await supabaseAdmin.from('payments').insert({
      student_id: user.id,
      amount: amount,
      status: 'pending',
      service_type: service_type,
      reference_id: booking_id,
      external_id: mpData.id
    })

    return new Response(JSON.stringify({ checkout_url: mpData.init_point }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
