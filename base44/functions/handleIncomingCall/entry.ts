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
    const toPhone = params.get('To');
    const callSid = params.get('CallSid');

    console.log(`Incoming call from ${fromPhone} to ${toPhone} (SID: ${callSid})`);

    const ivrConfigs = await base44.asServiceRole.entities.IVRConfig.list();
    const activeIvr = ivrConfigs.find(ivr => ivr.is_active) || ivrConfigs[0];

    if (!activeIvr) {
      let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
      twiml += '<Say>Thank you for calling. Please leave a message after the tone.</Say>';
      twiml += `<Record maxLength="120" action="${baseUrl()}/functions/handleVoicemail" />`;
      twiml += '</Response>';
      return new Response(twiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
    }

    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
    twiml += `<Say>${escapeXml(activeIvr.greeting_message)}</Say>`;

    for (const option of activeIvr.menu_options) {
      twiml += `<Say>${escapeXml(option.description_text)}</Say>`;
    }

    twiml += `<Gather numDigits="1" timeout="${activeIvr.timeout_seconds}" action="${baseUrl()}/functions/handleIVRKeypress" method="POST">`;
    twiml += '<Say>Please press a key now.</Say>';
    twiml += '</Gather>';
    twiml += '<Say>We did not receive any input. Goodbye.</Say>';
    twiml += '</Response>';

    return new Response(twiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
  } catch (error) {
    console.error('Error handling incoming call:', error.message, error.stack);
    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
    twiml += '<Say>Thank you for calling. Please leave a message after the tone.</Say>';
    twiml += `<Record maxLength="120" action="${baseUrl()}/functions/handleVoicemail" />`;
    twiml += '</Response>';
    return new Response(twiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
  }
});

function baseUrl() {
  return `https://${Deno.env.get('BASE44_APP_ID')}.base44.app`;
}

function escapeXml(str) {
  if (!str) return '';
  return str.replace(/[<>&'"]/g, c => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}