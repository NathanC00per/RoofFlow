import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * handleVoicemailChoice
 * 
 * Called after offering caller option to leave voicemail.
 * Press 1 → record voicemail
 * Anything else / no input → hang up politely
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const bodyText = await req.text();
  const params = new URLSearchParams(bodyText);
  const digit = params.get('Digits') || '';
  const appId = Deno.env.get('BASE44_APP_ID');
  const baseUrl = `https://${appId}.base44.app/api/apps/${appId}`;

  console.log(`Voicemail choice: digit="${digit}"`);

  if (digit === '1') {
    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
    twiml += '<Say voice="alice">Please leave your message after the tone. Press the hash key when finished.</Say>';
    twiml += `<Record maxLength="120" action="${baseUrl}/functions/handleVoicemail" transcribe="false" playBeep="true" finishOnKey="#" />`;
    twiml += '</Response>';
    return new Response(twiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
  }

  let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
  twiml += '<Say voice="alice">Thank you for calling. We will be in touch. Goodbye.</Say>';
  twiml += '</Response>';
  return new Response(twiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
});