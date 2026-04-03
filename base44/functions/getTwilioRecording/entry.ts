import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Proxies a Twilio recording URL with Basic Auth credentials.
 * Accepts: { recording_url: string }
 * Returns: audio stream
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recording_url } = await req.json();
    if (!recording_url) {
      return Response.json({ error: 'recording_url is required' }, { status: 400 });
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const credentials = btoa(`${accountSid}:${authToken}`);

    // Append .mp3 if not already present
    const audioUrl = recording_url.match(/\.(mp3|wav|ogg)$/i) ? recording_url : `${recording_url}.mp3`;

    // Try the provided URL first; if 401, fall back to the standard US API URL
    // (regional URLs sometimes require re-routing through the main API)
    const urlsToTry = [
      audioUrl,
      audioUrl.replace('api.dublin.ie1.twilio.com', 'api.twilio.com'),
    ];

    let twilioRes = null;
    for (const url of urlsToTry) {
      const res = await fetch(url, {
        headers: { Authorization: `Basic ${credentials}` },
      });
      if (res.ok) { twilioRes = res; break; }
      console.log(`Tried ${url} — got ${res.status}`);
    }

    if (!twilioRes) {
      return Response.json({ error: 'Could not fetch recording from Twilio' }, { status: 502 });
    }

    const contentType = twilioRes.headers.get('Content-Type') || 'audio/mpeg';
    const audioBuffer = await twilioRes.arrayBuffer();
    const bytes = new Uint8Array(audioBuffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);

    return Response.json({
      base64,
      contentType,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});