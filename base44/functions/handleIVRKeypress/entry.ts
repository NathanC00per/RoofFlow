import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const formData = await req.formData();
    const url = new URL(req.url);
    
    const digit = formData.get('Digits');
    const ivrConfigId = url.searchParams.get('configId');
    const fromPhone = formData.get('From');
    const callSid = formData.get('CallSid');
    const attemptNumber = parseInt(formData.get('AttemptNumber') || '1');

    console.log(`IVR keypress: ${digit} for config ${ivrConfigId} (attempt ${attemptNumber})`);

    // Fetch the IVR config
    const ivrConfig = await base44.asServiceRole.entities.IVRConfig.get(ivrConfigId);
    if (!ivrConfig) {
      return generateErrorTwiML('IVR configuration not found');
    }

    // Find the option for this digit
    const selectedOption = ivrConfig.menu_options.find(opt => opt.digit === digit);

    if (!selectedOption || !selectedOption.route_id) {
      // Invalid input - retry or hangup
      if (attemptNumber < ivrConfig.max_attempts) {
        console.log(`Invalid input, attempt ${attemptNumber} of ${ivrConfig.max_attempts}`);
        return generateRetryTwiML(ivrConfig, attemptNumber + 1, ivrConfigId, fromPhone, callSid);
      } else {
        return generateErrorTwiML('Sorry, invalid option. Connecting to voicemail.');
      }
    }

    // Fetch the selected route
    const route = await base44.asServiceRole.entities.PhoneRouting.get(selectedOption.route_id);
    if (!route || !route.is_active) {
      return generateErrorTwiML('Selected route is not available');
    }

    // Generate TwiML for the selected route
    let twiml = await generateRouteTwiML(base44, route, fromPhone);

    return new Response(twiml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  } catch (error) {
    console.error('Error handling IVR keypress:', error);
    return generateErrorTwiML('An error occurred. Please try again later.');
  }
});

async function generateRouteTwiML(base44, route, fromPhone) {
  let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';

  try {
    if (route.routing_type === 'role') {
      const employees = await base44.asServiceRole.entities.Employee.filter({
        role: route.target_role,
        status: 'active',
      });

      const phones = employees
        .map(e => e.phone)
        .filter(Boolean)
        .slice(0, 5);

      if (phones.length > 0) {
        twiml += `<Dial timeout="${route.ring_timeout || 30}">`;
        phones.forEach(phone => {
          twiml += `<Number>${phone}</Number>`;
        });
        twiml += '</Dial>';
      }
    } else if (route.routing_type === 'employee') {
      const employees = await base44.asServiceRole.entities.Employee.filter({
        status: 'active',
      });

      const targetEmps = employees.filter(e =>
        (route.target_employee_ids || []).includes(e.id)
      );

      const phones = targetEmps
        .map(e => e.phone)
        .filter(Boolean)
        .slice(0, 5);

      if (phones.length > 0) {
        twiml += `<Dial timeout="${route.ring_timeout || 30}">`;
        phones.forEach(phone => {
          twiml += `<Number>${phone}</Number>`;
        });
        twiml += '</Dial>';
      }
    } else if (route.routing_type === 'round_robin') {
      const employees = await base44.asServiceRole.entities.Employee.filter({
        status: 'active',
      });

      const phones = employees
        .map(e => e.phone)
        .filter(Boolean)
        .slice(0, 5);

      if (phones.length > 0) {
        twiml += `<Dial timeout="${route.ring_timeout || 30}">`;
        phones.forEach(phone => {
          twiml += `<Number>${phone}</Number>`;
        });
        twiml += '</Dial>';
      }
    }

    if (route.forward_number) {
      twiml += `<Dial timeout="${route.ring_timeout || 30}">${route.forward_number}</Dial>`;
    }
  } catch (error) {
    console.error('Error generating route TwiML:', error);
  }

  // Fallback to voicemail
  twiml += '<Say>Thank you for calling. No one answered. Please leave a message.</Say>';
  twiml += '<Record maxLength="120" />';
  twiml += '</Response>';

  return twiml;
}

function generateRetryTwiML(ivrConfig, attemptNumber, ivrConfigId, fromPhone, callSid) {
  let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
  twiml += '<Say>Sorry, that was not a valid option.</Say>';
  twiml += '<Say>' + escapeXml(ivrConfig.greeting_message) + '</Say>';
  
  ivrConfig.menu_options.forEach(opt => {
    twiml += '<Say>' + escapeXml(opt.description_text) + '</Say>';
  });

  twiml += `<Gather timeout="${ivrConfig.timeout_seconds}" numDigits="1" action="?configId=${ivrConfigId}" method="POST">`;
  twiml += '<Say>Please enter your selection now.</Say>';
  twiml += '</Gather>';
  twiml += '</Response>';

  return new Response(twiml, {
    status: 200,
    headers: { 'Content-Type': 'application/xml' },
  });
}

function generateErrorTwiML(message) {
  let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
  twiml += '<Say>' + escapeXml(message) + '</Say>';
  twiml += '<Record maxLength="120" />';
  twiml += '</Response>';

  return new Response(twiml, {
    status: 200,
    headers: { 'Content-Type': 'application/xml' },
  });
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