// js/license-check.js
async function checkLicense() {
    const client = getSB();
    if (!client) return { valid: true, plan: 'free' }; // Allow if offline

    const userId = currentUser?.id;
    if (!userId) return { valid: true, plan: 'free' };

    const { data: license } = await client
        .from('licenses')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

    if (!license) {
        // New user - 14-day trial
        return { valid: true, plan: 'trial', trialEnds: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) };
    }

    const now = new Date();
    const expiresAt = new Date(license.expires_at);

    if (license.status === 'active' && expiresAt > now) {
        return { valid: true, plan: license.plan };
    }

    return { valid: false, plan: license.plan, message: 'License expired. Please renew.' };
}