import { useState, useEffect, useRef, useCallback } from 'react';
import { Device } from '@twilio/voice-sdk';
import { base44 } from '@/api/base44Client';

export function useCallCenter() {
  const deviceRef = useRef(null);
  const [deviceState, setDeviceState] = useState('unregistered'); // unregistered, registering, registered, error
  const [agentStatus, setAgentStatus] = useState('offline'); // offline, available, busy
  const [activeCall, setActiveCall] = useState(null);
  const [callQueue, setCallQueue] = useState([]);
  const [error, setError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef(null);
  const [identity, setIdentity] = useState(null);

  const startTimer = useCallback(() => {
    setCallDuration(0);
    timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCallDuration(0);
  }, []);

  const setupCallHandlers = useCallback((call) => {
    call.on('accept', () => {
      setAgentStatus('busy');
      startTimer();
    });
    call.on('disconnect', () => {
      setActiveCall(null);
      setAgentStatus('available');
      setIsMuted(false);
      stopTimer();
    });
    call.on('cancel', () => {
      setActiveCall(null);
      setAgentStatus('available');
      stopTimer();
    });
    call.on('reject', () => {
      setActiveCall(null);
      stopTimer();
    });
    call.on('error', (err) => {
      console.error('Call error:', err);
      setActiveCall(null);
      setAgentStatus('available');
      stopTimer();
    });
  }, [startTimer, stopTimer]);

  const goOnline = useCallback(async () => {
    try {
      setDeviceState('registering');
      setError(null);
      const res = await base44.functions.invoke('generateTwilioToken', {});
      const { token, identity: id, error: tokenError } = res.data;

      if (tokenError) {
        setError(tokenError);
        setDeviceState('error');
        return;
      }

      setIdentity(id);

      const device = new Device(token, {
        logLevel: 1,
        codecPreferences: ['opus', 'pcmu'],
        enableImprovedSignalingErrorPrecision: true,
      });

      device.on('registered', () => {
        setDeviceState('registered');
        setAgentStatus('available');
      });

      device.on('unregistered', () => {
        setDeviceState('unregistered');
        setAgentStatus('offline');
      });

      device.on('error', (err) => {
        console.error('Device error:', err);
        setError(err.message || 'Device error');
        setDeviceState('error');
      });

      device.on('incoming', (call) => {
        // Add to queue if agent is busy, otherwise show as incoming
        const callInfo = {
          id: call.parameters.CallSid,
          call,
          from: call.parameters.From || 'Unknown',
          status: 'ringing',
          timestamp: new Date(),
        };

        setCallQueue(prev => [...prev, callInfo]);

        call.on('cancel', () => {
          setCallQueue(prev => prev.filter(c => c.id !== callInfo.id));
        });
      });

      device.on('tokenWillExpire', async () => {
        const refreshRes = await base44.functions.invoke('generateTwilioToken', {});
        if (refreshRes.data?.token) device.updateToken(refreshRes.data.token);
      });

      await device.register();
      deviceRef.current = device;
    } catch (err) {
      console.error('Go online error:', err);
      setError(err?.message || err?.toString() || 'Failed to connect. Check your Twilio credentials.');
      setDeviceState('error');
    }
  }, []);

  const goOffline = useCallback(async () => {
    if (deviceRef.current) {
      await deviceRef.current.unregister();
      deviceRef.current.destroy();
      deviceRef.current = null;
    }
    setDeviceState('unregistered');
    setAgentStatus('offline');
    setActiveCall(null);
    setCallQueue([]);
    stopTimer();
  }, [stopTimer]);

  const acceptCall = useCallback((callInfo) => {
    callInfo.call.accept();
    setActiveCall({ ...callInfo, status: 'active', direction: 'inbound' });
    setCallQueue(prev => prev.filter(c => c.id !== callInfo.id));
    setupCallHandlers(callInfo.call);
  }, [setupCallHandlers]);

  const rejectCall = useCallback((callInfo) => {
    callInfo.call.reject();
    setCallQueue(prev => prev.filter(c => c.id !== callInfo.id));
  }, []);

  const makeCall = useCallback(async (toNumber) => {
    if (!deviceRef.current || agentStatus !== 'available') return;
    const call = await deviceRef.current.connect({
      params: { To: toNumber },
    });
    const callInfo = {
      id: call.parameters.CallSid || Date.now().toString(),
      call,
      to: toNumber,
      status: 'calling',
      direction: 'outbound',
      timestamp: new Date(),
    };
    setActiveCall(callInfo);
    setAgentStatus('busy');
    setupCallHandlers(call);
  }, [agentStatus, setupCallHandlers]);

  const hangUp = useCallback(() => {
    if (activeCall?.call) {
      activeCall.call.disconnect();
    }
    if (deviceRef.current) {
      deviceRef.current.disconnectAll();
    }
    setActiveCall(null);
    setAgentStatus(deviceState === 'registered' ? 'available' : 'offline');
    stopTimer();
  }, [activeCall, deviceState, stopTimer]);

  const toggleMute = useCallback(() => {
    if (activeCall?.call) {
      const newMuted = !isMuted;
      activeCall.call.mute(newMuted);
      setIsMuted(newMuted);
    }
  }, [activeCall, isMuted]);

  const transferCall = useCallback(async (targetIdentity) => {
    // Transfer by putting current call on hold and dialing target agent
    if (!activeCall?.call || !deviceRef.current) return;
    // Simple warm transfer: conference the target in
    try {
      const transferCall = await deviceRef.current.connect({
        params: { To: `client:${targetIdentity}` },
      });
      setupCallHandlers(transferCall);
    } catch (err) {
      console.error('Transfer error:', err);
    }
  }, [activeCall, setupCallHandlers]);

  useEffect(() => {
    return () => {
      if (deviceRef.current) {
        deviceRef.current.destroy();
      }
      stopTimer();
    };
  }, [stopTimer]);

  return {
    deviceState,
    agentStatus,
    activeCall,
    callQueue,
    error,
    isMuted,
    callDuration,
    identity,
    goOnline,
    goOffline,
    acceptCall,
    rejectCall,
    makeCall,
    hangUp,
    toggleMute,
    transferCall,
  };
}