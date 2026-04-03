import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * handleIVRKeypress
 * 
 * Receives the digit pressed by caller, looks up the route, 
 * dials the assigned employees' phones simultaneously.
 * If no answer → voicemail offer.
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);
    const base44 = createClientFromRequest(req);
    const digit = params.get('Digits') || '';
    const fromPhone = params.get('From') || 'Unknown';
    
    const appId = Deno.env.get('BASE44_APP_ID');
    const baseUrl = `https://${appId}.base44.app/api/apps/${appId}`;

    console.log(`IVR keypress: digit="${digit}" from=${fromPhone}`);

    const ivrConfigs = await base44.asServiceRole.entities.IVRConfig.list();
    const activeIvr = ivrConfigs.find(ivr => ivr.is_active) || ivrConfigs[0];

    if (!activeIvr) {
      console.log('No active IVR found');
      return voicemailResponse(baseUrl);
    }

    const selectedOption = activeIvr.menu_options.find(opt => opt.digit === digit);
    if (!selectedOption || !selectedOption.route_id) {
      // No digit pressed (timeout) or unrecognised — re-play menu once more then voicemail
      if (!digit) {
        console.log('No digit received (timeout) — offering voicemail');
        let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
        twiml += '<Say voice="alice">We did not receive your selection.</Say>';
        twiml += voicemailTwiml(baseUrl);
        twiml += '</Response>';
        return new Response(twiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
      }
      console.log(`No matching option for digit "${digit}"`);
      let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
      twiml += '<Say voice="alice">That option was not recognised.</Say>';
      twiml += voicemailTwiml(baseUrl);
      twiml += '</Response>';
      return new Response(twiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
    }

    const route = await base44.asServiceRole.entities.PhoneRouting.get(selectedOption.route_id);
    if (!route) {
      console.log('Route not found');
      return voicemailResponse(baseUrl);
    }

    console.log(`Route: ${route.description}, type: ${route.routing_type}`);

    // Get dial numbers for this specific route
    const employees = await base44.asServiceRole.entities.Employee.filter({ status: 'active' });
    const dialNumbers = getRouteNumbers(route, employees);

    // Log the routing
    base44.asServiceRole.entities.CommunicationLog.create({
      type: 'call',
      direction: 'incoming',
      phone_number: fromPhone,
      timestamp: new Date().toISOString(),
      status: 'completed',
      routed_to_role: route.routing_type === 'role' ? route.target_role : undefined,
      notes: `IVR option ${digit} (${selectedOption.label}) → ${route.description}`,
    }).catch(e => console.error('Log error:', e.message));

    if (dialNumbers.length === 0) {
      console.log(`No phone numbers for route ${route.description}`);
      let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
      twiml += `<Say voice="alice">Connecting you to ${escapeXml(selectedOption.label)}. Please hold.</Say>`;
      twiml += voicemailTwiml(baseUrl);
      twiml += '</Response>';
      return new Response(twiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
    }

    const ringTimeout = route.ring_timeout || 30;
    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
    twiml += `<Say voice="alice">Please hold while we connect you to ${escapeXml(selectedOption.label)}.</Say>`;
    twiml += `<Dial timeout="${ringTimeout}" action="${baseUrl}/functions/handleNoAnswer" method="POST">`;
    for (const num of dialNumbers) {
      twiml += `<Number>${escapeXml(num)}</Number>`;
    }
    twiml += '</Dial>';
    twiml += '</Response>';

    return new Response(twiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });

  } catch (error) {
    console.error('Error handling IVR keypress:', error.message, error.stack);
    const appId = Deno.env.get('BASE44_APP_ID');
    return voicemailResponse(`https://${appId}.base44.app/api/apps/${appId}`);
  }
});

function getRouteNumbers(route, employees) {
  const numbers = [];
  if (route.routing_type === 'employee' && route.target_employee_ids?.length) {
    for (const empId of route.target_employee_ids) {
      const emp = employees.find(e => e.id === empId);
      if (emp?.phone) numbers.push(emp.phone);
    }
  } else if (route.routing_type === 'role' && route.target_role) {
    for (const emp of employees) {
      if (emp.role === route.target_role && emp.phone) numbers.push(emp.phone);
    }
  } else if (route.routing_type === 'round_robin') {
    for (const emp of employees) {
      if (emp.phone) numbers.push(emp.phone);
    }
  }
  if (route.forward_number) numbers.push(route.forward_number);
  return numbers;
}

function voicemailResponse(baseUrl) {
  let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
  twiml += voicemailTwiml(baseUrl);
  twiml += '</Response>';
  return new Response(twiml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
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