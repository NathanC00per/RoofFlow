import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { TimesheetStatusBadge } from "@/components/shared/StatusBadge";
import PageHeader from "@/components/shared/PageHeader";
import { PlusCircle, Check, X, Clock, Pencil, Trash2, ChevronDown, ChevronUp, Star } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { calculateAllPay } from "@/lib/wageCalculator";
import { isBankHoliday, getBankHolidayName } from "@/lib/bankHolidays";

function calculateHours(clockIn, clockOut, breakMins) {
  if (!clockIn || !clockOut) return 0;
  const [hIn, mIn] = clockIn.split(":").map(Number);
  const [hOut, mOut] = clockOut.split(":").map(Number);
  const totalMins = (hOut * 60 + mOut) - (hIn * 60 + mIn) - (breakMins || 0);
  return Math.max(0, +(totalMins / 60).toFixed(2));
}

const EMPTY_FORM = {
  employee_id: "", job_id: "", date: format(new Date(), "yyyy-MM-dd"),
  clock_in: "07:00", clock_out: "15:30", break_minutes: "30", notes: ""
};

export default function Timesheets() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTs, setEditingTs] = useState(null); // timesheet being edited
  const [form, setForm] = useState(EMPTY_FORM);
  const [selected, setSelected] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [jobFilter, setJobFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const queryClient = useQueryClient();

  const { data: timesheets = [], isLoading } = useQuery({
    queryKey: ["timesheets"],
    queryFn: () => base44.entities.Timesheet.list("-date", 500),
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

  // ── Pay calculations (derived, not stored until save) ──
  const payMap = useMemo(() => calculateAllPay(timesheets, employees), [timesheets, employees]);

  // ── Mutations ──
  const saveMutation = useMutation({
    mutationFn: (data) => {
      const emp = employees.find(e => e.id === data.employee_id);
      const job = jobs.find(j => j.id === data.job_id);
      const hours = calculateHours(data.clock_in, data.clock_out, Number(data.break_minutes));
      const isHoliday = isBankHoliday(data.date || "");
      const hourlyRate = emp?.hourly_rate || 0;
      const tempId = editingTs?.id || "__new__";

      const payload = {
        ...data,
        employee_name: emp ? `${emp.first_name} ${emp.last_name}` : data.employee_name || "",
        job_address: job?.address || data.job_address || "",
        hours,
        break_minutes: Number(data.break_minutes) || 0,
        is_bank_holiday: isHoliday,
        hourly_rate: hourlyRate,
      };

      // Recalculate pay in context of the full employee week
      const allForEmployee = [
        ...timesheets.filter(t => t.employee_id === data.employee_id && t.id !== tempId),
        { ...payload, id: tempId }
      ];
      const weekPayMap = calculateAllPay(allForEmployee, employees);
      const payDetails = weekPayMap.get(tempId) || {};
      Object.assign(payload, payDetails);

      if (editingTs) return base44.entities.Timesheet.update(editingTs.id, payload);
      return base44.entities.Timesheet.create({ ...payload, status: "pending" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
      toast.success(editingTs ? "Entry updated!" : "Time logged!");
      closeDialog();
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Timesheet.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
      toast.success("Status updated!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Timesheet.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["timesheets"] }),
  });

  // ── Bulk actions ──
  const bulkApprove = async () => {
    await Promise.all([...selected].map(id => base44.entities.Timesheet.update(id, { status: "approved" })));
    queryClient.invalidateQueries({ queryKey: ["timesheets"] });
    toast.success(`${selected.size} entries approved`);
    setSelected(new Set());
  };

  const bulkReject = async () => {
    await Promise.all([...selected].map(id => base44.entities.Timesheet.update(id, { status: "rejected" })));
    queryClient.invalidateQueries({ queryKey: ["timesheets"] });
    toast.success(`${selected.size} entries rejected`);
    setSelected(new Set());
  };

  const bulkDelete = async () => {
    await Promise.all([...selected].map(id => base44.entities.Timesheet.delete(id)));
    queryClient.invalidateQueries({ queryKey: ["timesheets"] });
    toast.success(`${selected.size} entries deleted`);
    setSelected(new Set());
  };

  // ── Dialog helpers ──
  const openCreate = () => {
    setEditingTs(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (ts) => {
    setEditingTs(ts);
    setForm({
      employee_id: ts.employee_id || "",
      job_id: ts.job_id || "",
      date: ts.date || format(new Date(), "yyyy-MM-dd"),
      clock_in: ts.clock_in || "",
      clock_out: ts.clock_out || "",
      break_minutes: String(ts.break_minutes || 0),
      notes: ts.notes || "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditingTs(null); setForm(EMPTY_FORM); };
  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  // ── Filtering ──
  const filtered = useMemo(() => timesheets.filter(t => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (employeeFilter !== "all" && t.employee_id !== employeeFilter) return false;
    if (jobFilter !== "all" && t.job_id !== jobFilter) return false;
    if (dateFrom && t.date < dateFrom) return false;
    if (dateTo && t.date > dateTo) return false;
    return true;
  }), [timesheets, statusFilter, employeeFilter, jobFilter, dateFrom, dateTo]);

  const totalHours = filtered.reduce((s, t) => s + (t.hours || 0), 0);
  const totalWageCost = filtered.reduce((s, t) => {
    const pay = payMap.get(t.id);
    return s + (pay?.wage_cost ?? t.wage_cost ?? 0);
  }, 0);
  const fmt = (n) => "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Selection helpers ──
  const allSelected = filtered.length > 0 && filtered.every(t => selected.has(t.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map(t => t.id)));
  };
  const toggleOne = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const activeFilterCount = [
    statusFilter !== "all", employeeFilter !== "all", jobFilter !== "all", !!dateFrom, !!dateTo
  ].filter(Boolean).length;

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <PageHeader title="Timesheets" subtitle={`${filtered.length} entries · ${totalHours.toFixed(1)} hrs · ${fmt(totalWageCost)} total labour cost`}>
        <Button onClick={openCreate}><PlusCircle className="w-4 h-4 mr-2" /> Log Time</Button>
      </PageHeader>

      {/* Filter bar */}
      <div className="mb-4">
        <Button variant="outline" size="sm" onClick={() => setShowFilters(v => !v)} className="gap-2">
          {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          Filters {activeFilterCount > 0 && <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 leading-none">{activeFilterCount}</span>}
        </Button>

        {showFilters && (
          <div className="mt-3 p-4 border rounded-lg bg-muted/30 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Employee</Label>
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Job</Label>
              <Select value={jobFilter} onValueChange={setJobFilter}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Jobs</SelectItem>
                  {jobs.map(j => <SelectItem key={j.id} value={j.id}>{j.customer_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs" />
            </div>
            {activeFilterCount > 0 && (
              <div className="flex items-end col-span-2 md:col-span-1">
                <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => { setStatusFilter("all"); setEmployeeFilter("all"); setJobFilter("all"); setDateFrom(""); setDateTo(""); }}>
                  Clear all
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-lg">
          <span className="text-sm font-medium text-primary">{selected.size} selected</span>
          <div className="flex gap-2 ml-auto">
            <Button size="sm" variant="outline" className="text-green-700 border-green-300 h-7 text-xs" onClick={bulkApprove}>
              <Check className="w-3 h-3 mr-1" /> Approve
            </Button>
            <Button size="sm" variant="outline" className="text-destructive border-destructive/30 h-7 text-xs" onClick={bulkReject}>
              <X className="w-3 h-3 mr-1" /> Reject
            </Button>
            <Button size="sm" variant="outline" className="text-destructive border-destructive/30 h-7 text-xs" onClick={bulkDelete}>
              <Trash2 className="w-3 h-3 mr-1" /> Delete
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <Card><CardContent className="text-center py-16 text-muted-foreground">No timesheet entries found</CardContent></Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Job Site</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>OT Hrs</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Labour Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(ts => {
                  const pay = payMap.get(ts.id);
                  const wageCost = pay?.wage_cost ?? ts.wage_cost;
                  const otHours = pay?.overtime_hours ?? ts.overtime_hours ?? 0;
                  const isHoliday = pay?.is_bank_holiday ?? ts.is_bank_holiday ?? false;
                  const rate = pay?.hourly_rate ?? ts.hourly_rate;
                  return (
                   <TableRow key={ts.id} className={selected.has(ts.id) ? "bg-primary/5" : ""}>
                     <TableCell>
                       <Checkbox checked={selected.has(ts.id)} onCheckedChange={() => toggleOne(ts.id)} />
                     </TableCell>
                     <TableCell className="font-medium text-sm">{ts.employee_name || "—"}</TableCell>
                     <TableCell className="text-sm">
                       <div className="flex items-center gap-1.5">
                         {ts.date ? format(new Date(ts.date), "MMM d, yyyy") : "—"}
                         {isHoliday && (
                           <span title={getBankHolidayName(ts.date)} className="inline-flex items-center gap-0.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-1 py-0.5">
                             <Star className="w-2.5 h-2.5" /> BH
                           </span>
                         )}
                       </div>
                     </TableCell>
                     <TableCell className="text-sm text-muted-foreground truncate max-w-[120px]">{ts.job_address || "—"}</TableCell>
                     <TableCell className="text-sm">{ts.clock_in || "—"}</TableCell>
                     <TableCell className="text-sm">{ts.clock_out || "—"}</TableCell>
                     <TableCell className="text-sm font-semibold">{ts.hours?.toFixed(1) || "—"}</TableCell>
                     <TableCell className="text-sm">
                       {otHours > 0
                         ? <span className="text-orange-600 font-medium">{otHours.toFixed(1)}h</span>
                         : <span className="text-muted-foreground">—</span>}
                     </TableCell>
                     <TableCell className="text-sm text-muted-foreground">
                       {rate ? `$${rate}/hr` : "—"}
                     </TableCell>
                     <TableCell className="text-sm font-semibold">
                       {wageCost != null
                         ? <span className={isHoliday || otHours > 0 ? "text-amber-700" : ""}>{fmt(wageCost)}</span>
                         : <span className="text-muted-foreground text-xs">No rate set</span>}
                     </TableCell>
                     <TableCell><TimesheetStatusBadge status={ts.status} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(ts)}>
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                        {ts.status === "pending" && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => statusMutation.mutate({ id: ts.id, status: "approved" })}>
                              <Check className="w-3.5 h-3.5 text-green-600" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => statusMutation.mutate({ id: ts.id, status: "rejected" })}>
                              <X className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate(ts.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive/60" />
                        </Button>
                        </div>
                        </TableCell>
                        </TableRow>
                        );
                        })}
                        </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-4 h-4" /> {editingTs ? "Edit Time Entry" : "Log Time Entry"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
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
                  {jobs.map(j => (
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
            {form.clock_in && form.clock_out && (() => {
              const emp = employees.find(e => e.id === form.employee_id);
              const hours = calculateHours(form.clock_in, form.clock_out, Number(form.break_minutes));
              const isHoliday = isBankHoliday(form.date || "");
              const tempId = editingTs?.id || "__new__";
              const allForEmp = [
                ...timesheets.filter(t => t.employee_id === form.employee_id && t.id !== tempId),
                { employee_id: form.employee_id, id: tempId, date: form.date, hours, is_bank_holiday: isHoliday }
              ];
              const previewMap = calculateAllPay(allForEmp, employees);
              const preview = previewMap.get(tempId);
              return (
                <div className="text-xs bg-muted/50 rounded px-3 py-2 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hours</span>
                    <strong>{hours.toFixed(2)}h</strong>
                  </div>
                  {isHoliday && (
                    <div className="flex justify-between text-amber-700">
                      <span className="flex items-center gap-1"><Star className="w-3 h-3" /> Bank Holiday (x1.5)</span>
                      <strong>{hours.toFixed(2)}h</strong>
                    </div>
                  )}
                  {preview?.overtime_hours > 0 && (
                    <div className="flex justify-between text-orange-700">
                      <span>Overtime (x1.5)</span>
                      <strong>{preview.overtime_hours.toFixed(2)}h</strong>
                    </div>
                  )}
                  {preview?.wage_cost != null ? (
                    <div className="flex justify-between border-t pt-1 font-semibold">
                      <span>Est. Labour Cost</span>
                      <span>{fmt(preview.wage_cost)}</span>
                    </div>
                  ) : emp && !emp.hourly_rate ? (
                    <div className="text-amber-600">No hourly rate set for this employee</div>
                  ) : null}
                </div>
              );
            })()}
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => update("notes", e.target.value)} rows={2} />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending || !form.employee_id || !form.job_id}>
                {editingTs ? "Save Changes" : "Log Time"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}