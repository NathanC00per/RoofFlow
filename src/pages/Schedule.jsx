import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Calendar,
  Users, Clock, MoreHorizontal
} from "lucide-react";
import {
  addDays, subDays, startOfWeek, format, isSameDay,
  isToday, parseISO,
} from "date-fns";
import AssignmentModal from "@/components/schedule/AssignmentModal";
import { toast } from "sonner";
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
  const start = 6 * 60; // 6am
  const total = 12 * 60; // 12 hours span
  return ((mins - start) / total) * 100;
}

// Compute non-overlapping column layout for a set of day entries.
// Returns array of { entry, col, totalCols } so each entry gets its own horizontal slot.
function computeColumns(entries) {
  // Sort by start time
  const sorted = [...entries].map(e => ({
    e,
    start: timeToMinutes(e.start_time),
    end: timeToMinutes(e.end_time || "18:00"),
  })).sort((a, b) => a.start - b.start);

  const cols = []; // each col is array of items placed there

  for (const item of sorted) {
    // Find first column where last entry doesn't overlap
    let placed = false;
    for (const col of cols) {
      const last = col[col.length - 1];
      if (last.end <= item.start) {
        col.push(item);
        placed = true;
        break;
      }
    }
    if (!placed) cols.push([item]);
  }

  // Assign col index and total cols to each item
  const result = new Map();
  cols.forEach((col, colIdx) => {
    col.forEach(item => {
      result.set(item.e.id, { col: colIdx, totalCols: cols.length });
    });
  });
  return result;
}

function CalendarBlock({ entry, onEdit, onDelete, col, totalCols }) {
  const top = minutesToPercent(timeToMinutes(entry.start_time));
  const bottom = minutesToPercent(timeToMinutes(entry.end_time));
  const height = Math.max(bottom - top, 4);

  const gapPx = 2;
  const widthPct = 100 / totalCols;
  const leftPct = col * widthPct;

  return (
    <div
      className="absolute rounded-lg px-2 py-1 cursor-pointer overflow-hidden shadow-sm border border-white/20 group"
      style={{
        top: `${top}%`,
        height: `${height}%`,
        left: `calc(${leftPct}% + ${gapPx}px)`,
        width: `calc(${widthPct}% - ${gapPx * 2}px)`,
        backgroundColor: entry.color || "#3b82f6",
        minHeight: "36px",
      }}
      onClick={() => onEdit(entry)}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <p className="text-white text-xs font-semibold truncate leading-tight">{entry.customer_name}</p>
          <p className="text-white/75 text-[10px] truncate leading-tight">{entry.start_time}–{entry.end_time}</p>
          {entry.employee_names?.length > 0 && (
            <p className="text-white/75 text-[10px] truncate">{entry.employee_names.join(", ")}</p>
          )}
        </div>
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
            <DropdownMenuItem onClick={e => { e.stopPropagation(); onEdit(entry); }}>Edit</DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={e => { e.stopPropagation(); onDelete(entry.id); }}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default function Schedule() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [dragOverDay, setDragOverDay] = useState(null);
  const [draggingEntry, setDraggingEntry] = useState(null);
  const queryClient = useQueryClient();

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const { data: schedules = [] } = useQuery({
    queryKey: ["schedules"],
    queryFn: () => base44.entities.Schedule.list("-date", 200),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.Job.list("-created_date", 200),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const saveMutation = useMutation({
    mutationFn: async ({ payload, existingId }) => {
      if (existingId) return base44.entities.Schedule.update(existingId, payload);
      return base44.entities.Schedule.create(payload);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedules"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Schedule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      toast.success("Assignment removed");
    },
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, newDate }) => base44.entities.Schedule.update(id, { date: format(newDate, "yyyy-MM-dd") }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      toast.success("Assignment moved");
    },
  });

  function openNewModal(date) {
    setSelectedDate(date);
    setEditingEntry(null);
    setModalOpen(true);
  }

  function openEditModal(entry) {
    setSelectedDate(parseISO(entry.date));
    setEditingEntry(entry);
    setModalOpen(true);
  }

  async function handleSave(payload, existingId) {
    await saveMutation.mutateAsync({ payload, existingId });
  }

  // Drag-and-drop: drop existing entry onto a new day column
  function handleDragStart(entry) {
    setDraggingEntry(entry);
  }

  function handleDrop(day) {
    if (!draggingEntry) return;
    const newDateStr = format(day, "yyyy-MM-dd");
    if (newDateStr !== draggingEntry.date) {
      moveMutation.mutate({ id: draggingEntry.id, newDate: day });
    }
    setDraggingEntry(null);
    setDragOverDay(null);
  }

  const weekSchedules = schedules.filter(s => {
    const d = parseISO(s.date);
    return d >= weekDays[0] && d <= weekDays[6];
  });

  // Crew availability: who is scheduled each day
  const crewByDay = weekDays.map(day => {
    const dayEntries = weekSchedules.filter(s => isSameDay(parseISO(s.date), day));
    const empIds = new Set(dayEntries.flatMap(e => e.employee_ids || []));
    return { day, count: empIds.size, total: employees.filter(e => e.status === "active").length };
  });

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Schedule</h1>
          <p className="text-sm text-muted-foreground">Drag jobs to reschedule · Click a day to add</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(d => subDays(d, 7))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(d => addDays(d, 7))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-sm font-semibold text-muted-foreground hidden sm:block px-2">
            {format(weekDays[0], "MMM d")} – {format(weekDays[6], "MMM d, yyyy")}
          </span>
          <Button onClick={() => openNewModal(new Date())} className="gap-2">
            <Plus className="w-4 h-4" /> Schedule
          </Button>
        </div>
      </div>

      {/* Crew availability bar */}
      <div className="grid grid-cols-7 gap-2">
        {crewByDay.map(({ day, count, total }) => (
          <div key={day.toISOString()} className="text-center">
            <div className={`text-xs font-medium mb-1 ${isToday(day) ? "text-primary" : "text-muted-foreground"}`}>
              {format(day, "EEE")}
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: total > 0 ? `${(count / total) * 100}%` : "0%" }}
              />
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{count}/{total} crew</div>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <Card className="flex-1 overflow-auto">
        <div className="flex min-w-[700px]">
          {/* Time column */}
          <div className="w-14 flex-shrink-0 border-r border-border">
            <div className="h-12 border-b border-border" /> {/* Day header spacer */}
            {HOURS.map(h => (
              <div key={h} className="h-16 border-b border-border/40 flex items-start justify-end pr-2 pt-1">
                <span className="text-[10px] text-muted-foreground">{h === 12 ? "12pm" : h < 12 ? `${h}am` : `${h - 12}pm`}</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day, idx) => {
            const dayEntries = weekSchedules.filter(s => isSameDay(parseISO(s.date), day));
            const colLayout = computeColumns(dayEntries);
            const isDragOver = dragOverDay && isSameDay(dragOverDay, day);

            return (
              <div
                key={day.toISOString()}
                className={`flex-1 border-r border-border last:border-r-0 transition-colors ${isDragOver ? "bg-primary/5" : ""}`}
                onDragOver={e => { e.preventDefault(); setDragOverDay(day); }}
                onDragLeave={() => setDragOverDay(null)}
                onDrop={() => handleDrop(day)}
              >
                {/* Day header */}
                <div
                  className={`h-12 border-b border-border flex flex-col items-center justify-center cursor-pointer hover:bg-muted/40 transition-colors ${isToday(day) ? "bg-primary/5" : ""}`}
                  onClick={() => openNewModal(day)}
                >
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">{format(day, "EEE")}</span>
                  <span className={`text-base font-bold ${isToday(day) ? "text-primary" : ""}`}>{format(day, "d")}</span>
                </div>

                {/* Hour rows + events */}
                <div className="relative">
                  {HOURS.map(h => (
                    <div
                      key={h}
                      className="h-16 border-b border-border/30 hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => openNewModal(day)}
                    />
                  ))}

                  {/* Entries */}
                  <div className="absolute inset-0 pointer-events-none">
                    {dayEntries.map(entry => {
                      const layout = colLayout.get(entry.id) || { col: 0, totalCols: 1 };
                      return (
                        <div
                          key={entry.id}
                          className="pointer-events-auto"
                          draggable
                          onDragStart={() => handleDragStart(entry)}
                          onDragEnd={() => { setDraggingEntry(null); setDragOverDay(null); }}
                        >
                          <CalendarBlock
                            entry={entry}
                            col={layout.col}
                            totalCols={layout.totalCols}
                            onEdit={openEditModal}
                            onDelete={(id) => deleteMutation.mutate(id)}
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

      {/* Unscheduled jobs sidebar hint */}
      {jobs.filter(j => j.status === "approved").length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>
            <strong className="text-amber-700">{jobs.filter(j => j.status === "approved").length} approved job{jobs.filter(j => j.status === "approved").length !== 1 ? "s" : ""}</strong> awaiting scheduling.
          </span>
          <button
            className="ml-auto text-xs text-amber-700 underline underline-offset-2 hover:text-amber-900"
            onClick={() => openNewModal(new Date())}
          >
            Schedule now
          </button>
        </div>
      )}

      <AssignmentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        date={selectedDate}
        existingEntry={editingEntry}
        jobs={jobs}
        onSave={handleSave}
      />
    </div>
  );
}