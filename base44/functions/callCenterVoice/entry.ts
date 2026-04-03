import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// This is the TwiML App Voice URL - handles outbound calls from agents
Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const body = await req.text();
    const params = new URLSearchParams(body);

    const to = params.get('To');
    const from = params.get('From') || params.get('Caller');
    const twilioNumber = Deno.env.get('TWILIO_PHONE_NUMBER')?.trim();

    let twiml = '';

    if (to && to.startsWith('client:')) {
      // Calling another browser agent
      const clientName = to.replace('client:', '');
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${twilioNumber}">
    <Client>${escapeXml(clientName)}</Client>
  </Dial>
</Response>`;
    } else if (to) {
      // Outbound call to a phone number
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${twilioNumber}" record="record-from-answer-dual-channel">
    <Number>${escapeXml(to)}</Number>
  </Dial>
</Response>`;
    } else {
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>No destination specified.</Say>
  <Hangup/>
</Response>`;
    }

    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('callCenterVoice error:', error.message);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>An error occurred.</Say></Response>`, {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
});

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}