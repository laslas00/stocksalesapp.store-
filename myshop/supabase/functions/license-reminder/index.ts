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

    // Get paid businesses (professional or business plan)
    const { data: businesses, error } = await supabase
      .from("business_info")
      .select("id, name, email, license_plan, license_status, license_expires_at, license_activated_at")
      .in("license_plan", ["professional", "business","starter"])
      .not("email", "is", null)
      .neq("email", "");

    if (error) throw error;

    const results = [];

    for (const biz of businesses || []) {
      // Skip if no expiry date
      if (!biz.license_expires_at) {
        results.push({ business: biz.name, status: "skipped", reason: "no expiry date" });
        continue;
      }

      const expiry = new Date(biz.license_expires_at);
      const diffTime = expiry.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Only send if 7 days or less remaining, OR expired
      if (daysRemaining > 7) {
        results.push({ business: biz.name, status: "ok", daysRemaining });
        continue;
      }

      // Determine status
      let status: string, color: string, badge: string, subject: string, headline: string, message: string;
      
      if (daysRemaining < 0) {
        status = "expired"; color = "#dc2626"; badge = "EXPIRED";
        subject = `🚨 License Expired - ${biz.name}`;
        headline = "Your License Has Expired";
        message = "Your license has expired. Please renew immediately to restore full access.";
      } else if (daysRemaining === 0) {
        status = "today"; color = "#f59e0b"; badge = "EXPIRES TODAY";
        subject = `⚠️ License Expires TODAY - ${biz.name}`;
        headline = "License Expires Today";
        message = "Your license expires at midnight. Renew now to avoid interruption.";
      } else {
        status = "warning"; color = "#2563eb"; badge = `${daysRemaining} DAYS LEFT`;
        subject = `⏳ ${daysRemaining} Days Left - ${biz.name}`;
        headline = "License Expiring Soon";
        message = `Your license expires in ${daysRemaining} days. Renew early to stay protected.`;
      }

      const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:0;background:#f1f5f9;">
  <div style="max-width:550px;margin:30px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.1);">
    <div style="background:${color};padding:25px;text-align:center;color:white;">
      <h1 style="margin:0;font-size:22px;">${headline}</h1>
    </div>
    <div style="padding:25px;text-align:center;">
      <div style="background:${status==='expired'?'#fee2e2':'#e0f2fe'};color:${color};padding:8px 16px;border-radius:20px;font-weight:bold;display:inline-block;margin-bottom:15px;">${badge}</div>
      <p style="color:#334155;font-size:15px;line-height:1.6;">${message}</p>
      <div style="background:#f8fafc;border-radius:8px;padding:15px;margin:20px 0;text-align:left;">
        <b>License:</b> ${biz.license_plan || 'Standard'}<br/>
        <b>Expires:</b> ${expiry.toLocaleDateString('en-GB')}<br/>
        <b>Business:</b> ${biz.name}
      </div>
      <p style="color:#64748b;font-size:12px;">Open the application to renew your license.</p>
    </div>
    <div style="background:#f8fafc;padding:15px;text-align:center;color:#64748b;font-size:11px;border-top:1px solid #e2e8f0;">
      StockApp* License System
    </div>
  </div>
</body>
</html>`;

      // Send via Resend
      const RESEND_KEY = Deno.env.get("RESEND_API_KEY") || "";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RESEND_KEY}`,
        },
        body: JSON.stringify({
          from: "StockApp* Security <support@stocksalesapp.store>",
          to: [biz.email],
          subject,
          html: emailHtml,
        }),
      });

      const resData = await res.json();
      
      results.push({
        business: biz.name,
        status,
        daysRemaining,
        emailSent: res.ok,
        email: biz.email,
      });

      console.log(`📧 ${biz.name}: ${status} (${daysRemaining}d) → ${res.ok ? '✅' : '❌'}`);
    }

    return new Response(JSON.stringify({ success: true, results }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});