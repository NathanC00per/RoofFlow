import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Play, Pause, X, Volume2, Clock } from "lucide-react";
import { format } from "date-fns";

export default function VoicemailPlayer({ voicemail, onClose, onStatusChange }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [notes, setNotes] = useState(voicemail?.notes || "");
  const [status, setStatus] = useState(voicemail?.status || "new");

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Voicemail from {voicemail?.caller_name || voicemail?.phone_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Audio player */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="w-12 h-12 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors flex-shrink-0"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-white" />
                  ) : (
                    <Play className="w-5 h-5 fill-white" />
                  )}
                </button>
                <div className="flex-1">
                  <div className="w-full bg-muted rounded-full h-2 cursor-pointer">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              </div>
              <audio ref={audioRef} src={voicemail?.audio_url} />
            </CardContent>
          </Card>

          {/* Voicemail info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Phone Number</p>
              <p className="font-semibold font-mono">{voicemail?.phone_number}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Route</p>
              <p className="font-semibold">{voicemail?.route_description}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Received</p>
              <p className="font-semibold">
                {format(new Date(voicemail?.received_at), "MMM d, h:mm a")}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Duration</p>
              <p className="font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatTime(voicemail?.duration_seconds || 0)}
              </p>
            </div>
          </div>

          {/* Transcription */}
          {voicemail?.transcription && (
            <div>
              <Label className="text-sm">Transcription</Label>
              <p className="mt-2 p-3 bg-muted/50 rounded text-sm leading-relaxed">
                {voicemail.transcription}
              </p>
            </div>
          )}

          {/* Status and notes */}
          <div className="space-y-4 border-t pt-4">
            <div>
              <Label htmlFor="status" className="text-sm">
                Status
              </Label>
              <Select value={status} onValueChange={(v) => setStatus(v)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="listened">Listened</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes" className="text-sm">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this voicemail..."
                className="mt-1.5 h-20"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end border-t pt-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button
              onClick={() => {
                onStatusChange(status);
                onClose();
              }}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}