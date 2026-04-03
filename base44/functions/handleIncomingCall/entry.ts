import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * handleIncomingCall
 * 
 * Flow:
 * 1. Incoming call arrives at company Twilio number
 * 2. Look for active IVR config — if found, play menu
 * 3. If no IVR, look for active phone routes and dial the first active employee who has a phone number
 * 4. If no one answers (ring timeout), offer voicemail
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Read body FIRST before SDK consumes the request
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);
    const base44 = createClientFromRequest(req);
    const fromPhone = params.get('From') || 'Unknown';
    const toPhone = params.get('To') || '';
    const callSid = params.get('CallSid') || '';

    console.log(`Incoming call from ${fromPhone} to ${toPhone} (SID: ${callSid})`);

    // Log the incoming call
    base44.asServiceRole.entities.CommunicationLog.create({
      type: 'call',
      direction: 'incoming',
      phone_number: fromPhone,
      timestamp: new Date().toISOString(),
      status: 'completed',
      notes: `Incoming call to ${toPhone}`,
    }).catch(e => console.error('Log error:', e.message));

    // Try to get active IVR config
    const ivrConfigs = await base44.asServiceRole.entities.IVRConfig.list();
    const activeIvr = ivrConfigs.find(ivr => ivr.is_active);

    if (activeIvr && activeIvr.menu_options && activeIvr.menu_options.length > 0) {
      // Build IVR menu
      const appId = Deno.env.get('BASE44_APP_ID');
      const baseUrl = `https://${appId}.base44.app/api/apps/${appId}`;
      
      let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
      twiml += `<Gather numDigits="1" timeout="${activeIvr.timeout_seconds || 5}" action="${baseUrl}/functions/handleIVRKeypress" method="POST">`;
      twiml += `<Say voice="alice">${escapeXml(activeIvr.greeting_message)}</Say>`;
      for (const option of activeIvr.menu_options) {
        twiml += `<Say voice="alice">${escapeXml(option.description_text)}</Say>`;
      }
      twiml += '</Gather>';
      // No input — go to voicemail
      twiml += `<Say voice="alice">We did not receive any input.</Say>`;
      twiml += voicemailTwiml(baseUrl);
      twiml += '</Response>';
      return new Response(twiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
    }

    // No IVR — get active routes and dial directly
    const routes = await base44.asServiceRole.entities.PhoneRouting.filter({ is_active: true });
    const employees = await base44.asServiceRole.entities.Employee.filter({ status: 'active' });

    const appId = Deno.env.get('BASE44_APP_ID');
    const baseUrl = `https://${appId}.base44.app/api/apps/${appId}`;

    // Find phone numbers to dial from routes
    const dialNumbers = getDialNumbers(routes, employees);

    if (dialNumbers.length === 0) {
      console.log('No phone numbers found on active routes/employees — going straight to voicemail');
      let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
      twiml += '<Say voice="alice">Thank you for calling. There are no agents available right now.</Say>';
      twiml += voicemailTwiml(baseUrl);
      twiml += '</Response>';
      return new Response(twiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
    }

    // Dial simultaneously (simultaneous ring) - if no answer, voicemail
    const ringTimeout = routes[0]?.ring_timeout || 30;
    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
    twiml += `<Dial timeout="${ringTimeout}" action="${baseUrl}/functions/handleNoAnswer" method="POST">`;
    for (const num of dialNumbers) {
      twiml += `<Number>${escapeXml(num)}</Number>`;
    }
    twiml += '</Dial>';
    twiml += '</Response>';

    return new Response(twiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });

  } catch (error) {
    console.error('Error handling incoming call:', error.message, error.stack);
    const appId = Deno.env.get('BASE44_APP_ID');
    const baseUrl = `https://${appId}.base44.app/api/apps/${appId}`;
    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
    twiml += '<Say voice="alice">Thank you for calling. We are unable to take your call right now.</Say>';
    twiml += voicemailTwiml(baseUrl);
    twiml += '</Response>';
    return new Response(twiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
  }
});

function getDialNumbers(routes, employees) {
  const numbers = new Set();
  for (const route of routes) {
    if (!route.is_active) continue;

    if (route.routing_type === 'employee' && route.target_employee_ids?.length) {
      for (const empId of route.target_employee_ids) {
        const emp = employees.find(e => e.id === empId);
        if (emp?.phone) numbers.add(emp.phone);
      }
    } else if (route.routing_type === 'role' && route.target_role) {
      for (const emp of employees) {
        if (emp.role === route.target_role && emp.phone) numbers.add(emp.phone);
      }
    } else if (route.routing_type === 'round_robin') {
      for (const emp of employees) {
        if (emp.phone) numbers.add(emp.phone);
      }
    }

    // Also include forward_number if set
    if (route.forward_number) numbers.add(route.forward_number);
  }
  return [...numbers];
}

function voicemailTwiml(baseUrl) {
  let out = `<Say voice="alice">No one is available to take your call. Please leave a message after the tone and we will get back to you as soon as possible.</Say>`;
  out += `<Record maxLength="120" action="${baseUrl}/functions/handleVoicemail" transcribe="false" playBeep="true" />`;
  return out;
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