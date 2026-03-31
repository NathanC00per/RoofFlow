import { createClient } from 'npm:@base44/sdk@0.8.23';

const base44 = createClient({ appId: Deno.env.get('BASE44_APP_ID') });

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);
    const fromPhone = params.get('From');
    const recordingUrl = params.get('RecordingUrl');
    const recordingDuration = params.get('RecordingDuration');

    console.log(`Voicemail received from ${fromPhone}: ${recordingUrl}`);

    const routes = await base44.asServiceRole.entities.PhoneRouting.list();
    const route = routes[0];
    const routeId = route?.id;
    const routeDescription = route?.description || 'Unknown Route';

    await base44.asServiceRole.entities.Voicemail.create({
      phone_number: fromPhone,
      route_id: routeId,
      route_description: routeDescription,
      audio_url: recordingUrl,
      duration_seconds: parseInt(recordingDuration) || 0,
      received_at: new Date().toISOString(),
      status: 'new',
    });

    base44.asServiceRole.entities.CommunicationLog.create({
      type: 'call',
      direction: 'incoming',
      phone_number: fromPhone,
      duration_seconds: parseInt(recordingDuration) || 0,
      timestamp: new Date().toISOString(),
      status: 'completed',
      notes: `Voicemail recorded. Route: ${routeDescription}`,
    }).catch(e => console.error('Log error:', e.message));

    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
    twiml += '<Say>Thank you. Your message has been recorded. Goodbye.</Say>';
    twiml += '</Response>';

    return new Response(twiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
  } catch (error) {
    console.error('Error handling voicemail:', error.message, error.stack);
    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
    twiml += '<Say>Thank you. Goodbye.</Say>';
    twiml += '</Response>';
    return new Response(twiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
  }
});