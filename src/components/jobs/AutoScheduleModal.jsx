import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Users, Loader2, CheckCircle2 } from "lucide-react";
import { addDays, format, isWeekend } from "date-fns";
import { toast } from "sonner";
import { createNotification } from "@/hooks/useNotifications";

// Returns the next N working days (Mon–Fri) starting from startDate
function getWorkingDays(startDate, count) {
  const days = [];
  let cursor = new Date(startDate);
  while (days.length < count) {
    if (!isWeekend(cursor)) days.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }
  return days;
}

export default function AutoScheduleModal({ open, onClose, job }) {
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [durationDays, setDurationDays] = useState(() => job?.duration_days || 1);
  const [crewRequired, setCrewRequired] = useState(() => job?.crew_required || 2);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [saving, setSaving] = useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const activeEmployees = employees.filter(e => e.status === "active");

  function toggleEmployee(id) {
    setSelectedEmployees(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  const workingDays = startDate ? getWorkingDays(new Date(startDate + "T00:00:00"), Number(durationDays) || 1) : [];
  const assignedEmps = activeEmployees.filter(e => selectedEmployees.includes(e.id));
  const empNames = assignedEmps.map(e => `${e.first_name} ${e.last_name}`);

  async function handleSchedule() {
    if (!startDate) { toast.error("Please pick a start date"); return; }
    if (selectedEmployees.length === 0) { toast.error("Please assign at least one crew member"); return; }
    setSaving(true);
    try {
      // Create a schedule entry for each working day
      await Promise.all(
        workingDays.map(day =>
          base44.entities.Schedule.create({
            job_id: job.id,
            job_address: job.address,
            customer_name: job.customer_name,
            employee_ids: selectedEmployees,
            employee_names: empNames,
            date: format(day, "yyyy-MM-dd"),
            start_time: startTime,
            end_time: endTime,
            notes: `Auto-scheduled (${durationDays} day job, ${crewRequired} crew required)`,
            color: "#3b82f6",
            status: "scheduled",
          })
        )
      );

      // Update the job with start/end dates and status
      const lastDay = workingDays[workingDays.length - 1];
      await base44.entities.Job.update(job.id, {
        start_date: format(workingDays[0], "yyyy-MM-dd"),
        end_date: format(lastDay, "yyyy-MM-dd"),
        status: "scheduled",
      });

      // Notify assigned crew
      for (const emp of assignedEmps) {
        createNotification({
          user_email: emp.email,
          type: "job_assigned",
          title: `Scheduled: ${job.customer_name}`,
          message: `You are assigned to ${job.address} starting ${format(workingDays[0], "EEE, MMM d")} for ${durationDays} day${durationDays > 1 ? "s" : ""}.`,
          link: `/schedule`,
          related_id: job.id,
        }).catch(() => {});

        if (emp.email) {
          base44.integrations.Core.SendEmail({
            to: emp.email,
            subject: `Job Scheduled – ${job.customer_name}`,
            body: `Hi ${emp.first_name},\n\nYou have been scheduled for the following job:\n\nCustomer: ${job.customer_name}\nAddress: ${job.address}\nStart Date: ${format(workingDays[0], "EEE, MMM d, yyyy")}\nEnd Date: ${format(lastDay, "EEE, MMM d, yyyy")}\nDuration: ${durationDays} working day${durationDays > 1 ? "s" : ""}\nHours: ${startTime} – ${endTime}\n\nPlease log in to the platform for full details.\n\nThanks,\nDC&S Roofing`,
          }).catch(() => {});
        }
      }

      queryClient.invalidateQueries({ queryKey: ["job", job.id] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      queryClient.invalidateQueries({ queryKey: ["schedules", job.id] });

      toast.success(`Scheduled ${durationDays} day${durationDays > 1 ? "s" : ""} across ${workingDays.length} working day${workingDays.length > 1 ? "s" : ""} — crew notified!`);
      onClose();
    } catch (err) {
      toast.error("Scheduling failed: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            Auto-Schedule Job
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {job.customer_name} · {job.address}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Start date */}
          <div className="space-y-1.5">
            <Label>Start Date *</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>

          {/* Duration + crew */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Duration (working days)</Label>
              <Input
                type="number" min="1" max="90"
                value={durationDays}
                onChange={e => setDurationDays(Math.max(1, Number(e.target.value)))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Crew Required</Label>
              <Input
                type="number" min="1" max="20"
                value={crewRequired}
                onChange={e => setCrewRequired(Math.max(1, Number(e.target.value)))}
              />
            </div>
          </div>

          {/* Hours */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Time</Label>
              <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End Time</Label>
              <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>

          {/* Preview */}
          {workingDays.length > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-semibold text-primary">Schedule Preview</p>
              <div className="flex flex-wrap gap-1.5">
                {workingDays.map(d => (
                  <Badge key={d.toISOString()} variant="outline" className="text-xs">
                    {format(d, "EEE d MMM")}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{workingDays.length} working day{workingDays.length > 1 ? "s" : ""} · {crewRequired} crew required</p>
            </div>
          )}

          {/* Assign crew */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Assign Crew
              {selectedEmployees.length > 0 && (
                <span className="text-xs text-muted-foreground">({selectedEmployees.length} selected)</span>
              )}
            </Label>
            {selectedEmployees.length < crewRequired && selectedEmployees.length > 0 && (
              <p className="text-xs text-amber-600">⚠ You've required {crewRequired} crew but only assigned {selectedEmployees.length}.</p>
            )}
            <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
              {activeEmployees.map(emp => {
                const selected = selectedEmployees.includes(emp.id);
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => toggleEmployee(emp.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left text-sm transition-all ${
                      selected ? "border-primary bg-primary/5 text-primary" : "border-input hover:bg-muted/50"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${selected ? "bg-primary text-white" : "bg-muted"}`}>
                      {selected ? <CheckCircle2 className="w-3.5 h-3.5" /> : `${emp.first_name?.[0]}${emp.last_name?.[0]}`}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate text-xs">{emp.first_name} {emp.last_name}</p>
                      <p className="text-muted-foreground text-xs capitalize truncate">{emp.role?.replace("_", " ")}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSchedule} disabled={saving || !startDate || selectedEmployees.length === 0}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CalendarDays className="w-4 h-4 mr-2" />}
            Schedule & Notify
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}