import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Users, Clock, DollarSign, ArrowRight, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { JobStatusBadge, PriorityBadge } from "@/components/shared/StatusBadge";
import PageHeader from "@/components/shared/PageHeader";
import { format } from "date-fns";

function StatCard({ title, value, icon: Icon, subtitle, color }) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-2 tracking-tight">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.Job.list("-created_date", 100),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: timesheets = [] } = useQuery({
    queryKey: ["timesheets-recent"],
    queryFn: () => base44.entities.Timesheet.list("-date", 20),
  });

  const activeJobs = jobs.filter(j => ["in_progress", "scheduled", "approved"].includes(j.status));
  const leads = jobs.filter(j => j.status === "lead");
  const activeEmployees = employees.filter(e => e.status === "active");
  const pendingTimesheets = timesheets.filter(t => t.status === "pending");
  const totalRevenue = jobs.filter(j => j.status === "completed").reduce((sum, j) => sum + (j.actual_cost || j.estimated_cost || 0), 0);

  const recentJobs = jobs.slice(0, 5);

  if (jobsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of your roofing operations" />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Active Jobs" value={activeJobs.length} icon={Briefcase} subtitle={`${leads.length} new leads`} color="bg-primary" />
        <StatCard title="Active Crew" value={activeEmployees.length} icon={Users} subtitle={`${employees.length} total`} color="bg-emerald-500" />
        <StatCard title="Pending Timesheets" value={pendingTimesheets.length} icon={Clock} subtitle="Awaiting approval" color="bg-amber-500" />
        <StatCard title="Revenue" value={`$${totalRevenue.toLocaleString()}`} icon={DollarSign} subtitle="Completed jobs" color="bg-accent" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Jobs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Recent Jobs</CardTitle>
            <Link to="/jobs" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No jobs yet. Create your first job!</p>
            ) : (
              <div className="space-y-3">
                {recentJobs.map(job => (
                  <Link key={job.id} to={`/jobs/${job.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">{job.customer_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{job.address}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <JobStatusBadge status={job.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Urgent / High Priority */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Priority Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {jobs.filter(j => ["high", "emergency"].includes(j.priority) && j.status !== "completed" && j.status !== "cancelled").length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No high-priority items</p>
            ) : (
              <div className="space-y-3">
                {jobs
                  .filter(j => ["high", "emergency"].includes(j.priority) && j.status !== "completed" && j.status !== "cancelled")
                  .slice(0, 5)
                  .map(job => (
                    <Link key={job.id} to={`/jobs/${job.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{job.customer_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{job.address}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        <PriorityBadge priority={job.priority} />
                      </div>
                    </Link>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}