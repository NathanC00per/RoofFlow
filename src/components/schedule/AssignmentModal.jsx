import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { X, User, Clock, Briefcase, Mail, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { createNotification } from "@/hooks/useNotifications";

const JOB_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#64748b"
];

export default function AssignmentModal({ open, onClose, date, existingEntry, jobs, onSave }) {
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [notes, setNotes] = useState("");
  const [color, setColor] = useState(JOB_COLORS[0]);
  const [sending, setSending] = useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const activeEmployees = employees.filter(e => e.status === "active");
  const availableJobs = jobs.filter(j => ["approved", "scheduled", "in_progress", "lead", "estimate_sent"].includes(j.status));

  useEffect(() => {
    if (existingEntry) {
      setSelectedJob(jobs.find(j => j.id === existingEntry.job_id) || null);
      setSelectedEmployees(existingEntry.employee_ids || []);
      setStartTime(existingEntry.start_time || "08:00");
      setEndTime(existingEntry.end_time || "17:00");
      setNotes(existingEntry.notes || "");
      setColor(existingEntry.color || JOB_COLORS[0]);
    } else {
      setSelectedJob(null);
      setSelectedEmployees([]);
      setStartTime("08:00");
      setEndTime("17:00");
      setNotes("");
      setColor(JOB_COLORS[0]);
    }
  }, [existingEntry, open]);

  function toggleEmployee(empId) {
    setSelectedEmployees(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  }

  async function handleSave() {
    if (!selectedJob) { toast.error("Please select a job"); return; }
    setSending(true);
    const assignedEmps = employees.filter(e => selectedEmployees.includes(e.id));
    const empNames = assignedEmps.map(e => `${e.first_name} ${e.last_name}`);

    const payload = {
      job_id: selectedJob.id,
      job_address: selectedJob.address,
      customer_name: selectedJob.customer_name,
      employee_ids: selectedEmployees,
      employee_names: empNames,
      date: format(date, "yyyy-MM-dd"),
      start_time: startTime,
      end_time: endTime,
      notes,
      color,
      status: "scheduled",
    };

    await onSave(payload, existingEntry?.id);

    // Send in-app notifications + emails to assigned crew
    const dateStr = format(date, "EEEE, MMMM d, yyyy");
    for (const emp of assignedEmps) {
      // In-app notification
      createNotification({
        user_email: emp.email,
        type: "job_assigned",
        title: `You've been scheduled: ${selectedJob.customer_name}`,
        message: `You are assigned to ${selectedJob.address} on ${dateStr} from ${startTime} to ${endTime}.`,
        link: `/schedule`,
        related_id: selectedJob.id,
      }).catch(() => {});

      // Email notification
      if (emp.email) {
        base44.integrations.Core.SendEmail({
          to: emp.email,
          subject: `You've been scheduled – ${selectedJob.customer_name} on ${dateStr}`,
          body: `Hi ${emp.first_name},\n\nYou have been assigned to a job:\n\nCustomer: ${selectedJob.customer_name}\nAddress: ${selectedJob.address}\nDate: ${dateStr}\nTime: ${startTime} – ${endTime}${notes ? `\nNotes: ${notes}` : ""}\n\nPlease log in to RoofPro for full details.\n\nThanks,\nRoofPro`,
        }).catch(() => {});
      }
    }

    toast.success(`Scheduled! Notifications sent to ${assignedEmps.length} crew member${assignedEmps.length !== 1 ? "s" : ""}.`);
    setSending(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            {existingEntry ? "Edit Assignment" : "Schedule Crew"}
            {date && <span className="text-sm font-normal text-muted-foreground ml-1">— {format(date, "EEE, MMM d")}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Job selector */}
          <div>
            <Label className="mb-1.5 block">Job *</Label>
            <div className="max-h-40 overflow-y-auto border border-input rounded-lg divide-y divide-border">
              {availableJobs.length === 0 && (
                <p className="text-sm text-muted-foreground p-3">No eligible jobs found.</p>
              )}
              {availableJobs.map(job => (
                <button
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  className={`w-full text-left px-3 py-2.5 text-sm transition-colors hover:bg-muted/50 ${selectedJob?.id === job.id ? "bg-primary/5 border-l-2 border-primary" : ""}`}
                >
                  <p className="font-medium">{job.customer_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{job.address}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block flex items-center gap-1"><Clock className="w-3 h-3" /> Start</Label>
              <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block flex items-center gap-1"><Clock className="w-3 h-3" /> End</Label>
              <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>

          {/* Crew */}
          <div>
            <Label className="mb-1.5 block flex items-center gap-1"><User className="w-3 h-3" /> Assign Crew</Label>
            <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
              {activeEmployees.map(emp => {
                const selected = selectedEmployees.includes(emp.id);
                return (
                  <button
                    key={emp.id}
                    onClick={() => toggleEmployee(emp.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left text-sm transition-all ${
                      selected ? "border-primary bg-primary/5 text-primary" : "border-input hover:bg-muted/50"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${selected ? "bg-primary text-white" : "bg-muted"}`}>
                      {emp.first_name?.[0]}{emp.last_name?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate text-xs">{emp.first_name} {emp.last_name}</p>
                      <p className="text-muted-foreground text-xs capitalize truncate">{emp.role?.replace("_", " ")}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedEmployees.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email notifications will be sent to {selectedEmployees.length} crew member{selectedEmployees.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          {/* Color */}
          <div>
            <Label className="mb-1.5 block">Colour</Label>
            <div className="flex gap-2 flex-wrap">
              {JOB_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full transition-transform ${color === c ? "scale-125 ring-2 ring-offset-2 ring-foreground/30" : ""}`}
                />
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="mb-1.5 block">Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any instructions for the crew…" className="h-20" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={sending || !selectedJob}>
            {sending && <Loader2 className="w-4 h-4 animate-spin" />}
            {existingEntry ? "Update" : "Schedule & Notify"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}