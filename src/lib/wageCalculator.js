import { isBankHoliday } from "./bankHolidays";

const OVERTIME_THRESHOLD = 40; // hours per week
const OVERTIME_MULTIPLIER = 1.5;
const BANK_HOLIDAY_MULTIPLIER = 1.5;

/**
 * Given all timesheets for an employee in a given ISO week, calculate
 * regular hours, overtime hours, and wage cost for each entry.
 *
 * Rules:
 *  - Bank holiday shifts: all hours paid at x1.5
 *  - Weekly hours > 40: excess paid at x1.5 (overtime)
 *  - Overtime is calculated across the week cumulatively in date order
 *
 * Returns a Map<timesheetId, { regular_hours, overtime_hours, is_bank_holiday, wage_cost }>
 */
export function calculateWeeklyPay(weekTimesheets, hourlyRate) {
  if (!hourlyRate || hourlyRate <= 0) return new Map();

  // Sort by date ascending so overtime accumulates correctly
  const sorted = [...weekTimesheets].sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  let cumulativeHours = 0;
  const result = new Map();

  for (const ts of sorted) {
    const hours = ts.hours || 0;
    const isHoliday = isBankHoliday(ts.date || "");

    let wageCost = 0;
    let regularHours = 0;
    let overtimeHours = 0;

    if (isHoliday) {
      // All hours on bank holiday paid at x1.5 — don't count toward OT threshold
      wageCost = hours * hourlyRate * BANK_HOLIDAY_MULTIPLIER;
      regularHours = hours;
      overtimeHours = 0;
    } else {
      const hoursBeforeOT = Math.max(0, OVERTIME_THRESHOLD - cumulativeHours);
      regularHours = Math.min(hours, hoursBeforeOT);
      overtimeHours = Math.max(0, hours - hoursBeforeOT);
      wageCost = (regularHours * hourlyRate) + (overtimeHours * hourlyRate * OVERTIME_MULTIPLIER);
      cumulativeHours += hours;
    }

    result.set(ts.id, {
      regular_hours: +regularHours.toFixed(2),
      overtime_hours: +overtimeHours.toFixed(2),
      is_bank_holiday: isHoliday,
      hourly_rate: hourlyRate,
      wage_cost: +wageCost.toFixed(2),
    });
  }

  return result;
}

/**
 * Get the ISO week key (YYYY-Www) for a date string to group timesheets by week.
 */
export function getWeekKey(dateStr) {
  if (!dateStr) return "unknown";
  const d = new Date(dateStr);
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const diff = d - startOfWeek1;
  const week = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

/**
 * Calculate pay details for ALL timesheets, grouped by employee+week.
 * Returns a Map<timesheetId, payDetails>
 */
export function calculateAllPay(timesheets, employees) {
  const empMap = {};
  employees.forEach(e => { empMap[e.id] = e; });

  // Group by employee + week
  const groups = {};
  for (const ts of timesheets) {
    const emp = empMap[ts.employee_id];
    if (!emp || !emp.hourly_rate) continue;
    const key = `${ts.employee_id}__${getWeekKey(ts.date)}`;
    if (!groups[key]) groups[key] = { timesheets: [], hourlyRate: emp.hourly_rate };
    groups[key].timesheets.push(ts);
  }

  const allResults = new Map();
  for (const group of Object.values(groups)) {
    const weekResults = calculateWeeklyPay(group.timesheets, group.hourlyRate);
    weekResults.forEach((v, k) => allResults.set(k, v));
  }
  return allResults;
}