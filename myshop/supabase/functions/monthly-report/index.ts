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
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    console.log(`📊 Monthly report: ${thirtyDaysAgo.toISOString().split("T")[0]} to ${now.toISOString().split("T")[0]}`);

    // Get businesses with email
// Get ONLY professional & business plan businesses with email
const { data: businesses, error: bizError } = await supabase
  .from("business_info")
  .select("id, name, email, currency, logo_url")
  .not("email", "is", null)
  .neq("email", "")
  .in("license_plan", ["professional", "business"]);  // 🔥 Only paid plans

    if (bizError) throw bizError;

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

        // Get stock for this business
        const { data: stock } = await supabase
          .from("stock")
          .select("*")
          .eq("business_id", biz.id);

        const stockItems = stock || [];

        // Get sales for this business (last 30 days)
        const { data: sales } = await supabase
          .from("sales")
          .select("*")
          .eq("business_id", biz.id)
          .gte("date_sold", thirtyDaysAgo.toISOString().split("T")[0]);

        const monthSales = sales || [];
        const totalRevenue = monthSales.reduce((sum, s) => sum + (Number(s.total_amount) || Number(s.price) || 0), 0);
        const totalTransactions = monthSales.length;

        // Calculate insights per item
        const insights = stockItems.map(item => {
          const itemSales = monthSales.filter(s => 
            s.product_name === item.name || s.productName === item.name
          );

          const totalSoldMonth = itemSales.reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
          const avgDaily = totalSoldMonth / 30;
          const daysLeft = avgDaily > 0 ? Math.round(item.quantity / avgDaily) : 999;
          const suggestRestock = daysLeft < 14 && item.has_been_sold === true;
          const recommendedQty = suggestRestock ? Math.ceil(avgDaily * 30) : 0;

          return { 
            ...item, 
            totalSoldMonth, 
            avgDaily, 
            suggestRestock, 
            recommendedQty,
            salesCount: itemSales.length
          };
        });

        // Restock recommendations
        const restockItems = insights.filter(i => i.suggestRestock);
        
        // Stagnant products (never sold)
        const stagnantItems = stockItems.filter(item => item.has_been_sold === false);
        
        // Top selling items
        const topItems = [...insights]
          .filter(i => i.totalSoldMonth > 0)
          .sort((a, b) => b.totalSoldMonth - a.totalSoldMonth)
          .slice(0, 5);

        const curr = biz.currency || "XAF";
        const formatMoney = (amount: number) => `${curr} ${amount.toLocaleString()}`;

        // Logo
        const logoHtml = biz.logo_url 
          ? `<img src="${biz.logo_url}" alt="Logo" style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:3px solid white;margin-bottom:8px;">`
          : `<div style="width:60px;height:60px;border-radius:50%;background:white;margin:0 auto 8px;display:flex;align-items:center;justify-content:center;font-size:24px;">🏪</div>`;

        // Build restock table
        let restockTable = '';
        if (restockItems.length > 0) {
          restockTable = `
            <h3 style="color:#2c3e50;">📈 Restock Recommendations</h3>
            <table style="width:100%;border-collapse:collapse;margin:15px 0;">
              <tr style="background:#f8f9fa;">
                <th style="padding:10px;text-align:left;border:1px solid #ddd;">Product</th>
                <th style="padding:10px;text-align:center;border:1px solid #ddd;">Stock</th>
                <th style="padding:10px;text-align:center;border:1px solid #ddd;">Avg Daily</th>
                <th style="padding:10px;text-align:center;border:1px solid #ddd;">Recommend</th>
              </tr>
              ${restockItems.map(i => `
                <tr>
                  <td style="padding:10px;border:1px solid #ddd;">${i.name}</td>
                  <td style="padding:10px;text-align:center;border:1px solid #ddd;">${i.quantity}</td>
                  <td style="padding:10px;text-align:center;border:1px solid #ddd;">${typeof i.avgDaily === 'number' ? i.avgDaily.toFixed(1) : i.avgDaily}</td>
                  <td style="padding:10px;text-align:center;border:1px solid #ddd;color:#d35400;font-weight:bold;">+${i.recommendedQty} units</td>
                </tr>
              `).join('')}
            </table>`;
        }

        // Build top sellers
        let topSellersTable = '';
        if (topItems.length > 0) {
          topSellersTable = `
            <h3 style="color:#27ae60;">🏆 Top Selling Products</h3>
            <table style="width:100%;border-collapse:collapse;margin:15px 0;">
              <tr style="background:#f8f9fa;">
                <th style="padding:10px;text-align:left;border:1px solid #ddd;">#</th>
                <th style="padding:10px;text-align:left;border:1px solid #ddd;">Product</th>
                <th style="padding:10px;text-align:center;border:1px solid #ddd;">Sold</th>
                <th style="padding:10px;text-align:center;border:1px solid #ddd;">Days Left</th>
              </tr>
              ${topItems.map((i, idx) => `
                <tr>
                  <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">${idx + 1}</td>
                  <td style="padding:10px;border:1px solid #ddd;">${i.name}</td>
                  <td style="padding:10px;text-align:center;border:1px solid #ddd;">${i.totalSoldMonth}</td>
                  <td style="padding:10px;text-align:center;border:1px solid #ddd;color:${i.suggestRestock ? '#e74c3c' : '#27ae60'};">${i.suggestRestock ? '⚠️ ' + (999 - i.totalSoldMonth) : '✅ OK'}</td>
                </tr>
              `).join('')}
            </table>`;
        }

        // Build stagnant section
        let stagnantHtml = '';
        if (stagnantItems.length > 0) {
          stagnantHtml = `
            <h3 style="color:#e74c3c;">🚨 Stagnant Inventory (Never Sold) — ${stagnantItems.length} items</h3>
            <p style="color:#636e72;">These items haven't sold yet. Try a promotion or discount!</p>
            <div style="display:grid;gap:12px;margin:15px 0;">
              ${stagnantItems.slice(0, 10).map(item => `
                <div style="padding:12px;border:1px dashed #bdc3c7;border-radius:8px;background:#fdf2f2;">
                  <strong>${item.name}</strong> — Stock: ${item.quantity}<br/>
                  <span style="color:#7f8c8d;">Price: ${formatMoney(item.price || 0)}</span><br/>
                  <small style="color:#e67e22;">💡 Try a 10% discount or create a social media ad!</small>
                </div>
              `).join('')}
              ${stagnantItems.length > 10 ? `<p>...and ${stagnantItems.length - 10} more items</p>` : ''}
            </div>`;
        }

        // Build email HTML
        const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f5f6fa;padding:20px;margin:0;">
  <div style="max-width:650px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
    
    <div style="background:linear-gradient(135deg, #2d3436 0%, #636e72 100%);padding:25px;text-align:center;">
      ${logoHtml}
      <h1 style="color:white;margin:0;font-size:22px;">${biz.name}</h1>
      <p style="color:#b2bec3;margin:5px 0 0;">📊 Monthly Insights & Trends Report</p>
    </div>
    
    <div style="padding:20px;">
      <p style="color:#636e72;">📅 ${thirtyDaysAgo.toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'})} – ${now.toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'})} (30 days)</p>
      
      <!-- Summary Cards -->
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin:20px 0;">
        <div style="flex:1;min-width:100px;background:#f8f9fa;border-radius:8px;padding:15px;text-align:center;">
          <div style="font-size:24px;font-weight:bold;">${totalTransactions}</div>
          <div style="font-size:11px;color:#636e72;">TRANSACTIONS</div>
        </div>
        <div style="flex:1;min-width:100px;background:#f8f9fa;border-radius:8px;padding:15px;text-align:center;">
          <div style="font-size:24px;font-weight:bold;">${formatMoney(totalRevenue)}</div>
          <div style="font-size:11px;color:#636e72;">REVENUE</div>
        </div>
        <div style="flex:1;min-width:100px;background:#f8f9fa;border-radius:8px;padding:15px;text-align:center;">
          <div style="font-size:24px;font-weight:bold;color:#e67e22;">${stockItems.length}</div>
          <div style="font-size:11px;color:#636e72;">PRODUCTS</div>
        </div>
        <div style="flex:1;min-width:100px;background:#f8f9fa;border-radius:8px;padding:15px;text-align:center;">
          <div style="font-size:24px;font-weight:bold;color:#e74c3c;">${stagnantItems.length}</div>
          <div style="font-size:11px;color:#636e72;">STAGNANT</div>
        </div>
      </div>

      ${topSellersTable}
      ${restockTable}
      ${stagnantHtml}
      
      ${restockItems.length === 0 && stagnantItems.length === 0 ? '<p style="color:#27ae60;font-weight:bold;font-size:16px;">✅ All products are selling well! No restock needed.</p>' : ''}

      <div style="margin-top:25px;padding-top:15px;border-top:1px solid #ecf0f1;text-align:center;color:#b2bec3;font-size:11px;">
        <p>📊 Monthly report generated by StockApp* on ${now.toLocaleString('en-GB')}</p>
      </div>
    </div>
  </div>
</body>
</html>`;

        // Send via Resend API
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
                from: "StockApp* Insights <support@stocksalesapp.store>",
                to: [admin.email],
                subject: `📊 Monthly Insights – ${biz.name}`,
                html: emailHtml,
              }),
            });
            
            const resData = await res.json();
            if (res.ok) {
              console.log(`✅ Monthly email sent to ${admin.email}`);
            } else {
              console.error(`❌ Failed: ${admin.email}`, resData);
            }
          } catch (e) {
            console.error(`❌ Error: ${admin.email}`, e);
          }
        }

        results.push({
          business: biz.name,
          adminsNotified: admins.length,
          totalRevenue,
          totalTransactions,
          productCount: stockItems.length,
          restockCount: restockItems.length,
          stagnantCount: stagnantItems.length,
          topProduct: topItems.length > 0 ? topItems[0].name : 'none',
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