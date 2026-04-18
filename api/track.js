import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', 'https://stocksalesapp.store'); // or '*' for testing
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only POST allowed
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { visitorId, pageUrl, referrer, browser, os, deviceType } = req.body;

  // Get IP address
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const crypto = await import('crypto');
  const ipHash = crypto.createHash('sha256').update(ip).digest('hex');

  // Geolocation (free, no API key required)
  let location = { country: null, city: null, lat: null, lon: null };
  try {
    const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city,lat,lon`);
    const geoData = await geoRes.json();
    if (geoData.status === 'success') {
      location.country = geoData.country;
      location.city = geoData.city;
      location.lat = geoData.lat;
      location.lon = geoData.lon;
    }
  } catch (err) {
    console.error('Geolocation failed:', err);
  }

  // Insert into Supabase
  const { error } = await supabase.from('visits').insert({
    visitor_id: visitorId,
    page_url: pageUrl,
    referrer: referrer,
    browser: browser,
    os: os,
    device_type: deviceType,
    country: location.country,
    city: location.city,
    latitude: location.lat,
    longitude: location.lon,
    ip_hash: ipHash,
    visited_at: new Date().toISOString()
  });

  if (error) {
    console.error('Supabase insert error:', error);
    return res.status(500).json({ error: 'Database error' });
  }

  res.status(200).json({ success: true });
}
