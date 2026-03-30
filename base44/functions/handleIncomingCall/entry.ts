import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  // Twilio sends POST requests with form-encoded data
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const formData = await req.formData();
    
    const fromPhone = formData.get('From');
    const toPhone = formData.get('To');
    const callSid = formData.get('CallSid');

    // Log the incoming call
    console.log(`Incoming call from ${fromPhone} to ${toPhone} (SID: ${callSid})`);

    // Check if an IVR is active
    const ivrConfigs = await base44.asServiceRole.entities.IVRConfig.filter({ is_active: true });
    if (ivrConfigs.length > 0) {
      const activeIVR = ivrConfigs[0]; // Use first active IVR
      return generateIVRTwiML(activeIVR);
    }

    // Fetch active routing rules sorted by priority
    const routes = await base44.asServiceRole.entities.PhoneRouting.filter({ is_active: true });
    const sortedRoutes = routes.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';

    if (sortedRoutes.length === 0) {
      // No routing configured - default voicemail
      twiml += '<Say>Thank you for calling. No one is available right now. Please leave a message.</Say>';
      twiml += '<Record maxLength="120" />';
    } else {
      const firstRoute = sortedRoutes[0];
      
      if (firstRoute.routing_type === 'role') {
        // Fetch all users with this role and get their phones
        const employees = await base44.asServiceRole.entities.Employee.filter({
          role: firstRoute.target_role,
          status: 'active',
        });

        if (employees.length > 0) {
          // Dial first available employee
          const phones = employees
            .map(e => e.phone)
            .filter(Boolean)
            .slice(0, 5); // Twilio limit

          if (phones.length > 0) {
            twiml += `<Dial timeout="${firstRoute.ring_timeout || 30}">`;
            phones.forEach(phone => {
              twiml += `<Number>${phone}</Number>`;
            });
            twiml += '</Dial>';
          }
        }
      } else if (firstRoute.routing_type === 'employee') {
        // Dial specific employees
        const employees = await base44.asServiceRole.entities.Employee.filter({
          status: 'active',
        });

        const targetEmps = employees.filter(e =>
          (firstRoute.target_employee_ids || []).includes(e.id)
        );

        if (targetEmps.length > 0) {
          const phones = targetEmps
            .map(e => e.phone)
            .filter(Boolean)
            .slice(0, 5);

          if (phones.length > 0) {
            twiml += `<Dial timeout="${firstRoute.ring_timeout || 30}">`;
            phones.forEach(phone => {
              twiml += `<Number>${phone}</Number>`;
            });
            twiml += '</Dial>';
          }
        }
      } else if (firstRoute.routing_type === 'round_robin') {
        // Round-robin: dial all active employees
        const employees = await base44.asServiceRole.entities.Employee.filter({
          status: 'active',
        });

        if (employees.length > 0) {
          const phones = employees
            .map(e => e.phone)
            .filter(Boolean)
            .slice(0, 5);

          if (phones.length > 0) {
            twiml += `<Dial timeout="${firstRoute.ring_timeout || 30}">`;
            phones.forEach(phone => {
              twiml += `<Number>${phone}</Number>`;
            });
            twiml += '</Dial>';
          }
        }
      }

      // Fallback if no employees or forward number configured
      if (firstRoute.forward_number) {
        twiml += `<Dial timeout="${firstRoute.ring_timeout || 30}">${firstRoute.forward_number}</Dial>`;
      }

      // Default voicemail fallback
      twiml += '<Say>Thank you for calling. No one answered. Please leave a message.</Say>';
      twiml += '<Record maxLength="120" />';
    }

    twiml += '</Response>';

    return new Response(twiml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  } catch (error) {
    console.error('Error handling incoming call:', error);
    return new Response('Internal error', { status: 500 });
  }
});

function generateIVRTwiML(ivrConfig) {
  let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
  twiml += '<Say>' + ivrConfig.greeting_message + '</Say>';
  
  ivrConfig.menu_options.forEach(opt => {
    twiml += '<Say>' + opt.description_text + '</Say>';
  });

  twiml += `<Gather timeout="${ivrConfig.timeout_seconds || 5}" numDigits="1" action="handleIVRKeypress" method="POST">`;
  twiml += '<Say>Please enter your selection now.</Say>';
  twiml += '</Gather>';
  twiml += '</Response>';

  return new Response(twiml, {
    status: 200,
    headers: { 'Content-Type': 'application/xml' },
  });
}