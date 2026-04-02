import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Briefcase, Users, Clock, DollarSign, ArrowRight,
  AlertTriangle, Map, CheckCircle2, HardHat,
  ChevronRight, Activity, Calendar, FileText, Receipt
} from "lucide-react";
import { Link } from "react-router-dom";
import { JobStatusBadge, PriorityBadge } from "@/components/shared/StatusBadge";
import JobsMap, { MapLegend } from "@/components/maps/JobsMap";
import WeekScheduleStrip from "@/components/dashboard/WeekScheduleStrip";
import { format, subMonths, isAfter, startOfMonth } from "date-fns";
import { useMaintenanceAutoGenerate } from "@/hooks/useMaintenanceAutoGenerate";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/lib/AuthContext";

const TIME_RANGES = [
  { label: "Last Month",    value: "1m",  months: 1 },
  { label: "Last 3 Months", value: "3m", months: 3 },
  { label: "Last 6 Months", value: "6m", months: 6 },
  { label: "Last Year",     value: "1y", months: 12 },
  { label: "All Time",      value: "all", months: null },
];

const ROLE_GREETINGS = {
  admin:     "Here's your full business overview.",
  manager:   "Here's your operations summary.",
  foreman:   "Here's your crew and job overview.",
  estimator: "Here's your pipeline and estimates.",
  office:    "Here's your financial and customer summary.",
  laborer:   "Here's your schedule for today.",
};

function StatCard({ title, value, icon: Icon, subtitle, color, bgColor, to }) {
  const content = (
    <Card className={`relative overflow-hidden transition-all duration-200 border-0 shadow-sm ${to ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5" : ""}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1.5 tracking-tight">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1.5">{subtitle}</p>}
          </div>
          <div className={`p-2.5 rounded-xl flex-shrink-0 ${bgColor}`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        </div>
        {to && (
          <div className="flex items-center gap-1 mt-3 text-xs font-medium text-primary">
            View details <ChevronRight className="w-3 h-3" />
          </div>
        )}
      </CardContent>
    </Card>
  );
  if (to) return <Link to={to}>{content}</Link>;
  return content;
}

function JobRow({ job }) {
  return (
    <Link
      to={`/jobs/${job.id}`}
      className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/60 transition-colors group border border-transparent hover:border-border"
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{job.customer_name}</p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{job.address}</p>
      </div>
      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
        <JobStatusBadge status={job.status} />
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

function CrewRow({ employee }) {
  return (
    <Link
      to="/employees"
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/60 transition-colors group border border-transparent hover:border-border"
    >
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-primary">
          {employee.first_name?.[0]}{employee.last_name?.[0]}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm truncate">{employee.first_name} {employee.last_name}</p>
        <p className="text-xs text-muted-foreground capitalize">{employee.role?.replace("_", " ")}</p>
      </div>
      <Badge variant="secondary" className="text-xs capitalize flex-shrink-0">{employee.status}</Badge>
    </Link>
  );
}

function TimesheetRow({ timesheet }) {
  return (
    <Link
      to="/timesheets"
      className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/60 transition-colors group border border-transparent hover:border-border"
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm truncate">{timesheet.employee_name || "Unknown"}</p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{timesheet.job_address || "No job"} · {timesheet.date}</p>
      </div>
      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
        <span className="text-sm font-bold">{timesheet.hours?.toFixed(1)}h</span>
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">Pending</Badge>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  useMaintenanceAutoGenerate();
  const [mapRange, setMapRange] = useState("6m");
  const { can, isAdmin, role } = usePermissions();
  const { user } = useAuth();

  const needsJobs       = isAdmin || can("jobs.view");
  const needsEmployees  = isAdmin || can("employees.view");
  const needsTimesheets = isAdmin || can("timesheets.view");
  const needsInvoices   = isAdmin || can("invoices.view") || can("finance.view");
  const needsEstimates  = isAdmin || can("estimates.view");

  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.Job.list("-created_date", 200),
    enabled: needsJobs,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
    enabled: needsEmployees,
  });

  const { data: timesheets = [] } = useQuery({
    queryKey: ["timesheets-recent"],
    queryFn: () => base44.entities.Timesheet.list("-date", 50),
    enabled: needsTimesheets,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list(),
    enabled: needsInvoices,
  });

  const { data: estimates = [] } = useQuery({
    queryKey: ["estimates"],
    queryFn: () => base44.entities.Estimate.list("-created_date", 50),
    enabled: needsEstimates,
  });

  const activeJobs        = jobs.filter(j => ["in_progress", "scheduled", "approved"].includes(j.status));
  const leads             = jobs.filter(j => j.status === "lead");
  const completedJobs     = jobs.filter(j => j.status === "completed");
  const activeEmployees   = employees.filter(e => e.status === "active");
  const pendingTimesheets = timesheets.filter(t => t.status === "pending");
  const myTimesheets      = timesheets.filter(t => t.employee_name === user?.full_name);

  const totalRevenue = invoices
    .filter(i => ["paid", "partial"].includes(i.status))
    .reduce((sum, i) => sum + (i.amount_paid || i.total || 0), 0);

  const thisMonthStart = startOfMonth(new Date());
  const thisMonthRevenue = invoices
    .filter(i => ["paid", "partial"].includes(i.status) && isAfter(new Date(i.updated_date || i.issued_date || ""), thisMonthStart))
    .reduce((sum, i) => sum + (i.amount_paid || i.total || 0), 0);

  const overdueInvoices  = invoices.filter(i => i.status === "overdue");
  const openEstimates    = estimates.filter(e => ["draft", "sent"].includes(e.status));
  const pendingEstimates = estimates.filter(e => e.status === "sent");

  const rangeConfig = TIME_RANGES.find(r => r.value === mapRange);
  const mapJobs = jobs.filter(job => {
    if (!rangeConfig.months) return true;
    const cutoff = subMonths(new Date(), rangeConfig.months);
    return new Date(job.created_date) >= cutoff;
  });
  const activeStatuses = [...new Set(mapJobs.map(j => j.status))];

  const priorityJobs = jobs
    .filter(j => ["high", "emergency"].includes(j.priority) && !["completed", "cancelled"].includes(j.status))
    .slice(0, 5);

  const greeting = ROLE_GREETINGS[role] || ROLE_GREETINGS.admin;
  const firstName = user?.full_name?.split(" ")[0] || "there";

  if (jobsLoading && needsJobs) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hi, {firstName} 👋</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {greeting} — {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(isAdmin || can("jobs.create")) && (
            <Link to="/jobs/new">
              <Button className="gap-2 shadow-sm">
                <Briefcase className="w-4 h-4" />
                New Job
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* MAP */}
      {needsJobs && (isAdmin || can("schedule.view")) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Map className="w-4 h-4 text-primary" />
              Jobs Map
              <span className="text-xs font-normal text-muted-foreground">({mapJobs.length} jobs)</span>
            </CardTitle>
            <Select value={mapRange} onValueChange={setMapRange}>
              <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIME_RANGES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <JobsMap jobs={mapJobs} height="360px" />
            <MapLegend statuses={activeStatuses} />
          </CardContent>
        </Card>
      )}

      {/* WEEK SCHEDULE */}
      {(isAdmin || can("schedule.view")) && <WeekScheduleStrip />}

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {needsJobs && (
          <StatCard
            title="Active Jobs"
            value={activeJobs.length}
            icon={Briefcase}
            subtitle={`${leads.length} lead${leads.length !== 1 ? "s" : ""} pending`}
            color="text-primary"
            bgColor="bg-primary/10"
            to="/jobs"
          />
        )}
        {(isAdmin || can("employees.view")) && (
          <StatCard
            title="Active Crew"
            value={activeEmployees.length}
            icon={HardHat}
            subtitle={`${employees.length} total employees`}
            color="text-emerald-600"
            bgColor="bg-emerald-50"
            to="/employees"
          />
        )}
        {(isAdmin || can("timesheets.approve")) && (
          <StatCard
            title="Pending Timesheets"
            value={pendingTimesheets.length}
            icon={Clock}
            subtitle="Awaiting approval"
            color="text-amber-600"
            bgColor="bg-amber-50"
            to="/timesheets"
          />
        )}
        {!isAdmin && !can("timesheets.approve") && can("timesheets.view") && (
          <StatCard
            title="My Hours (This Week)"
            value={myTimesheets.filter(t => {
              const d = new Date(t.date);
              const now = new Date();
              const weekStart = new Date(now);
              weekStart.setDate(now.getDate() - now.getDay());
              return d >= weekStart;
            }).reduce((s, t) => s + (t.hours || 0), 0).toFixed(1)}
            icon={Clock}
            subtitle="Hours logged this week"
            color="text-amber-600"
            bgColor="bg-amber-50"
            to="/timesheets"
          />
        )}
        {(isAdmin || can("finance.view")) && (
          <StatCard
            title="Revenue Collected"
            value={`€${totalRevenue.toLocaleString()}`}
            icon={DollarSign}
            subtitle={thisMonthRevenue > 0 ? `€${thisMonthRevenue.toLocaleString()} this month` : `${completedJobs.length} jobs completed`}
            color="text-violet-600"
            bgColor="bg-violet-50"
            to="/finance"
          />
        )}
        {!isAdmin && !can("finance.view") && can("invoices.view") && (
          <StatCard
            title="Open Invoices"
            value={invoices.filter(i => ["sent", "partial"].includes(i.status)).length}
            icon={Receipt}
            subtitle={`${overdueInvoices.length} overdue`}
            color="text-violet-600"
            bgColor="bg-violet-50"
            to="/invoices"
          />
        )}
        {(isAdmin || can("estimates.view")) && (
          <StatCard
            title="Open Estimates"
            value={openEstimates.length}
            icon={FileText}
            subtitle={`${pendingEstimates.length} awaiting approval`}
            color="text-blue-600"
            bgColor="bg-blue-50"
            to="/estimates"
          />
        )}
      </div>

      {/* QUICK STATS BAR */}
      {needsJobs && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Leads",       value: leads.length,                                        color: "text-blue-600",    bg: "bg-blue-50",    link: "/jobs" },
            { label: "In Progress", value: jobs.filter(j => j.status === "in_progress").length, color: "text-amber-600",   bg: "bg-amber-50",   link: "/jobs" },
            { label: "Completed",   value: completedJobs.length,                                color: "text-emerald-600", bg: "bg-emerald-50", link: "/jobs" },
            ...(isAdmin || can("invoices.view") ? [{
              label: "Invoices Out",
              value: invoices.filter(i => ["sent", "partial", "overdue"].includes(i.status)).length,
              color: "text-violet-600", bg: "bg-violet-50", link: "/invoices"
            }] : []),
          ].map(stat => (
            <Link key={stat.label} to={stat.link}>
              <div className={`rounded-xl p-3.5 ${stat.bg} flex items-center justify-between hover:opacity-80 transition-opacity`}>
                <span className="text-xs font-semibold text-muted-foreground">{stat.label}</span>
                <span className={`text-xl font-bold ${stat.color}`}>{stat.value}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* LABORER: Simple My Jobs view */}
      {!isAdmin && !can("jobs.edit") && can("jobs.view") && !can("employees.view") && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" /> My Upcoming Jobs
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            {activeJobs.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No active jobs right now</p>
              </div>
            ) : (
              <div className="space-y-1">
                {activeJobs.slice(0, 8).map(job => <JobRow key={job.id} job={job} />)}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* FULL BOTTOM GRID */}
      {(isAdmin || can("jobs.edit") || can("employees.view") || can("timesheets.approve")) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Active Jobs */}
          {needsJobs && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" /> Active Jobs
                </CardTitle>
                <Link to="/jobs" className="text-xs text-primary hover:underline flex items-center gap-1">
                  All jobs <ArrowRight className="w-3 h-3" />
                </Link>
              </CardHeader>
              <CardContent className="pt-1">
                {activeJobs.length === 0 ? (
                  <div className="text-center py-8">
                    <Briefcase className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No active jobs right now</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {activeJobs.slice(0, 6).map(job => <JobRow key={job.id} job={job} />)}
                    {activeJobs.length > 6 && (
                      <Link to="/jobs" className="block text-center text-xs text-primary hover:underline pt-2">
                        +{activeJobs.length - 6} more
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Timesheets (approvers) or Estimates (estimators/office) */}
          {(isAdmin || can("timesheets.approve")) ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" /> Pending Timesheets
                </CardTitle>
                <Link to="/timesheets" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Manage <ArrowRight className="w-3 h-3" />
                </Link>
              </CardHeader>
              <CardContent className="pt-1">
                {pendingTimesheets.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400/60 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">All timesheets approved!</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {pendingTimesheets.slice(0, 6).map(ts => <TimesheetRow key={ts.id} timesheet={ts} />)}
                    {pendingTimesheets.length > 6 && (
                      <Link to="/timesheets" className="block text-center text-xs text-primary hover:underline pt-2">
                        +{pendingTimesheets.length - 6} more
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : needsEstimates ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" /> Recent Estimates
                </CardTitle>
                <Link to="/estimates" className="text-xs text-primary hover:underline flex items-center gap-1">
                  All <ArrowRight className="w-3 h-3" />
                </Link>
              </CardHeader>
              <CardContent className="pt-1">
                {openEstimates.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No open estimates</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {openEstimates.slice(0, 6).map(est => (
                      <Link
                        key={est.id}
                        to={`/estimates/${est.id}`}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/60 transition-colors group border border-transparent hover:border-border"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate group-hover:text-primary">{est.estimate_number || "Draft"}</p>
                          <p className="text-xs text-muted-foreground">{est.issued_date || "—"}</p>
                        </div>
                        <Badge variant="outline" className="text-xs capitalize ml-2">{est.status}</Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          {/* Right column */}
          <div className="space-y-6">
            {(isAdmin || can("employees.view")) && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600" /> Active Crew
                  </CardTitle>
                  <Link to="/employees" className="text-xs text-primary hover:underline flex items-center gap-1">
                    All <ArrowRight className="w-3 h-3" />
                  </Link>
                </CardHeader>
                <CardContent className="pt-1">
                  {activeEmployees.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No active crew</p>
                  ) : (
                    <div className="space-y-1">
                      {activeEmployees.slice(0, 4).map(emp => <CrewRow key={emp.id} employee={emp} />)}
                      {activeEmployees.length > 4 && (
                        <Link to="/employees" className="block text-center text-xs text-primary hover:underline pt-2">
                          +{activeEmployees.length - 4} more
                        </Link>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {(isAdmin || can("finance.view") || can("invoices.view")) && overdueInvoices.length > 0 && (
              <Card className="border-red-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-600">
                    <AlertTriangle className="w-4 h-4" /> Overdue Invoices
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-1">
                  <div className="space-y-1">
                    {overdueInvoices.slice(0, 4).map(inv => (
                      <Link
                        key={inv.id}
                        to={`/invoices/${inv.id}`}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-red-50 transition-colors group border border-transparent hover:border-red-200"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate">{inv.invoice_number || "Invoice"}</p>
                          <p className="text-xs text-muted-foreground">Due: {inv.due_date || "—"}</p>
                        </div>
                        <span className="text-sm font-bold text-red-600 ml-2">€{(inv.balance_due || inv.total || 0).toLocaleString()}</span>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {needsJobs && priorityJobs.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" /> Priority Items
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-1">
                  <div className="space-y-1">
                    {priorityJobs.map(job => (
                      <Link
                        key={job.id}
                        to={`/jobs/${job.id}`}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/60 transition-colors group border border-transparent hover:border-border"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate">{job.customer_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{job.address}</p>
                        </div>
                        <PriorityBadge priority={job.priority} />
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}