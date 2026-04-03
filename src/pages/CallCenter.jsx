import { useState } from "react";
import { useCallCenter } from "@/components/callcenter/useCallCenter";
import CallControls from "@/components/callcenter/CallControls";
import CallQueue from "@/components/callcenter/CallQueue";
import Dialer from "@/components/callcenter/Dialer";
import TransferModal from "@/components/callcenter/TransferModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhoneCall, PhoneOff, Radio, AlertCircle, Phone, Users, Headphones } from "lucide-react";

const STATUS_COLORS = {
  offline: 'bg-slate-500',
  available: 'bg-green-500',
  busy: 'bg-red-500',
};

const STATUS_LABELS = {
  offline: 'Offline',
  available: 'Available',
  busy: 'On a Call',
};

const DEVICE_LABELS = {
  unregistered: 'Disconnected',
  registering: 'Connecting...',
  registered: 'Connected',
  error: 'Error',
};

export default function CallCenter() {
  const {
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
  } = useCallCenter();

  const [showTransfer, setShowTransfer] = useState(false);

  const isOnline = deviceState === 'registered';
  const isConnecting = deviceState === 'registering';

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Headphones className="w-6 h-6 text-primary" />
            Call Center
          </h1>
          {identity && (
            <p className="text-sm text-muted-foreground mt-0.5">Agent: {identity}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[agentStatus]}`} />
            <span className="text-sm font-medium">{STATUS_LABELS[agentStatus]}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {DEVICE_LABELS[deviceState]}
          </Badge>
          {!isOnline ? (
            <Button
              onClick={goOnline}
              disabled={isConnecting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Radio className="w-4 h-4 mr-2" />
              {isConnecting ? 'Connecting...' : 'Go Online'}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={goOffline}
              disabled={!!activeCall}
            >
              <PhoneOff className="w-4 h-4 mr-2" />
              Go Offline
            </Button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Setup Required</p>
            <p>{error}</p>
            {error.includes('TWILIO_TWIML_APP_SID') && (
              <p className="mt-1 text-xs opacity-80">
                1. Go to Twilio Console → Voice → TwiML Apps → Create new app.<br/>
                2. Set the Voice URL to your <code className="bg-black/10 px-1 rounded">callCenterVoice</code> function URL.<br/>
                3. Copy the TwiML App SID and add it as secret <code className="bg-black/10 px-1 rounded">TWILIO_TWIML_APP_SID</code>.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-4">
          {/* Active call */}
          {activeCall && (
            <CallControls
              activeCall={activeCall}
              isMuted={isMuted}
              callDuration={callDuration}
              onHangUp={hangUp}
              onToggleMute={toggleMute}
              onTransfer={() => setShowTransfer(true)}
            />
          )}

          {/* Incoming queue */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Incoming Queue
                {callQueue.length > 0 && (
                  <Badge className="bg-yellow-500 text-white ml-auto">{callQueue.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CallQueue
                queue={callQueue}
                onAccept={acceptCall}
                onReject={rejectCall}
              />
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-primary">{callQueue.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Queued</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-500">{activeCall ? 1 : 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Active</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${isOnline ? 'text-green-500' : 'text-slate-400'}`}>
                  {isOnline ? '●' : '○'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{isOnline ? 'Online' : 'Offline'}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right column: Dialer */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PhoneCall className="w-4 h-4" />
              Outbound Dialer
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!isOnline ? (
              <div className="text-center text-muted-foreground py-8 text-sm">
                Go online to make calls
              </div>
            ) : (
              <Dialer
                onCall={makeCall}
                disabled={!!activeCall || agentStatus === 'busy'}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transfer Modal */}
      <TransferModal
        open={showTransfer}
        onClose={() => setShowTransfer(false)}
        onTransfer={transferCall}
      />
    </div>
  );
}