import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function CallQueue({ queue, onAccept, onReject }) {
  if (queue.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8 text-sm">
        No calls waiting
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {queue.map((callInfo) => (
        <div
          key={callInfo.id}
          className="flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg animate-pulse"
        >
          <div>
            <p className="font-semibold text-sm">{callInfo.from}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(callInfo.timestamp, { addSuffix: true })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white h-8"
              onClick={() => onAccept(callInfo)}
            >
              <Phone className="w-3.5 h-3.5 mr-1" />
              Answer
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-8"
              onClick={() => onReject(callInfo)}
            >
              <PhoneOff className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}