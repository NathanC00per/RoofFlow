import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * handleVoicemail
 * 
 * Called by Twilio after a recording is completed.
 * Saves the voicemail to the database.
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);
    const fromPhone = params.get('From') || 'Unknown';
    const recordingUrl = params.get('RecordingUrl') || '';
    const recordingDuration = parseInt(params.get('RecordingDuration') || '0');
    const recordingSid = params.get('RecordingSid') || '';

    console.log(`Voicemail from ${fromPhone}: ${recordingUrl} (${recordingDuration}s)`);

    if (!recordingUrl) {
      console.log('No recording URL — caller may have hung up');
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Hangup /></Response>',
        { status: 200, headers: { 'Content-Type': 'application/xml' } }
      );
    }

    // Get the first active route for reference
    const routes = await base44.asServiceRole.entities.PhoneRouting.filter({ is_active: true });
    const route = routes[0];

    // Save voicemail
    await base44.asServiceRole.entities.Voicemail.create({
      phone_number: fromPhone,
      route_id: route?.id || '',
      route_description: route?.description || 'General',
      audio_url: recordingUrl + '.mp3',
      duration_seconds: recordingDuration,
      received_at: new Date().toISOString(),
      status: 'new',
    });

    // Log it
    base44.asServiceRole.entities.CommunicationLog.create({
      type: 'call',
      direction: 'incoming',
      phone_number: fromPhone,
      duration_seconds: recordingDuration,
      timestamp: new Date().toISOString(),
      status: 'completed',
      notes: `Voicemail left (${recordingDuration}s)`,
    }).catch(e => console.error('Log error:', e.message));

    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
    twiml += '<Say voice="alice">Thank you. Your message has been recorded and we will get back to you shortly. Goodbye.</Say>';
    twiml += '</Response>';
    return new Response(twiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });

  } catch (error) {
    console.error('Error handling voicemail:', error.message, error.stack);
    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
    twiml += '<Say voice="alice">Thank you. Goodbye.</Say>';
    twiml += '</Response>';
    return new Response(twiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
  }
});