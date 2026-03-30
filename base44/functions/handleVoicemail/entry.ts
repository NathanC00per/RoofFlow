import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const formData = await req.formData();
    const fromPhone = formData.get('From');
    const recordingUrl = formData.get('RecordingUrl');

    console.log(`Voicemail received from ${fromPhone}: ${recordingUrl}`);

    // Temporary: Just acknowledge until auth is fixed
    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
    twiml += '<Say>Thank you. Your message has been recorded. Goodbye.</Say>';
    twiml += '</Response>';

    return new Response(twiml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  } catch (error) {
    console.error('Error handling voicemail:', error);
    return new Response('Internal error', { status: 500 });
  }
});