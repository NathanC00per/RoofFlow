import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

  const { recipients, subject, message, channels } = await req.json();
  // recipients: array of { name, phone, email }
  // channels: { sms: bool, email: bool }

  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

  const results = { sms: { sent: 0, failed: 0 }, email: { sent: 0, failed: 0 } };

  for (const recipient of recipients) {
    // SMS
    if (channels.sms && recipient.phone) {
      const resp = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ To: recipient.phone, From: fromNumber, Body: message }),
        }
      );
      resp.ok ? results.sms.sent++ : results.sms.failed++;
    }

    // Email
    if (channels.email && recipient.email) {
      const emailResp = await base44.asServiceRole.integrations.Core.SendEmail({
        to: recipient.email,
        subject: subject || 'Message from RoofPro',
        body: message,
      }).catch(() => null);
      emailResp ? results.email.sent++ : results.email.failed++;
    }
  }

  return Response.json({ success: true, results });
});