import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const formData = await req.formData();
    const fromPhone = formData.get('From');
    const recordingUrl = formData.get('RecordingUrl');
    const recordingDuration = formData.get('RecordingDuration');
    const toPhone = formData.get('To');

    console.log(`Voicemail received from ${fromPhone}: ${recordingUrl}`);

    // Create service-role client for database writes
    const base44 = createClientFromRequest(req);

    // Get the default/first route for now (in future, this would be selected based on IVR choice)
    const routes = await base44.asServiceRole.entities.PhoneRouting.list();
    const route = routes[0]; // Use first route as default
    const routeId = route?.id;
    const routeDescription = route?.description || 'Unknown Route';

    // Create Voicemail record
    const voicemail = await base44.asServiceRole.entities.Voicemail.create({
      phone_number: fromPhone,
      route_id: routeId,
      route_description: routeDescription,
      audio_url: recordingUrl,
      duration_seconds: parseInt(recordingDuration) || 0,
      received_at: new Date().toISOString(),
      status: 'new',
    });

    console.log(`Created voicemail: ${voicemail.id}`);

    // Create CommunicationLog entry
    await base44.asServiceRole.entities.CommunicationLog.create({
      type: 'call',
      direction: 'incoming',
      phone_number: fromPhone,
      duration_seconds: parseInt(recordingDuration) || 0,
      timestamp: new Date().toISOString(),
      status: 'completed',
      notes: `Voicemail recorded. Route: ${routeDescription}`,
    });

    console.log('Created communication log');

    // Return TwiML response
    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
    twiml += '<Say>Thank you. Your message has been recorded. Goodbye.</Say>';
    twiml += '</Response>';

    return new Response(twiml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  } catch (error) {
    console.error('Error handling voicemail:', error);
    
    // Still return valid TwiML even on error
    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
    twiml += '<Say>Thank you. Goodbye.</Say>';
    twiml += '</Response>';
    
    return new Response(twiml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  }
});