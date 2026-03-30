import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Clock } from "lucide-react";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun" };

export default function AfterHoursConfig({ form, setForm }) {
  const [expandedDay, setExpandedDay] = useState(null);

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-slate-50">
      <div className="flex items-center gap-2 mb-4">
        <Checkbox
          id="after_hours"
          checked={form.after_hours_enabled || false}
          onCheckedChange={(checked) => setForm({ ...form, after_hours_enabled: checked })}
        />
        <Label htmlFor="after_hours" className="text-sm font-semibold cursor-pointer flex items-center gap-2">
          <Clock className="w-4 h-4" /> Enable After-Hours Handling
        </Label>
      </div>

      {form.after_hours_enabled && (
        <div className="space-y-4">
          {/* Business Hours */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Business Hours</Label>
            <div className="space-y-2">
              {DAYS.map((day) => {
                const dayConfig = form.business_hours?.[day] || { enabled: true, start_time: "09:00", end_time: "17:00" };
                const isExpanded = expandedDay === day;

                return (
                  <div key={day} className="border rounded bg-white">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between p-3 hover:bg-muted/40 transition-colors"
                      onClick={() => setExpandedDay(isExpanded ? null : day)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Checkbox
                          checked={dayConfig.enabled}
                          onCheckedChange={(checked) => {
                            const newHours = { ...form.business_hours };
                            if (!newHours[day]) newHours[day] = {};
                            newHours[day].enabled = checked;
                            setForm({ ...form, business_hours: newHours });
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="font-medium w-12 text-sm capitalize">{DAY_LABELS[day]}</span>
                        {dayConfig.enabled && (
                          <span className="text-xs text-muted-foreground">
                            {dayConfig.start_time} – {dayConfig.end_time}
                          </span>
                        )}
                        {!dayConfig.enabled && (
                          <span className="text-xs text-muted-foreground italic">Closed</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{isExpanded ? "▼" : "▶"}</span>
                    </button>

                    {isExpanded && dayConfig.enabled && (
                      <div className="px-4 py-3 border-t flex gap-3 bg-slate-50">
                        <Input
                          type="time"
                          value={dayConfig.start_time}
                          onChange={(e) => {
                            const newHours = { ...form.business_hours };
                            if (!newHours[day]) newHours[day] = {};
                            newHours[day].start_time = e.target.value;
                            setForm({ ...form, business_hours: newHours });
                          }}
                          className="h-8 text-sm"
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                          type="time"
                          value={dayConfig.end_time}
                          onChange={(e) => {
                            const newHours = { ...form.business_hours };
                            if (!newHours[day]) newHours[day] = {};
                            newHours[day].end_time = e.target.value;
                            setForm({ ...form, business_hours: newHours });
                          }}
                          className="h-8 text-sm"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* After-Hours Mode */}
          <div className="space-y-2 pt-4 border-t">
            <Label className="text-sm font-semibold">After-Hours Handling</Label>
            <Select value={form.after_hours_mode || "voicemail"} onValueChange={(v) => setForm({ ...form, after_hours_mode: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="voicemail">Play Voicemail Message</SelectItem>
                <SelectItem value="forward">Forward to Number</SelectItem>
                <SelectItem value="emergency">Emergency Line</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mode-specific fields */}
          {form.after_hours_mode === "voicemail" && (
            <div className="space-y-2">
              <Label htmlFor="msg" className="text-sm">Voicemail Message</Label>
              <Textarea
                id="msg"
                value={form.after_hours_message || ""}
                onChange={(e) => setForm({ ...form, after_hours_message: e.target.value })}
                placeholder="Thank you for calling. Our office is closed. Please leave a message..."
                className="h-20 text-sm"
              />
              <p className="text-xs text-muted-foreground">Callers will hear this message and can leave a voicemail.</p>
            </div>
          )}

          {form.after_hours_mode === "forward" && (
            <div className="space-y-2">
              <Label htmlFor="fwd" className="text-sm">Forward Number</Label>
              <Input
                id="fwd"
                value={form.after_hours_forward_number || ""}
                onChange={(e) => setForm({ ...form, after_hours_forward_number: e.target.value })}
                placeholder="+353 87 123 4567"
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">Calls will be forwarded to this number outside business hours.</p>
            </div>
          )}

          {form.after_hours_mode === "emergency" && (
            <div className="space-y-2">
              <Label htmlFor="emerg" className="text-sm">Emergency Contact Number</Label>
              <Input
                id="emerg"
                value={form.after_hours_emergency_number || ""}
                onChange={(e) => setForm({ ...form, after_hours_emergency_number: e.target.value })}
                placeholder="+353 87 999 9999"
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">Emergency contacts will be routed to this number.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}