import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JobStatusBadge, PriorityBadge } from "@/components/shared/StatusBadge";
import PageHeader from "@/components/shared/PageHeader";
import { Pencil, Trash2, MapPin, Phone, Mail, Calendar, DollarSign, ArrowLeft, FileText } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const JOB_TYPE_LABELS = {
  new_roof: "New Roof", repair: "Repair", inspection: "Inspection",
  gutter: "Gutter", siding: "Siding", other: "Other"
};

const ROOF_TYPE_LABELS = {
  asphalt_shingle: "Asphalt Shingle", metal: "Metal", tile: "Tile",
  flat: "Flat", slate: "Slate", wood_shake: "Wood Shake", other: "Other"
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
  const urlParams = new URLSearchParams(window.location.search);
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

  const statusMutation = useMutation({
    mutationFn: (newStatus) => base44.entities.Job.update(jobId, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Status updated!");
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

  return (
    <div>
      <Button variant="ghost" className="mb-4 -ml-2" onClick={() => navigate("/jobs")}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Jobs
      </Button>

      <PageHeader title={job.customer_name} subtitle={`${JOB_TYPE_LABELS[job.job_type] || job.job_type} • Created ${format(new Date(job.created_date), "MMM d, yyyy")}`}>
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
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
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
                <p className="text-sm font-medium">{JOB_TYPE_LABELS[job.job_type]}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Roof Type</p>
                <p className="text-sm font-medium">{ROOF_TYPE_LABELS[job.roof_type] || "—"}</p>
              </div>
              {job.start_date && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Start Date</p>
                  <p className="text-sm font-medium flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{format(new Date(job.start_date), "MMM d, yyyy")}</p>
                </div>
              )}
              {job.end_date && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">End Date</p>
                  <p className="text-sm font-medium flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{format(new Date(job.end_date), "MMM d, yyyy")}</p>
                </div>
              )}
              {job.estimated_cost && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Estimated Cost</p>
                  <p className="text-sm font-semibold flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />{Number(job.estimated_cost).toLocaleString()}</p>
                </div>
              )}
              {job.actual_cost && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Actual Cost</p>
                  <p className="text-sm font-semibold flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />{Number(job.actual_cost).toLocaleString()}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {job.description && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" />Notes</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.description}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="font-semibold">{job.customer_name}</p>
              {job.customer_phone && (
                <a href={`tel:${job.customer_phone}`} className="text-sm flex items-center gap-2 text-primary hover:underline">
                  <Phone className="w-3.5 h-3.5" /> {job.customer_phone}
                </a>
              )}
              {job.customer_email && (
                <a href={`mailto:${job.customer_email}`} className="text-sm flex items-center gap-2 text-primary hover:underline">
                  <Mail className="w-3.5 h-3.5" /> {job.customer_email}
                </a>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Location</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{job.address}{job.city ? `, ${job.city}` : ""}{job.state ? `, ${job.state}` : ""} {job.zip}</span>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}