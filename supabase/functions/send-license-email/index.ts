import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { email, licenseKey, plan } = await req.json();
  
  // Using Resend or any email service
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Stock Sales Pro <noreply@yourdomain.com>',
      to: email,
      subject: '🎉 Your License Key is Ready!',
      html: `
        <h1>Welcome to Stock Sales Pro!</h1>
        <p>Your payment was successful. License auto-activated.</p>
        <div style="background:#f0fdf4;padding:20px;border-radius:10px;">
          <strong>License Key:</strong><br>
          <span style="font-size:24px;letter-spacing:2px;">${licenseKey}</span>
        </div>
        <p>Plan: <strong>${plan.toUpperCase()}</strong></p>
        <a href="https://yourapp.com/login">Login Here</a>
      `
    })
  });

  return new Response(JSON.stringify({ sent: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
