import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChevronLeft, ChevronRight, Plus, Clock, Briefcase,
  GripVertical, Users, CalendarDays, List, MoreHorizontal, Trash2, Edit2
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

  const [viewMode, setViewMode] = useState("week"); // "week" | "day"
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

  // ── Day view (mobile-friendly) ──────────────────────────────────────────
  const DayView = () => (
    <div className="space-y-4">
      {/* Day selector strip */}
      <div className="flex items-center gap-2">
        <button
          className="p-2 rounded-xl border hover:bg-muted transition-colors"
          onClick={() => { const d = subDays(selectedDay, 1); setSelectedDay(d); setWeekStart(startOfWeek(d, { weekStartsOn: 1 })); }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-1 min-w-max mx-auto justify-center">
            {weekDays.map(day => {
              const active = isSameDay(day, selectedDay);
              const hasEvents = weekSchedules.some(s => isSameDay(parseISO(s.date), day));
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(day)}
                  className={`flex flex-col items-center px-3 py-2 rounded-xl transition-all min-w-[52px] ${
                    active ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <span className="text-xs font-medium">{format(day, "EEE")}</span>
                  <span className={`text-lg font-bold ${isToday(day) && !active ? "text-primary" : ""}`}>{format(day, "d")}</span>
                  {hasEvents && (
                    <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${active ? "bg-white" : "bg-primary"}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <button
          className="p-2 rounded-xl border hover:bg-muted transition-colors"
          onClick={() => { const d = addDays(selectedDay, 1); setSelectedDay(d); setWeekStart(startOfWeek(d, { weekStartsOn: 1 })); }}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">{format(selectedDay, "EEEE, MMMM d")}</h2>
          <p className="text-sm text-muted-foreground">{daySchedules.length} assignment{daySchedules.length !== 1 ? "s" : ""}</p>
        </div>
        {canEdit && (
          <Button onClick={() => openNewModal(selectedDay)} size="sm" className="gap-2">
            <Plus className="w-4 h-4" /> Add
          </Button>
        )}
      </div>

      {/* Events list */}
      {daySchedules.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nothing scheduled for this day</p>
          {canEdit && (
            <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={() => openNewModal(selectedDay)}>
              <Plus className="w-4 h-4" /> Schedule something
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {[...daySchedules].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)).map(entry => (
            <DayListCard
              key={entry.id}
              entry={entry}
              canEdit={canEdit}
              onEdit={openEditModal}
              onDelete={id => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      {/* Unscheduled jobs (drag panel on mobile becomes a tap-to-schedule list) */}
      {canEdit && unscheduledJobs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-muted-foreground" /> Jobs to Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {unscheduledJobs.slice(0, 8).map(job => {
              const alreadyThisWeek = scheduledJobIds.has(job.id);
              return (
                <button
                  key={job.id}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all hover:border-primary/50 hover:shadow-sm ${
                    alreadyThisWeek ? "border-emerald-200 bg-emerald-50/50" : "bg-card"
                  }`}
                  onClick={() => { setPendingJob(job); setSelectedDate(selectedDay); setEditingEntry(null); setModalOpen(true); }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{job.customer_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{job.address}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${STATUS_COLORS[job.status] || "bg-muted text-muted-foreground"}`}>
                        {job.status.replace("_", " ")}
                      </span>
                      {alreadyThisWeek && <span className="text-xs text-emerald-600 font-medium">✓ this week</span>}
                    </div>
                  </div>
                  <Plus className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );

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

  return (
    <div className="flex flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Schedule</h1>
          <p className="text-sm text-muted-foreground">
            {canEdit ? "Tap a day to add · Drag jobs to reschedule" : "View-only schedule"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex rounded-xl border overflow-hidden">
            <button
              className={`px-3 py-2 text-sm font-medium flex items-center gap-1.5 transition-colors ${viewMode === "day" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
              onClick={() => setViewMode("day")}
            >
              <List className="w-4 h-4" /> Day
            </button>
            <button
              className={`px-3 py-2 text-sm font-medium flex items-center gap-1.5 transition-colors ${viewMode === "week" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
              onClick={() => setViewMode("week")}
            >
              <CalendarDays className="w-4 h-4" /> Week
            </button>
          </div>

          <Button variant="outline" size="icon" onClick={() => {
            const newW = subWeeks(weekStart, 1);
            setWeekStart(newW);
            setSelectedDay(d => subDays(d, 7));
          }}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            const today = new Date();
            setWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
            setSelectedDay(today);
          }}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => {
            const newW = addWeeks(weekStart, 1);
            setWeekStart(newW);
            setSelectedDay(d => addDays(d, 7));
          }}>
            <ChevronRight className="w-4 h-4" />
          </Button>

          <span className="text-sm font-semibold text-muted-foreground hidden sm:block px-1">
            {format(weekDays[0], "MMM d")} – {format(weekDays[6], "MMM d, yyyy")}
          </span>

          {canEdit && (
            <Button onClick={() => openNewModal(viewMode === "day" ? selectedDay : new Date())} className="gap-2">
              <Plus className="w-4 h-4" /> Schedule
            </Button>
          )}
        </div>
      </div>

      {/* Crew availability bar */}
      <div className="grid grid-cols-7 gap-1.5">
        {crewByDay.map(({ day, count, total }) => (
          <div key={day.toISOString()} className="text-center">
            <div className={`text-xs font-medium mb-1 hidden sm:block ${isToday(day) ? "text-primary" : "text-muted-foreground"}`}>
              {format(day, "EEE")}
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: total > 0 ? `${(count / total) * 100}%` : "0%" }}
              />
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{count}/{total}</div>
          </div>
        ))}
      </div>

      {/* Main content */}
      {viewMode === "day" ? <DayView /> : <WeekView />}

      {/* Approved jobs alert */}
      {approvedCount > 0 && canEdit && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>
            <strong className="text-amber-700">{approvedCount} approved job{approvedCount !== 1 ? "s" : ""}</strong> awaiting scheduling.
          </span>
          <button
            className="ml-auto text-xs text-amber-700 font-semibold underline underline-offset-2 hover:text-amber-900"
            onClick={() => openNewModal(viewMode === "day" ? selectedDay : new Date())}
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