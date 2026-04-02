import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JobStatusBadge, PriorityBadge } from "@/components/shared/StatusBadge";
import PageHeader from "@/components/shared/PageHeader";
import {
  Pencil, Trash2, MapPin, Phone, Mail, Calendar, DollarSign,
  ArrowLeft, FileText, Link2, Printer, Wrench
} from "lucide-react";
import JobsMap from "@/components/maps/JobsMap";
import JobFinancials from "@/components/jobs/JobFinancials";
import JobWorkforce from "@/components/jobs/JobWorkforce";
import JobRoofAssessment from "@/components/jobs/JobRoofAssessment";
import JobLineItems from "@/components/jobs/JobLineItems";
import CustomFieldsDisplay from "@/components/jobs/CustomFieldsDisplay";
import JobScheduleCard from "@/components/jobs/JobScheduleCard";
import JobPhotos from "@/components/jobs/JobPhotos";
import JobPlanOfAction from "@/components/jobs/JobPlanOfAction";
import { generateCrewSheetPDF } from "@/lib/generateCrewSheet";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { createNotification } from "@/hooks/useNotifications";
import SmsButton from "@/components/sms/SmsButton";

const JOB_TYPE_LABELS = {
  new_roof: "New Roof", repair: "Repair", inspection: "Inspection",
  gutter: "Gutter", siding: "Siding", other: "Other"
};

const STATUSES = [
  { value: "lead", label: "Lead" },
  { value: "estimate_scheduled", label: "Estimate Scheduled" },
  { value: "estimate_sent", label: "Estimate Sent" },
  { value: "approved", label: "Approved" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function JobDetail() {
  const jobId = window.location.pathname.split("/jobs/")[1];
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: job, isLoading } = useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => {
      const jobs = await base44.entities.Job.filter({ id: jobId });
      return jobs[0];
    },
    enabled: !!jobId,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list(),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list(),
  });

  const { data: timesheets = [] } = useQuery({
    queryKey: ["timesheets"],
    queryFn: () => base44.entities.Timesheet.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: estimates = [] } = useQuery({
    queryKey: ["estimates"],
    queryFn: () => base44.entities.Estimate.list(),
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ["schedules", jobId],
    queryFn: () => base44.entities.Schedule.filter({ job_id: jobId }),
    enabled: !!jobId,
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus) => base44.entities.Job.update(jobId, { status: newStatus }),
    onSuccess: async (_, newStatus) => {
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Status updated!");
      // Notify all users about the status change
      const statusLabel = STATUSES.find(s => s.value === newStatus)?.label || newStatus;
      const users = await base44.entities.User.list().catch(() => []);
      for (const u of users) {
        createNotification({
          user_email: u.email,
          type: "job_status",
          title: `Job status updated: ${job?.customer_name}`,
          message: `Status changed to "${statusLabel}" for job at ${job?.address || "unknown address"}`,
          link: `/jobs/${jobId}`,
          related_id: jobId,
        }).catch(() => {});
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Job.delete(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job deleted");
      navigate("/jobs");
    },
  });

  if (isLoading || !job) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const jobTimesheets = timesheets.filter(t => t.job_id === jobId);
  const jobEstimates = estimates.filter(e => e.job_id === jobId);
  const fullAddress = [job.address, job.city, job.state, job.zip].filter(Boolean).join(", ");

  return (
    <div>
      <Button variant="ghost" className="mb-4 -ml-2" onClick={() => navigate("/jobs")}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Jobs
      </Button>

      <PageHeader
        title={job.customer_name}
        subtitle={`${JOB_TYPE_LABELS[job.job_type] || job.job_type} · Created ${format(new Date(job.created_date), "MMM d, yyyy")}`}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const company = (() => { try { return JSON.parse(localStorage.getItem("company_settings") || "{}"); } catch { return {}; } })();
            generateCrewSheetPDF({ job, schedules, employees, company });
          }}
        >
          <Printer className="w-4 h-4 mr-2" /> Crew Sheet
        </Button>
        <Select value={job.status} onValueChange={(v) => statusMutation.mutate(v)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this job?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left / Main column ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Core job details */}
          <Card>
            <CardHeader><CardTitle className="text-base">Job Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-y-4 gap-x-6">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <JobStatusBadge status={job.status} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Priority</p>
                <PriorityBadge priority={job.priority} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Job Type</p>
                <p className="text-sm font-medium">{JOB_TYPE_LABELS[job.job_type] || "—"}</p>
              </div>
              {job.start_date && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Start Date</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />{format(new Date(job.start_date), "MMM d, yyyy")}
                  </p>
                </div>
              )}
              {job.end_date && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">End Date</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />{format(new Date(job.end_date), "MMM d, yyyy")}
                  </p>
                </div>
              )}
              {job.assigned_employees?.length > 0 && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Assigned Employees</p>
                  <p className="text-sm font-medium">{job.assigned_employees.join(", ")}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description / notes */}
          {job.description && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" />Notes</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Custom fields from template */}
          <CustomFieldsDisplay job={job} />

          {/* Roof assessment */}
          <JobRoofAssessment job={job} />

          {/* Plan of Action */}
          <JobPlanOfAction value={job} onChange={() => {}} readOnly />

          {/* Site Photography */}
          <JobPhotos value={job} onChange={() => {}} readOnly />

          {/* Intake line items */}
          <JobLineItems job={job} />

          {/* Financial overview */}
          <JobFinancials job={job} invoices={invoices} expenses={expenses} timesheets={jobTimesheets} />

          {/* Workforce / timesheets */}
          <JobWorkforce timesheets={jobTimesheets} employees={employees} />

        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-6">

          {/* Schedule */}
          <JobScheduleCard jobId={jobId} />

          {/* Customer */}
          <Card>
            <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="font-semibold">{job.customer_name}</p>
              {job.customer_phone && (
                <div className="flex items-center gap-2">
                  <a href={`tel:${job.customer_phone}`} className="text-sm flex items-center gap-2 text-primary hover:underline flex-1">
                    <Phone className="w-3.5 h-3.5" /> {job.customer_phone}
                  </a>
                  <SmsButton phone={job.customer_phone} job={job} size="sm" label="SMS" />
                </div>
              )}
              {job.customer_email && (
                <a href={`mailto:${job.customer_email}`} className="text-sm flex items-center gap-2 text-primary hover:underline">
                  <Mail className="w-3.5 h-3.5" /> {job.customer_email}
                </a>
              )}
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Location</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{fullAddress}</p>
              <JobsMap singleJob={job} height="220px" />
            </CardContent>
          </Card>

          {/* Maintenance contract link */}
          {job.maintenance_contract_id && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Wrench className="w-4 h-4 text-primary" />Maintenance Contract</CardTitle></CardHeader>
              <CardContent>
                <a href={`/maintenance/${job.maintenance_contract_id}`}
                  className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/50 transition-colors text-sm">
                  <span className="font-medium">{job.maintenance_contract_name || "View Contract"}</span>
                  <span className="text-xs text-muted-foreground">View →</span>
                </a>
              </CardContent>
            </Card>
          )}

          {/* Linked documents */}
          {(jobEstimates.length > 0 || invoices.filter(inv => inv.job_id === jobId).length > 0) && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Link2 className="w-4 h-4" />Documents</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {jobEstimates.map(est => (
                  <a key={est.id} href={`/estimates/${est.id}`}
                    className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/50 transition-colors text-sm">
                    <span className="font-medium">Est #{est.estimate_number || est.id.slice(0, 8)}</span>
                    <span className="capitalize text-muted-foreground text-xs">{est.status}</span>
                  </a>
                ))}
                {invoices.filter(inv => inv.job_id === jobId).map(inv => (
                  <a key={inv.id} href={`/invoices/${inv.id}`}
                    className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/50 transition-colors text-sm">
                    <span className="font-medium">Inv #{inv.invoice_number || inv.id.slice(0, 8)}</span>
                    <span className="capitalize text-muted-foreground text-xs">{inv.status}</span>
                  </a>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}