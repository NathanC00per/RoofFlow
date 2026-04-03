import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import twilio from 'npm:twilio@5.3.3';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')?.trim();
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')?.trim();
    const twimlAppSid = Deno.env.get('TWILIO_TWIML_APP_SID')?.trim();

    if (!twimlAppSid) {
      return Response.json({ error: 'TWILIO_TWIML_APP_SID secret is not set. Please create a TwiML App in Twilio console and set this secret.' }, { status: 500 });
    }

    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    // Use email as the identity (sanitized)
    const identity = user.email.replace(/[^a-zA-Z0-9_\-@.]/g, '_');

    const token = new AccessToken(accountSid, authToken, authToken, {
      identity,
      ttl: 3600,
    });

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: true,
    });

    token.addGrant(voiceGrant);

    return Response.json({ token: token.toJwt(), identity });
  } catch (error) {
    console.error('Token generation error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});