import jsPDF from "jspdf";
import { format } from "date-fns";

const ROOF_TYPE_LABELS = {
  asphalt_shingle: "Asphalt Shingle", metal: "Metal", tile: "Tile",
  flat: "Flat / Felt", slate: "Slate", wood_shake: "Wood Shake", other: "Other",
};

const JOB_TYPE_LABELS = {
  new_roof: "New Roof", repair: "Repair", inspection: "Inspection",
  gutter: "Gutter", siding: "Siding", maintenance: "Maintenance", other: "Other",
};

export function generateCrewSheetPDF({ job, schedules = [], employees = [], company = {} }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;

  let y = margin;

  const companyName = company.name || "Roofing Company";
  const companyPhone = company.phone || "";
  const companyEmail = company.email || "";

  // ── Helper: new page if needed ───────────────────────────────
  function checkPageBreak(needed = 30) {
    if (y + needed > pageH - 60) {
      doc.addPage();
      y = margin;
    }
  }

  // ── Header ──────────────────────────────────────────────────
  doc.setFillColor(30, 58, 100);
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

  // ── Reusable helpers ─────────────────────────────────────────
  const drawSection = (title) => {
    checkPageBreak(30);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y, contentW, 18, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 58, 100);
    doc.text(title.toUpperCase(), margin + 8, y + 13);
    doc.setTextColor(0, 0, 0);
    y += 26;
  };

  const drawRow = (label, value, indent = 0) => {
    if (!value && value !== 0) return;
    checkPageBreak(18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(label, margin + indent, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    const lines = doc.splitTextToSize(String(value), contentW - indent - 120);
    doc.text(lines, margin + indent + 110, y);
    y += lines.length * 13 + 3;
  };

  const drawTextBlock = (text, indent = 8) => {
    if (!text) return;
    checkPageBreak(20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    const lines = doc.splitTextToSize(text, contentW - indent - 8);
    // check page break per chunk of lines
    for (let i = 0; i < lines.length; i++) {
      checkPageBreak(14);
      doc.text(lines[i], margin + indent, y);
      y += 13;
    }
    y += 4;
  };

  // ── 1. Customer & Site ───────────────────────────────────────
  drawSection("Customer & Site");
  drawRow("Customer", job.customer_name);
  if (job.customer_phone) drawRow("Phone", job.customer_phone);
  if (job.customer_email) drawRow("Email", job.customer_email);
  const fullAddress = [job.address, job.city, job.state, job.zip].filter(Boolean).join(", ");
  drawRow("Address", fullAddress);
  y += 8;

  // ── 2. Job Details ───────────────────────────────────────────
  drawSection("Job Details");
  drawRow("Job Type", JOB_TYPE_LABELS[job.job_type] || job.job_type);
  drawRow("Priority", job.priority ? job.priority.charAt(0).toUpperCase() + job.priority.slice(1) : null);
  drawRow("Status", job.status ? job.status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : null);
  if (job.start_date) drawRow("Start Date", format(new Date(job.start_date + "T00:00:00"), "dd MMM yyyy"));
  if (job.end_date) drawRow("End Date", format(new Date(job.end_date + "T00:00:00"), "dd MMM yyyy"));
  if (job.duration_days) drawRow("Est. Duration", `${job.duration_days} working day${job.duration_days > 1 ? "s" : ""}`);
  if (job.crew_required) drawRow("Crew Required", `${job.crew_required} person${job.crew_required > 1 ? "s" : ""}`);
  if (job.description) {
    checkPageBreak(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Description", margin, y);
    y += 13;
    drawTextBlock(job.description);
  }
  y += 4;

  // ── 3. Roof Assessment ───────────────────────────────────────
  const hasAssessment = job.roof_type || job.roof_condition || job.roof_age_years || job.roof_area_sq_ft || job.layers_count || job.damage_types?.length;
  if (hasAssessment) {
    drawSection("Roof Assessment");
    if (job.roof_type) drawRow("Roof Type", ROOF_TYPE_LABELS[job.roof_type] || job.roof_type);
    if (job.roof_condition) drawRow("Condition", job.roof_condition.charAt(0).toUpperCase() + job.roof_condition.slice(1));
    if (job.roof_age_years) drawRow("Roof Age", `${job.roof_age_years} years`);
    if (job.roof_area_sq_ft) drawRow("Total Area", `${Number(job.roof_area_sq_ft).toLocaleString()} sq ft`);
    if (job.layers_count) drawRow("Layers", String(job.layers_count));
    if (job.damage_types?.length) drawRow("Damage Types", job.damage_types.join(", "));
    y += 4;
  }

  // ── 4. Roof Areas / Sections ─────────────────────────────────
  if (job.roof_areas?.length) {
    drawSection(`Roof Areas / Sections (${job.roof_areas.length})`);
    job.roof_areas.forEach((area, idx) => {
      checkPageBreak(40);
      // Area header
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 2, contentW, 16, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(30, 58, 100);
      doc.text(`#${idx + 1}  ${area.name || "Unnamed Area"}`, margin + 8, y + 10);
      y += 22;

      const parts = [];
      if (area.roof_type) parts.push(ROOF_TYPE_LABELS[area.roof_type] || area.roof_type);
      if (area.condition) parts.push(`Condition: ${area.condition}`);
      if (area.area_sq_ft) parts.push(`${Number(area.area_sq_ft).toLocaleString()} sq ft`);
      if (parts.length) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(parts.join("  ·  "), margin + 8, y);
        y += 14;
      }
      if (area.notes) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        const lines = doc.splitTextToSize(area.notes, contentW - 20);
        lines.forEach(line => {
          checkPageBreak(14);
          doc.text(line, margin + 8, y);
          y += 13;
        });
      }
      if (area.photos?.length) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`📷 ${area.photos.length} photo${area.photos.length !== 1 ? "s" : ""} attached`, margin + 8, y);
        y += 13;
      }
      y += 6;
    });
    y += 4;
  }

  // ── 5. Plan of Action ────────────────────────────────────────
  if (job.plan_of_action) {
    drawSection("Plan of Action / Scope of Works");
    drawTextBlock(job.plan_of_action);
    y += 4;
  }

  // ── 6. Materials Required ────────────────────────────────────
  if (job.plan_materials_required) {
    drawSection("Materials Required");
    drawTextBlock(job.plan_materials_required);
    y += 4;
  }

  // ── 7. Access & Site Notes ───────────────────────────────────
  if (job.plan_access_notes) {
    drawSection("Access & Site Notes");
    drawTextBlock(job.plan_access_notes);
    y += 4;
  }

  // ── 8. Health & Safety ───────────────────────────────────────
  if (job.plan_health_safety) {
    drawSection("Health & Safety");
    drawTextBlock(job.plan_health_safety);
    y += 4;
  }

  // ── 9. Timeline ──────────────────────────────────────────────
  if (job.plan_timeline) {
    drawSection("Estimated Timeline");
    drawTextBlock(job.plan_timeline);
    y += 4;
  }

  // ── 10. Scheduled Assignments ────────────────────────────────
  if (schedules.length > 0) {
    drawSection("Scheduled Assignments");

    schedules.forEach((sched, i) => {
      checkPageBreak(50);
      const dateStr = sched.date ? format(new Date(sched.date + "T00:00:00"), "EEEE, dd MMM yyyy") : "—";
      const timeStr = sched.start_time && sched.end_time
        ? `${sched.start_time} – ${sched.end_time}`
        : sched.start_time || "";

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(30, 58, 100);
      doc.text(`${dateStr}${timeStr ? "  ·  " + timeStr : ""}`, margin + 8, y);
      y += 14;

      const names = (sched.employee_ids || []).map(id => {
        const emp = employees.find(e => e.id === id);
        return emp ? `${emp.first_name} ${emp.last_name}` : id;
      });
      if (names.length) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.text(`Crew: ${names.join(", ")}`, margin + 8, y);
        y += 14;
      }
      if (sched.notes) {
        doc.setFont("helvetica", "italic");
        doc.setTextColor(71, 85, 105);
        const lines = doc.splitTextToSize(`Notes: ${sched.notes}`, contentW - 16);
        lines.forEach(line => { checkPageBreak(14); doc.text(line, margin + 8, y); y += 13; });
      }
      y += 6;
      if (i < schedules.length - 1) {
        doc.setDrawColor(226, 232, 240);
        doc.line(margin + 8, y, margin + contentW - 8, y);
        y += 8;
      }
    });
    y += 6;
  }

  // ── 11. Crew Sign-off ────────────────────────────────────────
  checkPageBreak(100);
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