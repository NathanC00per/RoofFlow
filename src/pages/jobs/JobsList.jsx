import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JobStatusBadge, PriorityBadge } from "@/components/shared/StatusBadge";
import PageHeader from "@/components/shared/PageHeader";
import { PlusCircle, Search, MapPin, Phone, ChevronRight, DollarSign, Calendar } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

const JOB_TYPE_LABELS = {
  new_roof: "New Roof", repair: "Repair", inspection: "Inspection",
  gutter: "Gutter", siding: "Siding", other: "Other"
};

const STATUS_COUNTS_ORDER = ["lead","estimate_scheduled","estimate_sent","approved","scheduled","in_progress","completed","cancelled"];

export default function JobsList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

      {/* Results count */}
      {search || statusFilter !== "all" ? (
        <p className="text-xs text-muted-foreground mb-3">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</p>
      ) : null}

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
          {filtered.map(job => (
            <Link key={job.id} to={`/jobs/${job.id}`}>
              <Card className="hover:shadow-md transition-all hover:border-primary/30 cursor-pointer bg-card border-0 shadow-sm">
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
                        {job.end_date && <span className="flex items-center gap-1 hidden md:flex"><Calendar className="w-3 h-3" />{format(new Date(job.end_date), "MMM d, yyyy")}</span>}
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
          ))}
        </div>
      )}
    </div>
  );
}