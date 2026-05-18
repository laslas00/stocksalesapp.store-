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

    const now = new Date().toISOString();

    // Get ALL businesses with expired licenses (any plan, not already inactive)
    const { data: expired, error: expError } = await supabase
      .from("business_info")
      .select("id, name, email, license_plan, license_status, license_expires_at")
      .neq("license_status", "inactive")
      .not("license_expires_at", "is", null)
      .lt("license_expires_at", now);

    if (expError) throw expError;

    let expiredCount = 0;
    const expiredNames = [];

    for (const biz of expired || []) {
      // Update business_info to inactive
      const { error: updateError } = await supabase
        .from("business_info")
        .update({ license_status: "inactive" })
        .eq("id", biz.id);

      if (!updateError) {
        expiredCount++;
        expiredNames.push(`${biz.name} (${biz.license_plan})`);
        console.log(`❌ Expired: ${biz.name} (${biz.license_plan}) - was ${biz.license_status}`);
      }

      // Also update the licenses table if it exists
      const { data: licenseData } = await supabase
        .from("licenses")
        .select("id")
        .eq("business_id", biz.id)
        .eq("status", "active")
        .limit(1);

      if (licenseData && licenseData.length > 0) {
        await supabase
          .from("licenses")
          .update({ status: "inactive" })
          .eq("business_id", biz.id)
          .eq("status", "active");
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      expiredCount,
      checkedAt: now,
      expired: expiredNames
    }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});