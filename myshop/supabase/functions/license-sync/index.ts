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
    console.log("🚀 Starting License Status Sync Function...");
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date();
    const nowStr = now.toISOString();
    
    console.log(`📅 Current time: ${nowStr}`);

    // ============================================
    // PART 1: UPDATE EXPIRED LICENSES TO INACTIVE
    // ============================================
    
    console.log("\n📋 Checking for expired licenses...");
    
    // Get all active/trial licenses that have expired
    const { data: expiredLicenses, error: expiredError } = await supabase
      .from("licenses")
      .select(`
        id,
        business_id,
        plan,
        status,
        expires_at,
        activated_at
      `)
      .in("status", ["active", "trial"])
      .lt("expires_at", nowStr);

    if (expiredError) throw expiredError;

    console.log(`🔍 Found ${expiredLicenses?.length || 0} expired licenses`);
    
    const licenseResults = [];
    const businessIdsToUpdate = new Set();

    // Update each expired license
    for (const license of expiredLicenses || []) {
      console.log(`\n  📄 License ID: ${license.id}`);
      console.log(`     Business ID: ${license.business_id}`);
      console.log(`     Plan: ${license.plan}`);
      console.log(`     Old Status: ${license.status}`);
      console.log(`     Expired at: ${license.expires_at}`);
      
      // Update license status to 'inactive'
      const { error: updateError } = await supabase
        .from("licenses")
        .update({ 
          status: "inactive",
          updated_at: nowStr
        })
        .eq("id", license.id);

      if (updateError) {
        console.log(`     ❌ Failed to update license: ${updateError.message}`);
        licenseResults.push({
          licenseId: license.id,
          businessId: license.business_id,
          success: false,
          error: updateError.message
        });
      } else {
        console.log(`     ✅ License updated to INACTIVE`);
        businessIdsToUpdate.add(license.business_id);
        licenseResults.push({
          licenseId: license.id,
          businessId: license.business_id,
          success: true,
          oldStatus: license.status,
          newStatus: "inactive"
        });
      }
    }

    // ============================================
    // PART 2: UPDATE ACTIVE LICENSES (No expiry or future expiry)
    // ============================================
    
    console.log("\n📋 Checking for active licenses to keep active...");
    
    const { data: activeLicenses, error: activeError } = await supabase
      .from("licenses")
      .select(`
        id,
        business_id,
        plan,
        status,
        expires_at
      `)
      .in("status", ["active", "trial"])
      .gte("expires_at", nowStr);

    if (activeError) throw activeError;
    
    console.log(`✅ Found ${activeLicenses?.length || 0} active/trial licenses`);

    // ============================================
    // PART 3: UPDATE BUSINESS_INFO TABLE
    // ============================================
    
    console.log("\n🏢 Syncing business_info table...");
    
    const businessResults = [];
    
    // For each business that had an expired license, update business_info
    for (const businessId of businessIdsToUpdate) {
      console.log(`\n  Updating business_info for: ${businessId}`);
      
      // Check if business has ANY active licenses left
      const { data: stillActiveLicenses } = await supabase
        .from("licenses")
        .select("id")
        .eq("business_id", businessId)
        .in("status", ["active", "trial"])
        .gte("expires_at", nowStr)
        .limit(1);
      
      const hasActiveLicense = stillActiveLicenses && stillActiveLicenses.length > 0;
      
      // Determine new status for business_info
      const newBusinessStatus = hasActiveLicense ? "active" : "inactive";
      
      console.log(`     Has active license: ${hasActiveLicense}`);
      console.log(`     New status: ${newBusinessStatus}`);
      
      // Update business_info
      const { error: updateBizError } = await supabase
        .from("business_info")
        .update({ 
          license_status: newBusinessStatus,
          updated_at: nowStr
        })
        .eq("id", businessId);
      
      if (updateBizError) {
        console.log(`     ❌ Failed to update business: ${updateBizError.message}`);
        businessResults.push({
          businessId,
          success: false,
          error: updateBizError.message
        });
      } else {
        console.log(`     ✅ Business status updated to ${newBusinessStatus}`);
        businessResults.push({
          businessId,
          success: true,
          newStatus: newBusinessStatus,
          hasActiveLicense
        });
      }
    }

    // ============================================
    // PART 4: SYNC ALL BUSINESSES (Optional - full sync)
    // ============================================
    
    console.log("\n🔄 Running full business_info sync...");
    
    // Get all businesses with their latest license status
    const { data: allBusinesses, error: businessesError } = await supabase
      .from("business_info")
      .select("id, name, license_status");

    if (!businessesError && allBusinesses) {
      for (const biz of allBusinesses) {
        // Check if business has any active license
        const { data: activeLicense } = await supabase
          .from("licenses")
          .select("id, status, expires_at")
          .eq("business_id", biz.id)
          .in("status", ["active", "trial"])
          .gte("expires_at", nowStr)
          .limit(1);
        
        const shouldBeActive = activeLicense && activeLicense.length > 0;
        const currentStatus = biz.license_status;
        const expectedStatus = shouldBeActive ? "active" : "inactive";
        
        // Fix if mismatch
        if (currentStatus !== expectedStatus) {
          console.log(`  ⚠️ Mismatch found: ${biz.name} - Current: ${currentStatus}, Expected: ${expectedStatus}`);
          
          const { error: fixError } = await supabase
            .from("business_info")
            .update({ license_status: expectedStatus })
            .eq("id", biz.id);
          
          if (!fixError) {
            console.log(`     ✅ Fixed: ${biz.name} → ${expectedStatus}`);
            businessResults.push({
              businessId: biz.id,
              businessName: biz.name,
              fixed: true,
              oldStatus: currentStatus,
              newStatus: expectedStatus
            });
          }
        }
      }
    }

    // ============================================
    // SUMMARY
    // ============================================
    
    console.log("\n" + "=".repeat(60));
    console.log("📊 LICENSE STATUS SYNC - SUMMARY");
    console.log("=".repeat(60));
    console.log(`\n📋 Expired licenses processed: ${expiredLicenses?.length || 0}`);
    console.log(`✅ Active licenses found: ${activeLicenses?.length || 0}`);
    console.log(`🏢 Businesses updated: ${businessIdsToUpdate.size}`);
    console.log(`🔄 Full sync completed`);
    
    // Return response
    return new Response(JSON.stringify({
      success: true,
      timestamp: nowStr,
      summary: {
        expiredLicensesFound: expiredLicenses?.length || 0,
        expiredLicensesUpdated: licenseResults.filter(r => r.success).length,
        activeLicensesFound: activeLicenses?.length || 0,
        businessesUpdated: businessResults.filter(r => r.success).length,
        businessesFixed: businessResults.filter(r => r.fixed).length
      },
      details: {
        licenses: licenseResults,
        businesses: businessResults,
        activeLicenses: activeLicenses?.map(l => ({
          id: l.id,
          businessId: l.business_id,
          plan: l.plan,
          status: l.status,
          expiresAt: l.expires_at
        }))
      }
    }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("💥 FATAL ERROR:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});