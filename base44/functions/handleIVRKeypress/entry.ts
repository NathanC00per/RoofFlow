import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const formData = await req.formData();
    const digit = formData.get('Digits');
    const fromPhone = formData.get('From');
    const callSid = formData.get('CallSid');

    console.log(`IVR keypress: ${digit}`);

    // Temporary: Return voicemail until auth is fixed
    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
    twiml += '<Say>Thank you. Please leave a message.</Say>';
    twiml += '<Record maxLength="120" />';
    twiml += '</Response>';

    return new Response(twiml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  } catch (error) {
    console.error('Error handling IVR keypress:', error);
    return new Response('Internal error', { status: 500 });
  }
});