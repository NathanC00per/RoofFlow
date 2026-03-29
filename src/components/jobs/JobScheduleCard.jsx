import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Clock, Users } from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS = {
  scheduled: "bg-amber-100 text-amber-700",
  in_progress: "bg-orange-100 text-orange-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function JobScheduleCard({ jobId }) {
  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["schedules", jobId],
    queryFn: () => base44.entities.Schedule.filter({ job_id: jobId }),
    enabled: !!jobId,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  if (isLoading) return null;
  if (schedules.length === 0) return null;

  const empMap = {};
  employees.forEach(e => { empMap[e.id] = `${e.first_name} ${e.last_name}`; });

  // Sort by date ascending
  const sorted = [...schedules].sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-primary" /> Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sorted.map(sched => {
          const names = (sched.employee_ids || []).map(id => empMap[id] || id).filter(Boolean);
          return (
            <div key={sched.id} className="rounded-lg border p-3 space-y-1.5" style={sched.color ? { borderLeftColor: sched.color, borderLeftWidth: 3 } : {}}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">
                  {sched.date ? format(new Date(sched.date), "EEE, dd MMM yyyy") : "—"}
                </p>
                <Badge variant="secondary" className={`text-xs ${STATUS_COLORS[sched.status] || "bg-muted text-muted-foreground"}`}>
                  {sched.status || "scheduled"}
                </Badge>
              </div>

              {(sched.start_time || sched.end_time) && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {sched.start_time}{sched.end_time ? ` – ${sched.end_time}` : ""}
                </p>
              )}

              {names.length > 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="w-3 h-3 flex-shrink-0" />
                  {names.join(", ")}
                </p>
              )}

              {sched.notes && (
                <p className="text-xs text-muted-foreground italic border-t pt-1.5">{sched.notes}</p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}