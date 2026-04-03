import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JobStatusBadge, PriorityBadge } from "@/components/shared/StatusBadge";
import PageHeader from "@/components/shared/PageHeader";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PlusCircle, Search, MapPin, ChevronRight, DollarSign, Calendar, CheckSquare, Square, Trash2, RefreshCw, Loader2 } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const JOB_TYPE_LABELS = {
  new_roof: "New Roof", repair: "Repair", inspection: "Inspection",
  gutter: "Gutter", siding: "Siding", other: "Other"
};

const STATUS_COUNTS_ORDER = ["lead","estimate_scheduled","estimate_sent","approved","scheduled","in_progress","completed","cancelled"];

const JOB_STATUSES = [
  { value: "lead", label: "Lead" },
  { value: "estimate_scheduled", label: "Est. Scheduled" },
  { value: "estimate_sent", label: "Est. Sent" },
  { value: "approved", label: "Approved" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function JobsList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkWorking, setBulkWorking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.Job.list("-created_date", 200),
  });

  const filtered = jobs.filter(j => {
    const matchSearch = !search || 
      j.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      j.address?.toLowerCase().includes(search.toLowerCase()) ||
      j.customer_phone?.includes(search);
    const matchStatus = statusFilter === "all" || j.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeCount = jobs.filter(j => !["completed","cancelled"].includes(j.status)).length;
  const totalValue = jobs.reduce((s, j) => s + (j.estimated_cost || 0), 0);

  const allFilteredSelected = filtered.length > 0 && filtered.every(j => selectedIds.includes(j.id));
  const someSelected = selectedIds.length > 0;

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds(prev => prev.filter(id => !filtered.some(j => j.id === id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...filtered.map(j => j.id)])]);
    }
  }

  function toggleSelect(id, e) {
    e.preventDefault();
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function handleBulkDelete() {
    setBulkWorking(true);
    try {
      await Promise.all(selectedIds.map(id => base44.entities.Job.delete(id)));
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success(`${selectedIds.length} job${selectedIds.length > 1 ? "s" : ""} deleted`);
      setSelectedIds([]);
    } finally {
      setBulkWorking(false);
      setConfirmDelete(false);
    }
  }

  async function handleBulkStatus(status) {
    setBulkWorking(true);
    try {
      await Promise.all(selectedIds.map(id => base44.entities.Job.update(id, { status })));
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success(`${selectedIds.length} job${selectedIds.length > 1 ? "s" : ""} updated to "${status.replace(/_/g, " ")}"`);
      setSelectedIds([]);
    } finally {
      setBulkWorking(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="All Jobs" subtitle={`${jobs.length} total · ${activeCount} active`}>
        <Link to="/jobs/new">
          <Button className="shadow-sm"><PlusCircle className="w-4 h-4 mr-2" /> New Job</Button>
        </Link>
      </PageHeader>

      {/* Quick stats row */}
      {jobs.length > 0 && (
        <div className="flex gap-3 mb-5 flex-wrap">
          <div className="flex items-center gap-1.5 text-sm bg-card rounded-lg px-3 py-2 border shadow-sm">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Pipeline value:</span>
            <span className="font-semibold">€{totalValue.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name, address or phone…" value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-card" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-card">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="lead">Lead</SelectItem>
            <SelectItem value="estimate_scheduled">Est. Scheduled</SelectItem>
            <SelectItem value="estimate_sent">Est. Sent</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk action bar */}
      {filtered.length > 0 && (
        <div className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg border mb-3 transition-all flex-wrap",
          someSelected ? "bg-primary/5 border-primary/30" : "bg-muted/30 border-border"
        )}>
          <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm shrink-0">
            {allFilteredSelected
              ? <CheckSquare className="w-4 h-4 text-primary" />
              : someSelected
                ? <div className="w-4 h-4 rounded border-2 border-primary bg-primary/20 flex items-center justify-center"><div className="w-1.5 h-0.5 bg-primary rounded" /></div>
                : <Square className="w-4 h-4 text-muted-foreground" />
            }
            <span className="text-xs text-muted-foreground">
              {someSelected ? `${selectedIds.length} selected` : "Select all"}
            </span>
          </button>

          {someSelected && (
            <>
              <div className="h-4 w-px bg-border mx-1" />
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Set status:</span>
                <Select onValueChange={handleBulkStatus} disabled={bulkWorking}>
                  <SelectTrigger className="h-7 text-xs w-40 bg-background">
                    <SelectValue placeholder="Change status…" />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_STATUSES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/5 ml-auto"
                onClick={() => setConfirmDelete(true)}
                disabled={bulkWorking}
              >
                {bulkWorking ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Trash2 className="w-3 h-3 mr-1" />}
                Delete {selectedIds.length}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Results count */}
      {(search || statusFilter !== "all") && (
        <p className="text-xs text-muted-foreground mb-3">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</p>
      )}

      {/* Jobs list */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground">No jobs found</p>
            <Link to="/jobs/new"><Button className="mt-4" variant="outline">Create First Job</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(job => {
            const isSelected = selectedIds.includes(job.id);
            return (
              <div key={job.id} className="flex items-center gap-2">
                <button
                  onClick={(e) => toggleSelect(job.id, e)}
                  className="shrink-0 w-5 h-5 flex items-center justify-center"
                >
                  {isSelected
                    ? <CheckSquare className="w-4 h-4 text-primary" />
                    : <Square className="w-4 h-4 text-muted-foreground/40 hover:text-muted-foreground" />
                  }
                </button>
                <Link to={`/jobs/${job.id}`} className="flex-1 min-w-0">
                  <Card className={cn("hover:shadow-md transition-all cursor-pointer bg-card border-0 shadow-sm", isSelected && "ring-2 ring-primary border-primary")}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-sm truncate">{job.customer_name}</p>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 hidden sm:inline-flex capitalize text-muted-foreground">
                              {JOB_TYPE_LABELS[job.job_type] || job.job_type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 flex-shrink-0" />{job.address}{job.city ? `, ${job.city}` : ""}</span>
                            {job.end_date && <span className="hidden md:flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(job.end_date), "MMM d, yyyy")}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <PriorityBadge priority={job.priority} />
                          <JobStatusBadge status={job.status} />
                          {job.estimated_cost && <span className="text-sm font-bold text-foreground hidden md:block">€{Number(job.estimated_cost).toLocaleString()}</span>}
                          <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Bulk delete confirmation */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} job{selectedIds.length > 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the selected jobs and cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={bulkWorking} className="bg-destructive text-destructive-foreground">
              {bulkWorking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Delete {selectedIds.length}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}