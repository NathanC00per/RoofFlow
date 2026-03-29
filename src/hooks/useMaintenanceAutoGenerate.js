import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { addMonths, addWeeks, addYears, format, isPast, parseISO } from "date-fns";
import { toast } from "sonner";

function getNextDate(currentDate, frequency) {
  const d = parseISO(currentDate);
  switch (frequency) {
    case "weekly":       return format(addWeeks(d, 1), "yyyy-MM-dd");
    case "monthly":      return format(addMonths(d, 1), "yyyy-MM-dd");
    case "quarterly":    return format(addMonths(d, 3), "yyyy-MM-dd");
    case "bi-annually":  return format(addMonths(d, 6), "yyyy-MM-dd");
    case "annually":     return format(addYears(d, 1), "yyyy-MM-dd");
    default:             return format(addMonths(d, 6), "yyyy-MM-dd");
  }
}

/**
 * Runs once per app session. Finds all active maintenance contracts whose
 * next_service_date is today or in the past, and auto-generates service jobs.
 */
export function useMaintenanceAutoGenerate() {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    async function run() {
      const contracts = await base44.entities.MaintenanceContract.filter({ status: "active" });

      const due = contracts.filter(
        (c) => c.next_service_date && isPast(parseISO(c.next_service_date))
      );

      if (due.length === 0) return;

      let generated = 0;

      for (const contract of due) {
        // Avoid duplicates: check if a job already exists for this contract on this date
        const existing = await base44.entities.Job.filter({
          maintenance_contract_id: contract.id,
          start_date: contract.next_service_date,
        });

        if (existing.length > 0) {
          // Already generated — just advance the date
          await base44.entities.MaintenanceContract.update(contract.id, {
            next_service_date: getNextDate(contract.next_service_date, contract.frequency),
          });
          continue;
        }

        await base44.entities.Job.create({
          customer_name: contract.customer_name,
          customer_email: contract.customer_email,
          customer_phone: contract.customer_phone,
          customer_id: contract.customer_id,
          address: contract.service_address,
          city: contract.service_city,
          state: contract.service_state,
          zip: contract.service_zip,
          job_type: "maintenance",
          status: "scheduled",
          priority: "medium",
          start_date: contract.next_service_date,
          estimated_cost: contract.estimated_cost_per_visit,
          description: `Auto-generated maintenance visit from contract: ${contract.contract_name}\n\n${contract.description || ""}`.trim(),
          roof_type: contract.roof_type,
          assigned_employees: contract.assigned_employee_ids || [],
          maintenance_contract_id: contract.id,
          maintenance_contract_name: contract.contract_name,
        });

        await base44.entities.MaintenanceContract.update(contract.id, {
          next_service_date: getNextDate(contract.next_service_date, contract.frequency),
          jobs_generated: (contract.jobs_generated || 0) + 1,
        });

        generated++;
      }

      if (generated > 0) {
        toast.success(`${generated} maintenance job${generated > 1 ? "s" : ""} auto-generated`, {
          description: "Service visits were due and have been added to the job board.",
        });
      }
    }

    run().catch(console.error);
  }, []);
}