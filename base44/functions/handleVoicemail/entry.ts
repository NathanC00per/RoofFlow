import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const formData = await req.formData();
    const url = new URL(req.url);

    const fromPhone = formData.get('From');
    const recordingUrl = formData.get('RecordingUrl');
    const routeId = url.searchParams.get('routeId');

    // Create service-authenticated client for webhook
    const customReq = new Request(req.url, {
      method: req.method,
      headers: {
        ...Object.fromEntries(req.headers),
        'X-Base44-Service-Role': 'true',
      },
      body: req.body,
    });

    const base44 = createClientFromRequest(customReq);

    console.log(`Voicemail received from ${fromPhone}, recording: ${recordingUrl}`);

    // Get route details if available
    let routeDescription = 'General Voicemail';
    if (routeId) {
      const route = await base44.asServiceRole.entities.PhoneRouting.get(routeId);
      if (route) {
        routeDescription = route.description;
      }
    }

    // Create voicemail record
    await base44.asServiceRole.entities.Voicemail.create({
      phone_number: fromPhone,
      route_id: routeId || '',
      route_description: routeDescription,
      audio_url: recordingUrl,
      received_at: new Date().toISOString(),
      status: 'new',
      duration_seconds: parseInt(formData.get('RecordingDuration') || '0'),
    });

    // Also log to communication logs
    await base44.asServiceRole.entities.CommunicationLog.create({
      type: 'call',
      direction: 'incoming',
      phone_number: fromPhone,
      timestamp: new Date().toISOString(),
      status: 'completed',
      notes: 'Voicemail',
      related_job_id: routeId || null,
    });

    console.log(`Voicemail recorded for ${fromPhone}`);

    // Return confirmation TwiML
    const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Thank you for your message. We will get back to you soon. Goodbye.</Say></Response>';
    return new Response(twiml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  } catch (error) {
    console.error('Error handling voicemail:', error);
    return new Response('Internal error', { status: 500 });
  }
});