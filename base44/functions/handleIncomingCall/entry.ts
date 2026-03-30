import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const formData = await req.formData();
    const fromPhone = formData.get('From');
    const toPhone = formData.get('To');
    const callSid = formData.get('CallSid');

    console.log(`Incoming call from ${fromPhone} to ${toPhone} (SID: ${callSid})`);

    // Get IVR config to play the greeting and menu options
    const base44 = createClientFromRequest(req);
    const ivrConfigs = await base44.asServiceRole.entities.IVRConfig.list();
    const activeIvr = ivrConfigs.find(ivr => ivr.is_active) || ivrConfigs[0];

    if (!activeIvr) {
      // No IVR configured, go straight to voicemail
      let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
      twiml += '<Say>Thank you for calling. Please leave a message after the tone.</Say>';
      twiml += '<Record maxLength="120" action="https://app.base44.dev/functions/handleVoicemail" />';
      twiml += '</Response>';
      return new Response(twiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
    }

    // Build and return IVR menu with Gather
    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
    twiml += `<Say>${escapeXml(activeIvr.greeting_message)}</Say>`;
    twiml += `<Gather numDigits="1" timeout="${activeIvr.timeout_seconds}" action="https://app.base44.dev/functions/handleIVRKeypress" method="POST">`;
    
    for (const option of activeIvr.menu_options) {
      twiml += `<Say>${escapeXml(option.description_text)}</Say>`;
    }
    
    twiml += '</Gather>';
    twiml += '<Say>We did not receive any input. Please try again.</Say>';
    twiml += '<Redirect>https://app.base44.dev/functions/handleIncomingCall</Redirect>';
    twiml += '</Response>';

    return new Response(twiml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  } catch (error) {
    console.error('Error handling incoming call:', error);
    // Fallback to voicemail on error
    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
    twiml += '<Say>Thank you for calling. Please leave a message after the tone.</Say>';
    twiml += '<Record maxLength="120" action="https://app.base44.dev/functions/handleVoicemail" />';
    twiml += '</Response>';
    return new Response(twiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
  }
});

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