import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/shared/PageHeader";
import { format, isAfter, isBefore, addDays } from "date-fns";
import {
  Search, LayoutGrid, List, AlertTriangle, Calendar,
  FileText, Receipt, PlusCircle, ArrowRight, Clock, Briefcase
} from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = [
  { key: "lead",               label: "Lead",             color: "bg-slate-100 text-slate-600",   dot: "bg-slate-400" },
  { key: "estimate_scheduled", label: "Est. Scheduled",   color: "bg-sky-100 text-sky-700",       dot: "bg-sky-500" },
  { key: "estimate_sent",      label: "Est. Sent",        color: "bg-blue-100 text-blue-700",     dot: "bg-blue-500" },
  { key: "approved",           label: "Approved",         color: "bg-violet-100 text-violet-700", dot: "bg-violet-500" },
  { key: "scheduled",          label: "Scheduled",        color: "bg-amber-100 text-amber-700",   dot: "bg-amber-500" },
  { key: "in_progress",        label: "In Progress",      color: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  { key: "completed",          label: "Completed",        color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
];

const PRIORITY_COLOR = {
  low: "bg-slate-100 text-slate-500",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
  emergency: "bg-red-600 text-white",
};

function JobCard({ job, estimates, invoices }) {
  const jobEstimates = estimates.filter(e => e.job_id === job.id);
  const jobInvoices  = invoices.filter(i => i.job_id === job.id);
  const isOverdue = job.end_date && isBefore(new Date(job.end_date), new Date()) && job.status !== "completed";
  const isDueSoon = job.end_date && !isOverdue && isBefore(new Date(job.end_date), addDays(new Date(), 7));

  return (
    <Link to={`/jobs/${job.id}`}>
      <div className={cn(
        "bg-white rounded-xl border p-4 hover:shadow-md transition-all cursor-pointer group space-y-3",
        isOverdue && "border-red-200 bg-red-50/30"
      )}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
              {job.customer_name}
            </p>
            <p className="text-xs text-muted-foreground truncate">{job.address}</p>
          </div>
          {job.priority && job.priority !== "low" && (
            <Badge className={cn("text-xs h-5 px-1.5 flex-shrink-0", PRIORITY_COLOR[job.priority])}>
              {job.priority}
            </Badge>
          )}
        </div>

        {(isOverdue || isDueSoon) && job.end_date && (
          <div className={cn("flex items-center gap-1.5 text-xs rounded-md px-2 py-1",
            isOverdue ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
          )}>
            {isOverdue ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {isOverdue ? "Overdue — " : "Due soon — "}
            {format(new Date(job.end_date), "MMM d")}
          </div>
        )}

        {!isOverdue && !isDueSoon && job.end_date && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            {format(new Date(job.end_date), "MMM d, yyyy")}
          </div>
        )}

        <div className="flex items-center gap-3 pt-1 border-t">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <FileText className="w-3 h-3" />
            <span>{jobEstimates.length} est.</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Receipt className="w-3 h-3" />
            <span>{jobInvoices.length} inv.</span>
          </div>
          {job.estimated_cost && (
            <div className="ml-auto text-xs font-semibold text-foreground">
              €{Number(job.estimated_cost).toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function KanbanView({ jobs, estimates, invoices }) {
  const activeStages = STAGES.filter(s => s.key !== "completed");

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {activeStages.map(stage => {
        const stageJobs = jobs.filter(j => j.status === stage.key);
        return (
          <div key={stage.key} className="flex-shrink-0 w-64">
            <div className="flex items-center gap-2 mb-3">
              <div className={cn("w-2 h-2 rounded-full", stage.dot)} />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{stage.label}</p>
              <span className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded-full font-medium">{stageJobs.length}</span>
            </div>
            <div className="space-y-3 min-h-[80px]">
              {stageJobs.map(job => (
                <JobCard key={job.id} job={job} estimates={estimates} invoices={invoices} />
              ))}
              {stageJobs.length === 0 && (
                <div className="border-2 border-dashed rounded-xl h-16 flex items-center justify-center">
                  <p className="text-xs text-muted-foreground/50">Empty</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListView({ jobs, estimates, invoices }) {
  return (
    <div className="space-y-2">
      {jobs.map(job => {
        const stage = STAGES.find(s => s.key === job.status);
        const jobEstimates = estimates.filter(e => e.job_id === job.id);
        const jobInvoices  = invoices.filter(i => i.job_id === job.id);
        const isOverdue = job.end_date && isBefore(new Date(job.end_date), new Date()) && job.status !== "completed";

        return (
          <Link key={job.id} to={`/jobs/${job.id}`}>
            <div className={cn(
              "bg-white rounded-xl border px-5 py-4 hover:shadow-md transition-all grid grid-cols-12 gap-4 items-center",
              isOverdue && "border-red-200"
            )}>
              <div className="col-span-4">
                <p className="font-semibold text-sm">{job.customer_name}</p>
                <p className="text-xs text-muted-foreground truncate">{job.address}</p>
              </div>
              <div className="col-span-2">
                {stage && (
                  <Badge className={cn("text-xs", stage.color)}>{stage.label}</Badge>
                )}
              </div>
              <div className="col-span-2 text-xs text-muted-foreground">
                {job.end_date ? (
                  <span className={cn(isOverdue && "text-red-600 font-medium")}>
                    {isOverdue && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                    {format(new Date(job.end_date), "MMM d, yyyy")}
                  </span>
                ) : "—"}
              </div>
              <div className="col-span-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{jobEstimates.length}</span>
                <span className="flex items-center gap-1"><Receipt className="w-3 h-3" />{jobInvoices.length}</span>
              </div>
              <div className="col-span-2 flex items-center justify-end gap-2">
                {job.estimated_cost && (
                  <span className="text-sm font-semibold">€{Number(job.estimated_cost).toLocaleString()}</span>
                )}
                <ArrowRight className="w-4 h-4 text-muted-foreground/40" />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default function JobDashboard() {
  const [view, setView] = useState("kanban");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");

  const { data: jobs = [] }      = useQuery({ queryKey: ["jobs"],      queryFn: () => base44.entities.Job.list() });
  const { data: estimates = [] } = useQuery({ queryKey: ["estimates"], queryFn: () => base44.entities.Estimate.list() });
  const { data: invoices = [] }  = useQuery({ queryKey: ["invoices"],  queryFn: () => base44.entities.Invoice.list() });

  const filtered = jobs.filter(j => {
    const matchSearch = !search ||
      j.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      j.address?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all"
      ? true
      : statusFilter === "active"
        ? !["completed", "cancelled"].includes(j.status)
        : j.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const overdueCount = jobs.filter(j =>
    j.end_date && isBefore(new Date(j.end_date), new Date()) && !["completed","cancelled"].includes(j.status)
  ).length;

  const dueSoonCount = jobs.filter(j =>
    j.end_date &&
    isAfter(new Date(j.end_date), new Date()) &&
    isBefore(new Date(j.end_date), addDays(new Date(), 7)) &&
    !["completed","cancelled"].includes(j.status)
  ).length;

  return (
    <div>
      <PageHeader title="Job Dashboard" subtitle="All active projects at a glance">
        <Link to="/jobs/new">
          <Button><PlusCircle className="w-4 h-4 mr-2" />New Job</Button>
        </Link>
      </PageHeader>

      {/* Alert banners */}
      {(overdueCount > 0 || dueSoonCount > 0) && (
        <div className="flex flex-wrap gap-3 mb-6">
          {overdueCount > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <strong>{overdueCount}</strong> job{overdueCount > 1 ? "s" : ""} overdue
            </div>
          )}
          {dueSoonCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-4 py-2.5 text-sm">
              <Clock className="w-4 h-4" />
              <strong>{dueSoonCount}</strong> job{dueSoonCount > 1 ? "s" : ""} due within 7 days
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search jobs..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex rounded-lg border overflow-hidden">
          {[
            { value: "active",    label: "Active" },
            { value: "all",       label: "All" },
            { value: "completed", label: "Completed" },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={cn(
                "px-3 py-1.5 text-sm transition-colors",
                statusFilter === opt.value ? "bg-primary text-white" : "bg-background hover:bg-muted"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex rounded-lg border overflow-hidden">
          <button
            onClick={() => setView("kanban")}
            className={cn("p-2 transition-colors", view === "kanban" ? "bg-primary text-white" : "bg-background hover:bg-muted")}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView("list")}
            className={cn("p-2 transition-colors", view === "list" ? "bg-primary text-white" : "bg-background hover:bg-muted")}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <Briefcase className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">No jobs found</p>
        </div>
      ) : view === "kanban" ? (
        <KanbanView jobs={filtered} estimates={estimates} invoices={invoices} />
      ) : (
        <ListView jobs={filtered} estimates={estimates} invoices={invoices} />
      )}
    </div>
  );
}