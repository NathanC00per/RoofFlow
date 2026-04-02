import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChevronLeft, ChevronRight, Plus, Clock, Briefcase,
  GripVertical, Users, CalendarDays, MoreHorizontal, Trash2, Edit2
} from "lucide-react";
import {
  addDays, subDays, startOfWeek, format, isSameDay,
  isToday, parseISO, addWeeks, subWeeks,
} from "date-fns";
import AssignmentModal from "@/components/schedule/AssignmentModal";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const HOURS = Array.from({ length: 13 }, (_, i) => i + 6); // 6am–6pm

function timeToMinutes(t) {
  if (!t) return 480;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function minutesToPercent(mins) {
  const start = 6 * 60;
  const total = 12 * 60;
  return ((mins - start) / total) * 100;
}

function computeColumns(entries) {
  const sorted = [...entries].map(e => ({
    e,
    start: timeToMinutes(e.start_time),
    end: timeToMinutes(e.end_time || "18:00"),
  })).sort((a, b) => a.start - b.start);
  const cols = [];
  for (const item of sorted) {
    let placed = false;
    for (const col of cols) {
      const last = col[col.length - 1];
      if (last.end <= item.start) { col.push(item); placed = true; break; }
    }
    if (!placed) cols.push([item]);
  }
  const result = new Map();
  cols.forEach((col, colIdx) => col.forEach(item => result.set(item.e.id, { col: colIdx, totalCols: cols.length })));
  return result;
}

const STATUS_COLORS = {
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  scheduled: "bg-amber-100 text-amber-700 border-amber-200",
  in_progress: "bg-orange-100 text-orange-700 border-orange-200",
  lead: "bg-slate-100 text-slate-600 border-slate-200",
  estimate_sent: "bg-purple-100 text-purple-700 border-purple-200",
};

// ─── Calendar block (week view) ────────────────────────────────────────────
function CalendarBlock({ entry, onEdit, onDelete, col, totalCols, canEdit }) {
  const top = minutesToPercent(timeToMinutes(entry.start_time));
  const bottom = minutesToPercent(timeToMinutes(entry.end_time));
  const height = Math.max(bottom - top, 4);
  const widthPct = 100 / totalCols;
  const leftPct = col * widthPct;

  return (
    <div
      className="absolute rounded-lg px-2 py-1 overflow-hidden shadow-sm border border-white/20 group"
      style={{
        top: `${top}%`, height: `${height}%`,
        left: `calc(${leftPct}% + 2px)`,
        width: `calc(${widthPct}% - 4px)`,
        backgroundColor: entry.color || "#3b82f6",
        minHeight: "40px",
        cursor: canEdit ? "pointer" : "default",
      }}
      onClick={() => canEdit && onEdit(entry)}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <p className="text-white text-xs font-semibold truncate leading-tight">{entry.customer_name}</p>
          <p className="text-white/80 text-[10px] truncate">{entry.start_time}–{entry.end_time}</p>
          {entry.employee_names?.length > 0 && (
            <p className="text-white/70 text-[10px] truncate">{entry.employee_names.join(", ")}</p>
          )}
        </div>
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/20"
                onClick={e => e.stopPropagation()}
              >
                <MoreHorizontal className="w-3 h-3 text-white" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={e => { e.stopPropagation(); onEdit(entry); }}>
                <Edit2 className="w-3 h-3 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={e => { e.stopPropagation(); onDelete(entry.id); }}>
                <Trash2 className="w-3 h-3 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

// ─── Day list card (mobile/day view) ───────────────────────────────────────
function DayListCard({ entry, onEdit, onDelete, canEdit }) {
  return (
    <div
      className="flex items-start gap-3 p-3 rounded-xl border bg-card hover:shadow-sm transition-shadow"
      style={{ borderLeftWidth: 4, borderLeftColor: entry.color || "#3b82f6" }}
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm">{entry.customer_name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{entry.job_address}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-xs flex items-center gap-1 text-muted-foreground">
            <Clock className="w-3 h-3" /> {entry.start_time}{entry.end_time ? `–${entry.end_time}` : ""}
          </span>
          {entry.employee_names?.length > 0 && (
            <span className="text-xs flex items-center gap-1 text-muted-foreground">
              <Users className="w-3 h-3" /> {entry.employee_names.join(", ")}
            </span>
          )}
        </div>
      </div>
      {canEdit && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 rounded-lg text-muted-foreground hover:bg-muted">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(entry)}>
              <Edit2 className="w-3 h-3 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => onDelete(entry.id)}>
              <Trash2 className="w-3 h-3 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

// ─── Main Schedule component ────────────────────────────────────────────────
export default function Schedule() {
  const { can, isAdmin } = usePermissions();
  const canView = isAdmin || can("schedule.view");
  const canEdit = isAdmin || can("schedule.edit");

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [dragOverDay, setDragOverDay] = useState(null);
  const [draggingEntry, setDraggingEntry] = useState(null);
  const [draggingJob, setDraggingJob] = useState(null);
  const [pendingJob, setPendingJob] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const { data: schedules = [] } = useQuery({
    queryKey: ["schedules"],
    queryFn: () => base44.entities.Schedule.list("-date", 200),
    enabled: canView,
  });
  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.Job.list("-created_date", 200),
    enabled: canView,
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
    enabled: canView,
  });

  const saveMutation = useMutation({
    mutationFn: ({ payload, existingId }) =>
      existingId ? base44.entities.Schedule.update(existingId, payload) : base44.entities.Schedule.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedules"] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Schedule.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["schedules"] }); toast.success("Assignment removed"); },
  });
  const moveMutation = useMutation({
    mutationFn: ({ id, newDate }) => base44.entities.Schedule.update(id, { date: format(newDate, "yyyy-MM-dd") }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["schedules"] }); toast.success("Assignment moved"); },
  });

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <CalendarDays className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-base">You don't have permission to view the schedule.</p>
      </div>
    );
  }

  function openNewModal(date) {
    setSelectedDate(date); setEditingEntry(null); setModalOpen(true);
  }
  function openEditModal(entry) {
    setSelectedDate(parseISO(entry.date)); setEditingEntry(entry); setModalOpen(true);
  }
  async function handleSave(payload, existingId) {
    await saveMutation.mutateAsync({ payload, existingId });
  }
  function handleDrop(day) {
    if (draggingJob) {
      setSelectedDate(day); setEditingEntry(null); setPendingJob(draggingJob);
      setModalOpen(true); setDraggingJob(null); setDragOverDay(null); return;
    }
    if (!draggingEntry) return;
    if (format(day, "yyyy-MM-dd") !== draggingEntry.date) {
      moveMutation.mutate({ id: draggingEntry.id, newDate: day });
    }
    setDraggingEntry(null); setDragOverDay(null);
  }

  const weekSchedules = schedules.filter(s => {
    const d = parseISO(s.date);
    return d >= weekDays[0] && d <= weekDays[6];
  });
  const daySchedules = schedules.filter(s => isSameDay(parseISO(s.date), selectedDay));

  const crewByDay = weekDays.map(day => {
    const dayEntries = weekSchedules.filter(s => isSameDay(parseISO(s.date), day));
    const empIds = new Set(dayEntries.flatMap(e => e.employee_ids || []));
    return { day, count: empIds.size, total: employees.filter(e => e.status === "active").length };
  });

  const scheduledJobIds = new Set(weekSchedules.map(s => s.job_id));
  const unscheduledJobs = jobs.filter(j =>
    ["approved", "scheduled", "in_progress", "lead", "estimate_sent"].includes(j.status)
  );
  const approvedCount = jobs.filter(j => j.status === "approved").length;

  // ── Mobile week view — all 7 days visible, expandable ───────────────────
  const MobileWeekView = () => {
    const [expandedDay, setExpandedDay] = useState(() => {
      // auto-expand today if it's in the current week
      const todayInWeek = weekDays.find(d => isToday(d));
      return todayInWeek ? format(todayInWeek, "yyyy-MM-dd") : format(weekDays[0], "yyyy-MM-dd");
    });

    return (
      <div className="space-y-3">
        {/* Week navigation */}
        <div className="flex items-center justify-between bg-card rounded-2xl border px-4 py-3">
          <button
            className="p-2 rounded-xl hover:bg-muted transition-colors"
            onClick={() => setWeekStart(w => subWeeks(w, 1))}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-sm font-bold">{format(weekDays[0], "MMM d")} – {format(weekDays[6], "MMM d, yyyy")}</p>
            <button
              className="text-xs text-primary font-medium mt-0.5"
              onClick={() => { setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 })); setExpandedDay(format(new Date(), "yyyy-MM-dd")); }}
            >
              Jump to today
            </button>
          </div>
          <button
            className="p-2 rounded-xl hover:bg-muted transition-colors"
            onClick={() => setWeekStart(w => addWeeks(w, 1))}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 7-day list */}
        {weekDays.map(day => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayEntries = weekSchedules
            .filter(s => isSameDay(parseISO(s.date), day))
            .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
          const isExpanded = expandedDay === dateKey;
          const todayDay = isToday(day);

          return (
            <div
              key={dateKey}
              className={`rounded-2xl border overflow-hidden transition-all ${
                todayDay ? "border-primary/40 shadow-sm" : "border-border"
              } ${isExpanded ? "bg-card" : "bg-card/60"}`}
            >
              {/* Day header row — tap to expand/collapse */}
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
                onClick={() => setExpandedDay(isExpanded ? null : dateKey)}
              >
                {/* Date badge */}
                <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center flex-shrink-0 font-bold ${
                  todayDay ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}>
                  <span className="text-[10px] font-semibold leading-none uppercase">{format(day, "EEE")}</span>
                  <span className="text-lg leading-tight">{format(day, "d")}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${todayDay ? "text-primary" : ""}`}>
                    {format(day, "EEEE")} {todayDay && <span className="text-xs font-normal bg-primary/10 text-primary rounded-full px-2 py-0.5 ml-1">Today</span>}
                  </p>
                  {dayEntries.length > 0 ? (
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {dayEntries.slice(0, 3).map(e => (
                        <span
                          key={e.id}
                          className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium truncate max-w-[100px]"
                          style={{ background: e.color || "#3b82f6" }}
                        >
                          {e.customer_name}
                        </span>
                      ))}
                      {dayEntries.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{dayEntries.length - 3} more</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">No assignments</p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {canEdit && (
                    <button
                      className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors"
                      onClick={e => { e.stopPropagation(); openNewModal(day); }}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                  <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                </div>
              </button>

              {/* Expanded entries */}
              {isExpanded && (
                <div className="px-4 pb-3 space-y-2 border-t border-border/50">
                  {dayEntries.length === 0 ? (
                    <div className="py-4 text-center text-muted-foreground">
                      <p className="text-sm">Nothing scheduled</p>
                      {canEdit && (
                        <Button variant="outline" size="sm" className="mt-2 gap-1" onClick={() => openNewModal(day)}>
                          <Plus className="w-3.5 h-3.5" /> Add assignment
                        </Button>
                      )}
                    </div>
                  ) : (
                    dayEntries.map(entry => (
                      <div
                        key={entry.id}
                        className="flex items-start gap-3 p-3 rounded-xl bg-muted/40"
                        style={{ borderLeft: `3px solid ${entry.color || "#3b82f6"}` }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm">{entry.customer_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{entry.job_address}</p>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            {(entry.start_time || entry.end_time) && (
                              <span className="text-xs flex items-center gap-1 text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {entry.start_time}{entry.end_time ? `–${entry.end_time}` : ""}
                              </span>
                            )}
                            {entry.employee_names?.length > 0 && (
                              <span className="text-xs flex items-center gap-1 text-muted-foreground">
                                <Users className="w-3 h-3" />
                                {entry.employee_names.join(", ")}
                              </span>
                            )}
                          </div>
                        </div>
                        {canEdit && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditModal(entry)}>
                                <Edit2 className="w-3 h-3 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(entry.id)}>
                                <Trash2 className="w-3 h-3 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Jobs to schedule */}
        {canEdit && unscheduledJobs.length > 0 && (
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b">
              <Briefcase className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Jobs to Schedule</span>
              <span className="ml-auto text-xs text-muted-foreground">{unscheduledJobs.length} jobs</span>
            </div>
            <div className="p-3 space-y-2">
              {unscheduledJobs.slice(0, 6).map(job => {
                const alreadyThisWeek = scheduledJobIds.has(job.id);
                return (
                  <button
                    key={job.id}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all active:scale-[0.98] ${
                      alreadyThisWeek ? "border-emerald-200 bg-emerald-50/50" : "bg-muted/30 hover:bg-muted/60"
                    }`}
                    onClick={() => {
                      const target = weekDays.find(d => isSameDay(d, new Date())) || weekDays[0];
                      setPendingJob(job); setSelectedDate(target); setEditingEntry(null); setModalOpen(true);
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{job.customer_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{job.address}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {alreadyThisWeek && <span className="text-xs text-emerald-600 font-medium">✓ scheduled</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${STATUS_COLORS[job.status] || "bg-muted text-muted-foreground"}`}>
                        {job.status.replace("_", " ")}
                      </span>
                      <Plus className="w-4 h-4 text-primary" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Week view (desktop) ──────────────────────────────────────────────────
  const WeekView = () => (
    <div className="flex gap-4" style={{ height: "calc(100vh - 280px)", minHeight: "500px" }}>
      {/* Jobs sidebar */}
      {canEdit && (
        <div className="w-52 flex-shrink-0 flex flex-col gap-2 overflow-hidden">
          <div className="flex items-center gap-1.5 px-1">
            <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Jobs</span>
          </div>
          <p className="text-[10px] text-muted-foreground px-1 -mt-1">Drag onto a day to schedule</p>
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
            {unscheduledJobs.length === 0 && (
              <p className="text-xs text-muted-foreground px-1">No eligible jobs.</p>
            )}
            {unscheduledJobs.map(job => {
              const alreadyThisWeek = scheduledJobIds.has(job.id);
              return (
                <div
                  key={job.id}
                  draggable
                  onDragStart={() => setDraggingJob(job)}
                  onDragEnd={() => { setDraggingJob(null); setDragOverDay(null); }}
                  className={`rounded-lg border px-2.5 py-2 cursor-grab active:cursor-grabbing text-sm transition-all select-none ${
                    draggingJob?.id === job.id ? "opacity-40" : "hover:border-primary/50 hover:shadow-sm"
                  } ${alreadyThisWeek ? "border-emerald-200 bg-emerald-50/50" : "bg-card"}`}
                >
                  <div className="flex items-start gap-1.5">
                    <GripVertical className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-xs truncate">{job.customer_name}</p>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{job.address}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${STATUS_COLORS[job.status] || "bg-muted text-muted-foreground"}`}>
                          {job.status.replace("_", " ")}
                        </span>
                        {alreadyThisWeek && <span className="text-[10px] text-emerald-600">✓</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Calendar grid */}
      <Card className="flex-1 overflow-auto min-w-0">
        <div className="flex min-w-[700px]">
          {/* Time column */}
          <div className="w-14 flex-shrink-0 border-r border-border">
            <div className="h-12 border-b border-border" />
            {HOURS.map(h => (
              <div key={h} className="h-16 border-b border-border/40 flex items-start justify-end pr-2 pt-1">
                <span className="text-[10px] text-muted-foreground">{h === 12 ? "12pm" : h < 12 ? `${h}am` : `${h - 12}pm`}</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day) => {
            const dayEntries = weekSchedules.filter(s => isSameDay(parseISO(s.date), day));
            const colLayout = computeColumns(dayEntries);
            const isDragOver = dragOverDay && isSameDay(dragOverDay, day);
            const isJobDragOver = isDragOver && !!draggingJob;

            return (
              <div
                key={day.toISOString()}
                className={`flex-1 border-r border-border last:border-r-0 transition-colors ${
                  isJobDragOver ? "bg-emerald-50 ring-1 ring-emerald-400 ring-inset"
                  : isDragOver ? "bg-primary/5" : ""
                }`}
                onDragOver={e => { e.preventDefault(); setDragOverDay(day); }}
                onDragLeave={() => setDragOverDay(null)}
                onDrop={() => handleDrop(day)}
              >
                <div
                  className={`h-12 border-b border-border flex flex-col items-center justify-center transition-colors ${
                    isToday(day) ? "bg-primary/5" : ""
                  } ${canEdit ? "cursor-pointer hover:bg-muted/40" : ""}`}
                  onClick={() => canEdit && openNewModal(day)}
                >
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">{format(day, "EEE")}</span>
                  <span className={`text-base font-bold ${isToday(day) ? "text-primary" : ""}`}>{format(day, "d")}</span>
                </div>
                <div className="relative">
                  {HOURS.map(h => (
                    <div
                      key={h}
                      className={`h-16 border-b border-border/30 transition-colors ${canEdit ? "cursor-pointer hover:bg-muted/20" : ""}`}
                      onClick={() => canEdit && openNewModal(day)}
                    />
                  ))}
                  <div className="absolute inset-0 pointer-events-none">
                    {dayEntries.map(entry => {
                      const layout = colLayout.get(entry.id) || { col: 0, totalCols: 1 };
                      return (
                        <div
                          key={entry.id}
                          className="pointer-events-auto"
                          draggable={canEdit}
                          onDragStart={() => canEdit && setDraggingEntry(entry)}
                          onDragEnd={() => { setDraggingEntry(null); setDragOverDay(null); }}
                        >
                          <CalendarBlock
                            entry={entry}
                            col={layout.col}
                            totalCols={layout.totalCols}
                            canEdit={canEdit}
                            onEdit={openEditModal}
                            onDelete={id => deleteMutation.mutate(id)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );

  if (isMobile) {
    return (
      <div className="flex flex-col space-y-4">
        {/* Mobile header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Schedule</h1>
            <p className="text-xs text-muted-foreground">
              {canEdit ? "Tap a day to expand · + to add" : "View-only"}
            </p>
          </div>
          {canEdit && (
            <Button onClick={() => openNewModal(new Date())} size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" /> Schedule
            </Button>
          )}
        </div>

        <MobileWeekView />

        {/* Approved jobs alert */}
        {approvedCount > 0 && canEdit && (
          <div className="flex items-center gap-2 text-sm bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-amber-700">
              <strong>{approvedCount} approved job{approvedCount !== 1 ? "s" : ""}</strong> awaiting scheduling.
            </span>
          </div>
        )}

        <AssignmentModal
          open={modalOpen}
          onClose={() => { setModalOpen(false); setPendingJob(null); }}
          date={selectedDate}
          existingEntry={editingEntry}
          initialJob={pendingJob}
          jobs={jobs}
          onSave={handleSave}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4">
      {/* Desktop header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Schedule</h1>
          <p className="text-sm text-muted-foreground">
            {canEdit ? "Drag jobs to schedule · Click to edit" : "View-only schedule"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(w => subWeeks(w, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            const today = new Date();
            setWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
            setSelectedDay(today);
          }}>Today</Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(w => addWeeks(w, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-sm font-semibold text-muted-foreground px-1">
            {format(weekDays[0], "MMM d")} – {format(weekDays[6], "MMM d, yyyy")}
          </span>
          {canEdit && (
            <Button onClick={() => openNewModal(new Date())} className="gap-2">
              <Plus className="w-4 h-4" /> Schedule
            </Button>
          )}
        </div>
      </div>

      {/* Crew availability bar */}
      <div className="grid grid-cols-7 gap-1.5">
        {crewByDay.map(({ day, count, total }) => (
          <div key={day.toISOString()} className="text-center">
            <div className={`text-xs font-medium mb-1 ${isToday(day) ? "text-primary" : "text-muted-foreground"}`}>
              {format(day, "EEE")}
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: total > 0 ? `${(count / total) * 100}%` : "0%" }} />
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{count}/{total}</div>
          </div>
        ))}
      </div>

      <WeekView />

      {/* Approved jobs alert */}
      {approvedCount > 0 && canEdit && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>
            <strong className="text-amber-700">{approvedCount} approved job{approvedCount !== 1 ? "s" : ""}</strong> awaiting scheduling.
          </span>
          <button
            className="ml-auto text-xs text-amber-700 font-semibold underline underline-offset-2 hover:text-amber-900"
            onClick={() => openNewModal(new Date())}
          >
            Schedule now
          </button>
        </div>
      )}

      <AssignmentModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setPendingJob(null); }}
        date={selectedDate}
        existingEntry={editingEntry}
        initialJob={pendingJob}
        jobs={jobs}
        onSave={handleSave}
      />
    </div>
  );
}