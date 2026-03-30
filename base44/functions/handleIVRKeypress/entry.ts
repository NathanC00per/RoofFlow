import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const formData = await req.formData();
    const digit = formData.get('Digits');
    const fromPhone = formData.get('From');
    const callSid = formData.get('CallSid');

    console.log(`IVR keypress: ${digit}`);

    // Check if we're within business hours
    const isOpen = isWithinBusinessHours({
      monday: { enabled: true, start_time: '09:00', end_time: '17:00' },
      tuesday: { enabled: true, start_time: '09:00', end_time: '17:00' },
      wednesday: { enabled: true, start_time: '09:00', end_time: '17:00' },
      thursday: { enabled: true, start_time: '09:00', end_time: '17:00' },
      friday: { enabled: true, start_time: '09:00', end_time: '17:00' },
      saturday: { enabled: false, start_time: '09:00', end_time: '17:00' },
      sunday: { enabled: false, start_time: '09:00', end_time: '17:00' },
    });

    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
    
    if (!isOpen) {
      twiml += '<Say>We are currently closed. Please leave a message and we will get back to you.</Say>';
      twiml += '<Record maxLength="120" />';
    } else {
      twiml += '<Say>Thank you. Please leave a message.</Say>';
      twiml += '<Record maxLength="120" />';
    }
    
    twiml += '</Response>';

    return new Response(twiml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  } catch (error) {
    console.error('Error handling IVR keypress:', error);
    return new Response('Internal error', { status: 500 });
  }
});

function isWithinBusinessHours(businessHours) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[dayOfWeek];
  
  const dayHours = businessHours[dayName];
  if (!dayHours || !dayHours.enabled) {
    return false;
  }

  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return currentTime >= dayHours.start_time && currentTime <= dayHours.end_time;
}