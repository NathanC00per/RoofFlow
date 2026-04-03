import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Mic, MicOff, PhoneForwarded } from "lucide-react";

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function CallControls({ activeCall, isMuted, callDuration, onHangUp, onToggleMute, onTransfer }) {
  if (!activeCall) return null;

  const label = activeCall.direction === 'outbound'
    ? `Calling ${activeCall.to}`
    : `Call from ${activeCall.from}`;

  return (
    <div className="bg-green-900/20 border border-green-700/40 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-green-400">{activeCall.status === 'calling' ? '📞 Dialing...' : '🟢 Active Call'}</p>
          <p className="text-base font-bold text-foreground">{label}</p>
        </div>
        <p className="text-xl font-mono font-bold text-green-400">{formatDuration(callDuration)}</p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleMute}
          className={isMuted ? 'border-yellow-500 text-yellow-500' : ''}
        >
          {isMuted ? <MicOff className="w-4 h-4 mr-1" /> : <Mic className="w-4 h-4 mr-1" />}
          {isMuted ? 'Unmute' : 'Mute'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onTransfer}
        >
          <PhoneForwarded className="w-4 h-4 mr-1" />
          Transfer
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={onHangUp}
          className="ml-auto"
        >
          <PhoneOff className="w-4 h-4 mr-1" />
          Hang Up
        </Button>
      </div>
    </div>
  );
}