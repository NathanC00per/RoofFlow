import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Read body as text first, then parse it manually so the stream isn't consumed
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);
    const digit = params.get('Digits');
    const fromPhone = params.get('From');
    const callSid = params.get('CallSid');

    console.log(`IVR keypress: ${digit} from ${fromPhone}`);

    // Create a new request with the body restored so the SDK can authenticate
    const newReq = new Request(req.url, {
      method: req.method,
      headers: req.headers,
      body: bodyText,
    });

    const base44 = createClientFromRequest(newReq);

    // Get IVR config and find matching option
    const ivrConfigs = await base44.asServiceRole.entities.IVRConfig.list();
    const activeIvr = ivrConfigs.find(ivr => ivr.is_active) || ivrConfigs[0];
    
    if (!activeIvr) {
      return voicemailResponse();
    }

    const selectedOption = activeIvr.menu_options.find(opt => opt.digit === digit);

    if (!selectedOption || !selectedOption.route_id) {
      return voicemailResponse();
    }

    // Get the route details
    const route = await base44.asServiceRole.entities.PhoneRouting.get(selectedOption.route_id);
    
    // Check if route is within business hours
    const isOpen = isWithinBusinessHours(route.business_hours);

    // Log the call
    await base44.asServiceRole.entities.CommunicationLog.create({
      type: 'call',
      direction: 'incoming',
      phone_number: fromPhone,
      timestamp: new Date().toISOString(),
      status: 'completed',
      routed_to_role: route.routing_type === 'role' ? route.target_role : undefined,
      notes: `Routed via IVR option ${digit}`,
    });

    if (!isOpen) {
      let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
      twiml += '<Say>We are currently closed. Please leave a message and we will get back to you.</Say>';
      twiml += `<Record maxLength="120" action="https://app.base44.dev/functions/handleVoicemail" />`;
      twiml += '</Response>';
      return new Response(twiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
    }

    if (route.forward_number) {
      let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
      twiml += `<Dial timeout="${route.ring_timeout}">${escapeXml(route.forward_number)}</Dial>`;
      twiml += '<Say>The line is busy or did not answer. Please leave a message.</Say>';
      twiml += `<Record maxLength="120" action="https://app.base44.dev/functions/handleVoicemail" />`;
      twiml += '</Response>';
      return new Response(twiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
    }

    return voicemailResponse();
  } catch (error) {
    console.error('Error handling IVR keypress:', error);
    return voicemailResponse();
  }
});

function voicemailResponse() {
  let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
  twiml += '<Say>Thank you. Please leave a message after the tone.</Say>';
  twiml += '<Record maxLength="120" action="https://app.base44.dev/functions/handleVoicemail" />';
  twiml += '</Response>';
  return new Response(twiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
}

function isWithinBusinessHours(businessHours) {
  if (!businessHours) return true;

  const now = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[now.getDay()];
  const dayHours = businessHours[dayName];

  if (!dayHours || !dayHours.enabled) return false;

  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return currentTime >= dayHours.start_time && currentTime <= dayHours.end_time;
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