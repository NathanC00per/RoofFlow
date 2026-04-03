import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')?.trim();
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')?.trim();

    console.log(`Account SID: ${accountSid}`);
    console.log(`Auth token length: ${authToken?.length}`);

    // Extract recording SID
    const sidMatch = recording_url.match(/Recordings\/(RE[a-f0-9]+)/i);
    if (!sidMatch) {
      return Response.json({ error: 'Could not extract recording SID' }, { status: 400 });
    }
    const recordingSid = sidMatch[1];

    // Try multiple URL patterns that Twilio supports
    const encoded = btoa(`${accountSid}:${authToken}`);
    const urlsToTry = [
      // Ireland regional REST API
      `https://api.dublin.ie1.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${recordingSid}.mp3`,
      // Standard REST API (recordings replicate)
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${recordingSid}.mp3`,
      // Media subdomain
      `https://media.twilio.com/v1/Media/${recordingSid}`,
    ];

    for (const url of urlsToTry) {
      console.log(`Trying: ${url}`);
      const res = await fetch(url, {
        headers: { 'Authorization': `Basic ${encoded}` },
      });
      console.log(`Status: ${res.status}`);
      if (res.ok) {
        const contentType = res.headers.get('Content-Type') || 'audio/mpeg';
        const audioBuffer = await res.arrayBuffer();
        const bytes = new Uint8Array(audioBuffer);
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
        }
        const base64 = btoa(binary);
        console.log(`Success from ${url}: ${bytes.length} bytes`);
        return Response.json({ base64, contentType });
      }
    }

    return Response.json({ error: 'Could not fetch recording from any Twilio endpoint' }, { status: 502 });

  } catch (error) {
    console.error('Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});