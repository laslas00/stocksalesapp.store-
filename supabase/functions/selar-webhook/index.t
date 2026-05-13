// This runs AUTOMATICALLY when Selar sends payment confirmation
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Selar sends these fields on successful payment
    const { 
      email, 
      product_id, 
      transaction_ref,
      status,
      amount 
    } = body;

    if (status !== 'success') {
      return new Response(JSON.stringify({ msg: 'Payment not successful' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Connect to Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Generate license key
    const licenseKey = 'STK-' + crypto.randomUUID().split('-')[0].toUpperCase() + 
                       '-' + crypto.randomUUID().split('-')[1].toUpperCase();

    // Find plan from product
    const planMap: Record<string, string> = {
      'stockapp-starter': 'starter',
      'stockapp-pro': 'professional',
      'stockapp-business': 'business'
    };

    const plan = planMap[product_id] || 'starter';
    const oneMonth = new Date();
    oneMonth.setMonth(oneMonth.getMonth() + 1);
    const oneYear = new Date();
    oneYear.setFullYear(oneYear.getFullYear() + 1);

    const expiresAt = plan === 'starter' ? oneMonth.toISOString() : oneYear.toISOString();

    // 1. Update order status
    const { data: orders } = await supabase
      .from('orders')
      .update({ 
        status: 'completed',
        license_key: licenseKey,
        selar_ref: transaction_ref 
      })
      .eq('email', email)
      .eq('status', 'pending')
      .select();

    // 2. Create/update license
    await supabase.from('licenses').upsert({
      email: email,
      plan: plan,
      license_key: licenseKey,
      status: 'active',
      expires_at: expiresAt,
      devices: [],
      created_at: new Date().toISOString()
    }, { onConflict: 'email' });

    // 3. Send email with license key (using Supabase email or your SMTP)
    await supabase.functions.invoke('send-license-email', {
      body: { email, licenseKey, plan }
    });

    return new Response(JSON.stringify({ 
      success: true, 
      license_key: licenseKey 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
