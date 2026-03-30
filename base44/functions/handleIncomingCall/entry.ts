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

    // Return basic voicemail
    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
    twiml += '<Say>Thank you for calling. Please leave a message after the tone.</Say>';
    twiml += '<Record maxLength="120" />';
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

function isWithinBusinessHours(businessHours) {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[dayOfWeek];
  
  const dayHours = businessHours[dayName];
  if (!dayHours || !dayHours.enabled) {
    return false;
  }

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