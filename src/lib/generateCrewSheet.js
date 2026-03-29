import jsPDF from "jspdf";
import { format } from "date-fns";

/**
 * Generates and downloads a printable crew sheet PDF for a scheduled job.
 * @param {Object} job - The job record
 * @param {Array}  schedules - All schedule entries for this job
 * @param {Array}  employees - All employees (for name lookup)
 * @param {Object} company - Company settings from localStorage
 */
export function generateCrewSheetPDF({ job, schedules = [], employees = [], company = {} }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  const contentW = pageW - margin * 2;

  let y = margin;

  const companyName = company.name || "Roofing Company";
  const companyPhone = company.phone || "";
  const companyEmail = company.email || "";

  // ── Header ──────────────────────────────────────────────────
  doc.setFillColor(30, 58, 100); // dark blue
  doc.rect(0, 0, pageW, 72, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(companyName, margin, 32);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  if (companyPhone) doc.text(`Tel: ${companyPhone}`, margin, 48);
  if (companyEmail) doc.text(`Email: ${companyEmail}`, margin, 60);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("CREW JOB SHEET", pageW - margin, 40, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Printed: ${format(new Date(), "dd MMM yyyy, HH:mm")}`, pageW - margin, 54, { align: "right" });

  y = 90;
  doc.setTextColor(0, 0, 0);

  // ── Customer & Site ──────────────────────────────────────────
  const drawSection = (title, startY) => {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, startY, contentW, 18, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 58, 100);
    doc.text(title.toUpperCase(), margin + 8, startY + 13);
    doc.setTextColor(0, 0, 0);
    return startY + 26;
  };

  const drawRow = (label, value, currentY, indent = 0) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(label, margin + indent, currentY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(String(value || "—"), margin + indent + 110, currentY);
    return currentY + 16;
  };

  y = drawSection("Customer & Site", y);
  y = drawRow("Customer", job.customer_name, y);
  if (job.customer_phone) y = drawRow("Phone", job.customer_phone, y);
  if (job.customer_email) y = drawRow("Email", job.customer_email, y);
  const fullAddress = [job.address, job.city, job.state, job.zip].filter(Boolean).join(", ");
  y = drawRow("Address", fullAddress, y);
  y += 8;

  // ── Job Details ──────────────────────────────────────────────
  const JOB_TYPE_LABELS = {
    new_roof: "New Roof", repair: "Repair", inspection: "Inspection",
    gutter: "Gutter", siding: "Siding", other: "Other",
  };

  y = drawSection("Job Details", y);
  y = drawRow("Job Type", JOB_TYPE_LABELS[job.job_type] || job.job_type, y);
  y = drawRow("Priority", job.priority ? job.priority.charAt(0).toUpperCase() + job.priority.slice(1) : "—", y);
  if (job.start_date) y = drawRow("Start Date", format(new Date(job.start_date), "dd MMM yyyy"), y);
  if (job.end_date) y = drawRow("End Date", format(new Date(job.end_date), "dd MMM yyyy"), y);
  y += 8;

  // ── Schedule Entries ─────────────────────────────────────────
  if (schedules.length > 0) {
    y = drawSection("Scheduled Assignments", y);

    for (const sched of schedules) {
      // Date + time header
      const dateStr = sched.date ? format(new Date(sched.date), "EEEE, dd MMM yyyy") : "—";
      const timeStr = sched.start_time && sched.end_time
        ? `${sched.start_time} – ${sched.end_time}`
        : sched.start_time || "";

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(30, 58, 100);
      doc.text(`${dateStr}${timeStr ? "  ·  " + timeStr : ""}`, margin + 8, y);
      y += 14;

      // Crew
      const empIds = sched.employee_ids || [];
      const names = empIds.map(id => {
        const emp = employees.find(e => e.id === id);
        return emp ? `${emp.first_name} ${emp.last_name}` : id;
      });
      if (names.length > 0) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.text(`Crew: ${names.join(", ")}`, margin + 8, y);
        y += 14;
      }

      // Notes
      if (sched.notes) {
        doc.setFont("helvetica", "italic");
        doc.setTextColor(71, 85, 105);
        const lines = doc.splitTextToSize(`Notes: ${sched.notes}`, contentW - 16);
        doc.text(lines, margin + 8, y);
        y += lines.length * 13 + 2;
      }

      y += 6;

      // divider between entries
      if (schedules.indexOf(sched) < schedules.length - 1) {
        doc.setDrawColor(226, 232, 240);
        doc.line(margin + 8, y, margin + contentW - 8, y);
        y += 8;
      }
    }
    y += 6;
  }

  // ── Job Notes ────────────────────────────────────────────────
  if (job.description) {
    y = drawSection("Job Notes", y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    const lines = doc.splitTextToSize(job.description, contentW - 16);
    doc.text(lines, margin + 8, y);
    y += lines.length * 13 + 10;
  }

  // ── Crew Sign-off ────────────────────────────────────────────
  y = Math.max(y, doc.internal.pageSize.getHeight() - 130);
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, margin + contentW, y);
  y += 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("CREW ACKNOWLEDGEMENT", margin, y);
  y += 18;

  const sigBoxW = (contentW - 20) / 2;
  doc.setDrawColor(148, 163, 184);
  doc.rect(margin, y, sigBoxW, 48);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Crew Lead Signature", margin + 6, y + 42);

  doc.rect(margin + sigBoxW + 20, y, sigBoxW, 48);
  doc.text("Date", margin + sigBoxW + 26, y + 42);

  // ── Save ─────────────────────────────────────────────────────
  const safeName = (job.customer_name || "job").replace(/\s+/g, "_");
  doc.save(`crew_sheet_${safeName}.pdf`);
}