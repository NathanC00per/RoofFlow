import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const jobStatusConfig = {
  lead: { label: "Lead", className: "bg-muted text-muted-foreground" },
  estimate_scheduled: { label: "Est. Scheduled", className: "bg-blue-100 text-blue-700" },
  estimate_sent: { label: "Est. Sent", className: "bg-purple-100 text-purple-700" },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-700" },
  scheduled: { label: "Scheduled", className: "bg-amber-100 text-amber-700" },
  in_progress: { label: "In Progress", className: "bg-orange-100 text-orange-700" },
  completed: { label: "Completed", className: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700" },
};

const priorityConfig = {
  low: { label: "Low", className: "bg-slate-100 text-slate-600" },
  medium: { label: "Medium", className: "bg-blue-100 text-blue-600" },
  high: { label: "High", className: "bg-orange-100 text-orange-600" },
  emergency: { label: "Emergency", className: "bg-red-100 text-red-600" },
};

const timesheetStatusConfig = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", className: "bg-green-100 text-green-700" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
};

export function JobStatusBadge({ status }) {
  const config = jobStatusConfig[status] || { label: status, className: "bg-muted text-muted-foreground" };
  return <Badge variant="secondary" className={cn("font-medium text-xs", config.className)}>{config.label}</Badge>;
}

export function PriorityBadge({ priority }) {
  const config = priorityConfig[priority] || { label: priority, className: "bg-muted text-muted-foreground" };
  return <Badge variant="secondary" className={cn("font-medium text-xs", config.className)}>{config.label}</Badge>;
}

export function TimesheetStatusBadge({ status }) {
  const config = timesheetStatusConfig[status] || { label: status, className: "bg-muted text-muted-foreground" };
  return <Badge variant="secondary" className={cn("font-medium text-xs", config.className)}>{config.label}</Badge>;
}