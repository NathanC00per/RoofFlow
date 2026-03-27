import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { TimesheetStatusBadge } from "@/components/shared/StatusBadge";
import PageHeader from "@/components/shared/PageHeader";
import { PlusCircle, Check, X, Clock, Filter } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

function calculateHours(clockIn, clockOut, breakMins) {
  if (!clockIn || !clockOut) return 0;
  const [hIn, mIn] = clockIn.split(":").map(Number);
  const [hOut, mOut] = clockOut.split(":").map(Number);
  const totalMins = (hOut * 60 + mOut) - (hIn * 60 + mIn) - (breakMins || 0);
  return Math.max(0, +(totalMins / 60).toFixed(2));
}

export default function Timesheets() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: timesheets = [], isLoading } = useQuery({
    queryKey: ["timesheets"],
    queryFn: () => base44.entities.Timesheet.list("-date", 200),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.Job.list(),
  });

  const activeEmployees = employees.filter(e => e.status === "active");
  const activeJobs = jobs.filter(j => !["completed", "cancelled"].includes(j.status));

  const [form, setForm] = useState({
    employee_id: "", job_id: "", date: format(new Date(), "yyyy-MM-dd"),
    clock_in: "07:00", clock_out: "15:30", break_minutes: "30", notes: ""
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      const emp = employees.find(e => e.id === data.employee_id);
      const job = jobs.find(j => j.id === data.job_id);
      const hours = calculateHours(data.clock_in, data.clock_out, Number(data.break_minutes));
      return base44.entities.Timesheet.create({
        ...data,
        employee_name: emp ? `${emp.first_name} ${emp.last_name}` : "",
        job_address: job?.address || "",
        hours,
        break_minutes: Number(data.break_minutes) || 0,
        status: "pending",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
      toast.success("Timesheet entry added!");
      setDialogOpen(false);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Timesheet.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
      toast.success("Status updated!");
    },
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const filtered = timesheets.filter(t => statusFilter === "all" || t.status === statusFilter);

  const totalHours = filtered.reduce((sum, t) => sum + (t.hours || 0), 0);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <PageHeader title="Timesheets" subtitle={`${timesheets.length} entries • ${totalHours.toFixed(1)} total hours`}>
        <Button onClick={() => setDialogOpen(true)}><PlusCircle className="w-4 h-4 mr-2" /> Log Time</Button>
      </PageHeader>

      {/* Filter */}
      <div className="flex gap-3 mb-6">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <Filter className="w-3.5 h-3.5 mr-2" />
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="text-center py-16 text-muted-foreground">No timesheet entries found</CardContent></Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Job Site</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Break</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(ts => (
                  <TableRow key={ts.id}>
                    <TableCell className="font-medium text-sm">{ts.employee_name || "—"}</TableCell>
                    <TableCell className="text-sm">{ts.date ? format(new Date(ts.date), "MMM d, yyyy") : "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[150px]">{ts.job_address || "—"}</TableCell>
                    <TableCell className="text-sm">{ts.clock_in || "—"}</TableCell>
                    <TableCell className="text-sm">{ts.clock_out || "—"}</TableCell>
                    <TableCell className="text-sm">{ts.break_minutes || 0}m</TableCell>
                    <TableCell className="text-sm font-semibold">{ts.hours?.toFixed(1) || "—"}</TableCell>
                    <TableCell><TimesheetStatusBadge status={ts.status} /></TableCell>
                    <TableCell>
                      {ts.status === "pending" && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => statusMutation.mutate({ id: ts.id, status: "approved" })}>
                            <Check className="w-3.5 h-3.5 text-green-600" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => statusMutation.mutate({ id: ts.id, status: "rejected" })}>
                            <X className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Log Time Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Clock className="w-4 h-4" /> Log Time Entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Employee *</Label>
              <Select value={form.employee_id} onValueChange={v => update("employee_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {activeEmployees.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Job *</Label>
              <Select value={form.job_id} onValueChange={v => update("job_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select job" /></SelectTrigger>
                <SelectContent>
                  {activeJobs.map(j => (
                    <SelectItem key={j.id} value={j.id}>{j.customer_name} — {j.address}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={e => update("date", e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Clock In</Label>
                <Input type="time" value={form.clock_in} onChange={e => update("clock_in", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Clock Out</Label>
                <Input type="time" value={form.clock_out} onChange={e => update("clock_out", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Break (min)</Label>
                <Input type="number" value={form.break_minutes} onChange={e => update("break_minutes", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => update("notes", e.target.value)} rows={2} />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || !form.employee_id || !form.job_id}>Log Time</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}