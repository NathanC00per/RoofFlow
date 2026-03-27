import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JobStatusBadge, PriorityBadge } from "@/components/shared/StatusBadge";
import PageHeader from "@/components/shared/PageHeader";
import { PlusCircle, Search, MapPin, Phone, ChevronRight } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

const JOB_TYPE_LABELS = {
  new_roof: "New Roof", repair: "Repair", inspection: "Inspection",
  gutter: "Gutter", siding: "Siding", other: "Other"
};

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
      j.address?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || j.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="All Jobs" subtitle={`${jobs.length} total jobs`}>
        <Link to="/jobs/new">
          <Button><PlusCircle className="w-4 h-4 mr-2" /> New Job</Button>
        </Link>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or address..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
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

      {/* Jobs list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground">No jobs found</p>
            <Link to="/jobs/new"><Button className="mt-4" variant="outline">Create First Job</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(job => (
            <Link key={job.id} to={`/jobs/${job.id}`}>
              <Card className="hover:shadow-md transition-all hover:border-primary/20 cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-semibold text-sm truncate">{job.customer_name}</p>
                      <span className="text-xs text-muted-foreground">{JOB_TYPE_LABELS[job.job_type] || job.job_type}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3" />{job.address}{job.city ? `, ${job.city}` : ""}</span>
                      {job.customer_phone && <span className="flex items-center gap-1 hidden sm:flex"><Phone className="w-3 h-3" />{job.customer_phone}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <PriorityBadge priority={job.priority} />
                    <JobStatusBadge status={job.status} />
                    {job.estimated_cost && <span className="text-sm font-semibold hidden md:block">${Number(job.estimated_cost).toLocaleString()}</span>}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
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