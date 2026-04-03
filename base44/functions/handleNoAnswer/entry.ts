import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * handleNoAnswer
 * 
 * Called by Twilio when a <Dial> completes (no answer, busy, failed, or completed).
 * If the call was not answered, offer voicemail.
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);
    const base44 = createClientFromRequest(req);
    const dialCallStatus = params.get('DialCallStatus') || '';
    const fromPhone = params.get('From') || 'Unknown';

    const appId = Deno.env.get('BASE44_APP_ID');
    const baseUrl = `https://${appId}.base44.app`;

    console.log(`handleNoAnswer: DialCallStatus=${dialCallStatus} from=${fromPhone}`);

    // If call was answered successfully, just hang up cleanly
    if (dialCallStatus === 'completed' || dialCallStatus === 'answered') {
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Hangup /></Response>',
        { status: 200, headers: { 'Content-Type': 'application/xml' } }
      );
    }

    // If called with no DialCallStatus it means the <Record> finished (voicemail was left)
    // or the call ended normally — just hang up
    if (!dialCallStatus) {
      console.log('handleNoAnswer called with no DialCallStatus — recording completed or call ended');
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">Thank you. Goodbye.</Say></Response>',
        { status: 200, headers: { 'Content-Type': 'application/xml' } }
      );
    }

    // Log missed call
    base44.asServiceRole.entities.CommunicationLog.create({
      type: 'call',
      direction: 'incoming',
      phone_number: fromPhone,
      timestamp: new Date().toISOString(),
      status: 'missed',
      notes: `Call not answered (status: ${dialCallStatus}) — offered voicemail`,
    }).catch(e => console.error('Log error:', e.message));

    // Offer voicemail
    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
    twiml += '<Say voice="alice">We are sorry, no one is available to take your call right now.</Say>';
    twiml += '<Gather numDigits="1" timeout="5" action="' + baseUrl + '/functions/handleVoicemailChoice" method="POST">';
    twiml += '<Say voice="alice">Press 1 to leave a voicemail, or hang up to end the call.</Say>';
    twiml += '</Gather>';
    twiml += '<Say voice="alice">Thank you for calling. Goodbye.</Say>';
    twiml += '</Response>';

    return new Response(twiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });

  } catch (error) {
    console.error('handleNoAnswer error:', error.message);
    const appId = Deno.env.get('BASE44_APP_ID');
    const baseUrl = `https://${appId}.base44.app/api/apps/${appId}`;
    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
    twiml += '<Say voice="alice">No one is available. Please leave a message after the tone.</Say>';
    twiml += `<Record maxLength="120" action="${baseUrl}/functions/handleVoicemail" transcribe="false" playBeep="true" />`;
    twiml += '</Response>';
    return new Response(twiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
  }
});