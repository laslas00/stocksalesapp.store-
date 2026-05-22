// api/selar-webhook.js - Secure webhook for Selar payments
// In Vercel function, check for secret
const webhookSecret = process.env.WEBHOOK_SECRET;
if (webhookSecret && req.headers['x-webhook-secret'] !== webhookSecret) {
  return res.status(401).json({ error: 'Unauthorized' });
}

import { createClient } from '@supabase/supabase-js';


const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use SERVICE_ROLE key (safe in Vercel)
);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://stocksalesapp.store');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const s = req.body;
    console.log('Received Selar webhook:', JSON.stringify(s, null, 2));

    // Helper functions
    function getPlan(productCode) {
      const planMap = {
        '1174a971wo': 'starter',
        '4242672261': 'professional',
        '55t6z0q76t': 'business'
      };
      return planMap[productCode] || 'starter';
    }

    function getReceiptId(url) {
      if (!url) return null;
      const match = url.match(/\/receipt\/([A-Z0-9]+)/);
      return match ? match[1] : null;
    }

    const customerEmail = s.Buyers_Email_Address;
    if (!customerEmail) {
      return res.status(400).json({ error: 'No email found in Selar data' });
    }

    console.log('Processing order for:', customerEmail);

    // ============================================
    // STEP 1: Find USER by email
    // ============================================
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, business_id, username')
      .eq('email', customerEmail)
      .maybeSingle();

    if (userError) {
      console.error('User lookup error:', userError);
    }

    let businessId = users?.business_id;
    let businessUpdated = false;

    // ============================================
    // STEP 2: Update business_info if found
    // ============================================
    const plan = getPlan(s.Product_Code || s.All_product_codes);
    const expiresAt = new Date();
    
    if (plan === 'starter') {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    if (businessId) {
      const { error: updateError } = await supabase
        .from('business_info')
        .update({
          license_plan: plan,
          license_status: 'active',
          license_activated_at: new Date().toISOString(),
          license_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', businessId);

      businessUpdated = !updateError;
      console.log('Business updated:', businessUpdated);
      if (updateError) console.error('Update error:', updateError);
    }

    // ============================================
    // STEP 3: Insert order into selar_orders
    // ============================================
    const orderData = {
      transaction_id: getReceiptId(s.Selar_receipt_URL),
      customer_email: customerEmail,
      customer_first_name: (s.Buyers_Fullname || '').split(' ')[0],
      product_id: s.Product_ID,
      product_name: s.Product_Name,
      product_currency: s.Sale_currency || 'XOF',
      product_amount: parseFloat(s.Product_Amount) || 0,
      amount_total: parseFloat(s.Sale_amount) || 0,
      source: 'selar_webhook',
      raw_payload: JSON.stringify(s),
      created_at: new Date().toISOString()
    };

    const { error: insertError } = await supabase
      .from('selar_orders')
      .insert(orderData);

    const orderSaved = !insertError;
    console.log('Order saved:', orderSaved);
    if (insertError) console.error('Insert error:', insertError);

    // ============================================
    // Return response
    // ============================================
    return res.status(200).json({
      success: true,
      order_saved: orderSaved,
      business_updated: businessUpdated,
      customer_email: customerEmail,
      customer_name: s.Buyers_Fullname,
      product: s.Product_Name,
      plan: plan,
      amount: `${s.Sale_currency} ${s.Sale_amount}`,
      receipt_id: getReceiptId(s.Selar_receipt_URL),
      expires_at: expiresAt.toISOString(),
      business_id: businessId
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
