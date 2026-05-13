// api/verify-payment.js
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, message: 'Email required' });
    }

    const SELAR_API_KEY = process.env.SELAR_API_KEY || 'sat_w339i3151403a7b74dp2949581g';

    try {
        // Fetch orders from Selar API (server-side, no CORS issue)
        const selarResponse = await fetch(`https://selar.co/api/v1/orders?email=${encodeURIComponent(email)}`, {
            headers: {
                'Authorization': `Bearer ${SELAR_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!selarResponse.ok) {
            const errorText = await selarResponse.text();
            return res.status(selarResponse.status).json({ 
                success: false, 
                message: 'Selar API error: ' + selarResponse.status,
                details: errorText
            });
        }

        const data = await selarResponse.json();
        
        return res.json({
            success: true,
            orders: data.orders || data.data || [],
            total: (data.orders || data.data || []).length
        });

    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            message: 'Server error: ' + error.message 
        });
    }
}
