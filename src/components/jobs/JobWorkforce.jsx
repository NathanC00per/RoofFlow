import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, Timer } from "lucide-react";
import { format } from "date-fns";
import { TimesheetStatusBadge } from "@/components/shared/StatusBadge";

export default function JobWorkforce({ timesheets = [], employees = [] }) {
  const employeeMap = useMemo(() => {
    const m = {};
    employees.forEach(e => { m[e.id] = e; });
    return m;
  }, [employees]);

  const completed = timesheets.filter(t => t.clock_in && t.clock_out);
  const active = timesheets.filter(t => t.clock_in && !t.clock_out);

  const totalHours = completed.reduce((s, t) => s + (t.hours || 0), 0);

  // Group by employee
  const byEmployee = useMemo(() => {
    const map = {};
    timesheets.forEach(t => {
      const key = t.employee_id || t.created_by || "unknown";
      if (!map[key]) map[key] = { key, name: t.employee_name || key, shifts: [], hours: 0 };
      map[key].shifts.push(t);
      map[key].hours += t.hours || 0;
    });
    return Object.values(map).sort((a, b) => b.hours - a.hours);
  }, [timesheets]);

  // Unique worker count
  const workerCount = byEmployee.length;

  if (timesheets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Workforce & Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No time entries logged for this job yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" /> Workforce & Time
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Summary row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-muted/40 p-3 text-center">
            <p className="text-xl font-bold">{totalHours.toFixed(1)}h</p>
            <p className="text-xs text-muted-foreground">Total Hours</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3 text-center">
            <p className="text-xl font-bold">{workerCount}</p>
            <p className="text-xs text-muted-foreground">Workers</p>
          </div>
          <div className={`rounded-lg p-3 text-center ${active.length > 0 ? "bg-emerald-50" : "bg-muted/40"}`}>
            <p className={`text-xl font-bold ${active.length > 0 ? "text-emerald-600" : ""}`}>{active.length}</p>
            <p className="text-xs text-muted-foreground">On-site Now</p>
          </div>
        </div>

        {/* Active shifts */}
        {active.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Currently On-Site</p>
            {active.map(t => (
              <div key={t.id} className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <Timer className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-medium">{t.employee_name || t.created_by || "—"}</span>
                </div>
                <span className="text-emerald-700 font-medium">Since {t.clock_in}</span>
              </div>
            ))}
          </div>
        )}

        {/* Per-employee breakdown */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Employee Summary</p>
          {byEmployee.map(emp => (
            <div key={emp.key} className="border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
                <span className="text-sm font-semibold">{emp.name}</span>
                <span className="text-sm font-bold text-primary">{emp.hours.toFixed(1)}h total</span>
              </div>
              <div className="divide-y">
                {emp.shifts
                  .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
                  .map(t => (
                    <div key={t.id} className="flex items-center justify-between px-3 py-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">
                          {t.date ? format(new Date(t.date), "EEE MMM d") : "—"}
                        </span>
                        <span className="mx-2 text-muted-foreground/50">·</span>
                        <span>{t.clock_in || "?"} – {t.clock_out || <span className="text-emerald-600 font-medium">Active</span>}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {t.hours ? <span className="font-medium">{t.hours.toFixed(1)}h</span> : null}
                        <TimesheetStatusBadge status={t.status} />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}