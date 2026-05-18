import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    console.log(`📊 Weekly report: ${sevenDaysAgo.toISOString().split("T")[0]} to ${now.toISOString().split("T")[0]}`);

    // Get ALL businesses (with or without email - we filter later)
 // Get ONLY professional & business plan businesses with email
const { data: businesses, error: bizError } = await supabase
  .from("business_info")
  .select("id, name, email, currency, logo_url")
  .not("email", "is", null)
  .neq("email", "")
  .in("license_plan", ["professional", "business"]);  // 🔥 Only paid plans

    if (bizError) throw bizError;
    console.log(`Found ${businesses?.length || 0} businesses with email`);

    const results = [];

    for (const biz of businesses || []) {
      try {
        // Get admins with emails
        const { data: admins } = await supabase
          .from("users")
          .select("email, username, full_name")
          .eq("role", "administrator")
          .not("email", "is", null)
          .neq("email", "");

        if (!admins || admins.length === 0) {
          results.push({ business: biz.name, status: "skipped", reason: "no admins" });
          continue;
        }

        // 🔥 FIX: Get stock ONLY for this business
        const { data: stock } = await supabase
          .from("stock")
          .select("*")
          .eq("business_id", biz.id);

        const stockItems = stock || [];
        const lowStock = stockItems.filter(i => i.quantity < 3 && i.quantity > 0);
        const outOfStock = stockItems.filter(i => i.quantity === 0);
        const unsold = stockItems.filter(i => i.has_been_sold === false);

        // 🔥 FIX: Get sales ONLY for this business
        const { data: sales } = await supabase
          .from("sales")
          .select("*")
          .eq("business_id", biz.id)
          .gte("date_sold", sevenDaysAgo.toISOString().split("T")[0]);

        const weekSales = sales || [];
        const totalRevenue = weekSales.reduce((sum, s) => sum + (Number(s.total_amount) || Number(s.price) || 0), 0);
        const totalTransactions = weekSales.length;

        console.log(`  ${biz.name}: ${totalTransactions} sales, ${stockItems.length} stock items, ${lowStock.length} low`);

        // Format currency
        const curr = biz.currency || "XAF";
        const formatMoney = (amount: number) => `${curr} ${amount.toLocaleString()}`;

        // Logo HTML
        const logoHtml = biz.logo_url 
          ? `<img src="${biz.logo_url}" alt="Logo" style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:3px solid white;margin-bottom:8px;">`
          : `<div style="width:60px;height:60px;border-radius:50%;background:white;margin:0 auto 8px;display:flex;align-items:center;justify-content:center;font-size:24px;">🏪</div>`;

        // Build HTML email
        const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f5f6fa;padding:20px;margin:0;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
    <div style="background:#2d3436;padding:25px;text-align:center;">
      ${logoHtml}
      <h1 style="color:white;margin:0;font-size:22px;">${biz.name}</h1>
      <p style="color:#b2bec3;margin:5px 0 0;">Weekly Performance Report</p>
    </div>
    <div style="padding:20px;">
      <p>📅 ${sevenDaysAgo.toLocaleDateString('en-GB')} – ${now.toLocaleDateString('en-GB')}</p>
      
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin:20px 0;">
        <div style="flex:1;min-width:100px;background:#f8f9fa;border-radius:8px;padding:15px;text-align:center;">
          <div style="font-size:22px;font-weight:bold;">${totalTransactions}</div>
          <div style="font-size:11px;color:#636e72;">Transactions</div>
        </div>
        <div style="flex:1;min-width:100px;background:#f8f9fa;border-radius:8px;padding:15px;text-align:center;">
          <div style="font-size:22px;font-weight:bold;">${formatMoney(totalRevenue)}</div>
          <div style="font-size:11px;color:#636e72;">Revenue</div>
        </div>
        <div style="flex:1;min-width:100px;background:#f8f9fa;border-radius:8px;padding:15px;text-align:center;">
          <div style="font-size:22px;font-weight:bold;color:#e67e22;">${lowStock.length}</div>
          <div style="font-size:11px;color:#636e72;">Low Stock</div>
        </div>
        <div style="flex:1;min-width:100px;background:#f8f9fa;border-radius:8px;padding:15px;text-align:center;">
          <div style="font-size:22px;font-weight:bold;color:#e74c3c;">${outOfStock.length}</div>
          <div style="font-size:11px;color:#636e72;">Out of Stock</div>
        </div>
      </div>

      ${lowStock.length > 0 ? `<h3 style="color:#e67e22;">⚠️ Low Stock</h3><ul>${lowStock.map(i => `<li><b>${i.name}</b> — Only ${i.quantity} left!</li>`).join('')}</ul>` : ''}
      ${outOfStock.length > 0 ? `<h3 style="color:#e74c3c;">🚨 Out of Stock</h3><ul>${outOfStock.map(i => `<li><b>${i.name}</b> — Restock now!</li>`).join('')}</ul>` : ''}
      ${unsold.length > 0 ? `<h3 style="color:#8e44ad;">📦 Unsold Items (${unsold.length})</h3><ul>${unsold.slice(0,10).map(i => `<li><b>${i.name}</b> (${i.quantity} in stock)</li>`).join('')}${unsold.length > 10 ? `<li>...and ${unsold.length-10} more</li>` : ''}</ul>` : ''}
      
      ${lowStock.length === 0 && outOfStock.length === 0 && unsold.length === 0 ? '<p style="color:#27ae60;font-weight:bold;">✅ All stock levels are healthy!</p>' : ''}

      <div style="margin-top:20px;padding-top:15px;border-top:1px solid #ecf0f1;text-align:center;color:#b2bec3;font-size:11px;">
        <p>Generated by StockApp* on ${now.toLocaleString('en-GB')}</p>
      </div>
    </div>
  </div>
</body>
</html>`;

        // Send email via Resend API
        const RESEND_KEY = Deno.env.get("RESEND_API_KEY") || "";
        
        for (const admin of admins || []) {
          try {
            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${RESEND_KEY}`,
              },
              body: JSON.stringify({
                from: "StockApp* Reports <support@stocksalesapp.store>",
                to: [admin.email],
                subject: `📊 Weekly Report – ${biz.name}`,
                html: emailHtml,
              }),
            });
            
            const resData = await res.json();
            if (res.ok) {
              console.log(`✅ Email sent to ${admin.email}`);
            } else {
              console.error(`❌ Failed: ${admin.email}`, resData);
            }
          } catch (e) {
            console.error(`❌ Error: ${admin.email}`, e);
          }
        }

        results.push({
          business: biz.name,
          businessId: biz.id,
          adminsNotified: admins.length,
          totalRevenue,
          totalTransactions,
          stockCount: stockItems.length,
          lowStockCount: lowStock.length,
          outOfStockCount: outOfStock.length,
          unsoldCount: unsold.length,
          hasLogo: !!biz.logo_url,
        });

      } catch (bizErr) {
        console.error(`Error for ${biz.name}:`, bizErr);
        results.push({ business: biz.name, error: bizErr.message });
      }
    }

    return new Response(JSON.stringify({ success: true, results }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Fatal:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});