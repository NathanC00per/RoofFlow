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

    const twilioRes = await fetch(recording_url, {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    });

    if (!twilioRes.ok) {
      return Response.json({ error: `Twilio returned ${twilioRes.status}` }, { status: 502 });
    }

    const contentType = twilioRes.headers.get('Content-Type') || 'audio/mpeg';
    const audioBuffer = await twilioRes.arrayBuffer();

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});