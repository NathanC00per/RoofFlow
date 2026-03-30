import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronRight, Clock, Users } from "lucide-react";
import { Link } from "react-router-dom";
import {
  addDays, startOfWeek, format, isSameDay, isToday, parseISO,
} from "date-fns";

const STATUS_COLORS = {
  scheduled: "bg-amber-400",
  in_progress: "bg-orange-500",
  completed: "bg-emerald-500",
  cancelled: "bg-slate-400",
};

export default function WeekScheduleStrip() {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const { data: schedules = [] } = useQuery({
    queryKey: ["schedules"],
    queryFn: () => base44.entities.Schedule.list("-date", 200),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const empMap = Object.fromEntries(
    employees.map(e => [e.id, `${e.first_name} ${e.last_name}`])
  );

  const weekSchedules = schedules.filter(s => {
    const d = parseISO(s.date);
    return d >= weekDays[0] && d <= weekDays[6];
  });

  const totalThisWeek = weekSchedules.length;
  const uniqueJobs = new Set(weekSchedules.map(s => s.job_id)).size;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          This Week's Schedule
          <span className="text-xs font-normal text-muted-foreground">
            ({format(weekDays[0], "MMM d")} – {format(weekDays[6], "MMM d")})
          </span>
        </CardTitle>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:block">
            {uniqueJobs} job{uniqueJobs !== 1 ? "s" : ""} · {totalThisWeek} assignment{totalThisWeek !== 1 ? "s" : ""}
          </span>
          <Link to="/schedule" className="text-xs text-primary hover:underline flex items-center gap-1">
            Full schedule <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(day => {
            const dayEntries = weekSchedules.filter(s => isSameDay(parseISO(s.date), day));
            const today = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={`rounded-xl border p-2 min-h-[90px] transition-colors ${
                  today
                    ? "border-primary/40 bg-primary/5"
                    : "border-border bg-muted/20"
                }`}
              >
                {/* Day header */}
                <div className="text-center mb-2">
                  <p className={`text-[10px] font-semibold uppercase tracking-wide ${today ? "text-primary" : "text-muted-foreground"}`}>
                    {format(day, "EEE")}
                  </p>
                  <p className={`text-sm font-bold leading-none mt-0.5 ${today ? "text-primary" : ""}`}>
                    {format(day, "d")}
                  </p>
                </div>

                {/* Entries */}
                {dayEntries.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground text-center">–</p>
                ) : (
                  <div className="space-y-1">
                    {dayEntries.slice(0, 3).map(entry => (
                      <Link
                        key={entry.id}
                        to={`/jobs/${entry.job_id}`}
                        className="block"
                      >
                        <div
                          className="rounded-md px-1.5 py-1 text-white cursor-pointer hover:opacity-90 transition-opacity"
                          style={{ backgroundColor: entry.color || "#3b82f6" }}
                        >
                          <p className="text-[10px] font-semibold truncate leading-tight">{entry.customer_name}</p>
                          {entry.start_time && (
                            <p className="text-[9px] text-white/80 truncate leading-tight flex items-center gap-0.5">
                              <Clock className="w-2 h-2 inline" />
                              {entry.start_time}{entry.end_time ? `–${entry.end_time}` : ""}
                            </p>
                          )}
                          {entry.employee_names?.length > 0 && (
                            <p className="text-[9px] text-white/80 truncate flex items-center gap-0.5">
                              <Users className="w-2 h-2 inline" />
                              {entry.employee_names.slice(0, 2).join(", ")}
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                    {dayEntries.length > 3 && (
                      <p className="text-[9px] text-muted-foreground text-center">+{dayEntries.length - 3} more</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}