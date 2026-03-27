import jsPDF from "jspdf";
import { computeDocumentTotals } from "@/components/documents/DocumentTotals";

const UNIT_LABELS = {
  each: "Each", sq_ft: "Sq Ft", bundle: "Bundle", roll: "Roll",
  gallon: "Gal", box: "Box", sheet: "Sheet", linear_ft: "Lin Ft",
  square: "Sq", bag: "Bag", tube: "Tube", hr: "Hr"
};

function fmt(n) { return `$${Number(n || 0).toFixed(2)}`; }
function fmtDate(d) { if (!d) return ""; try { return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); } catch { return d; } }

export function generateDocumentPDF({ type, doc, job, template = {} }) {
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const margin = 48;
  const col2 = W / 2;

  const {
    companyName = "Your Company Name",
    companyAddress = "",
    companyPhone = "",
    companyEmail = "",
    companyWebsite = "",
    logoUrl = "",
    primaryColor = "#1e3a5f",
    accentColor = "#e8730a",
    footerText = "Thank you for your business!",
  } = template;

  // ── Header band ──────────────────────────────────────────────
  const r = parseInt(primaryColor.slice(1, 3), 16);
  const g = parseInt(primaryColor.slice(3, 5), 16);
  const b = parseInt(primaryColor.slice(5, 7), 16);
  pdf.setFillColor(r, g, b);
  pdf.rect(0, 0, W, 80, "F");

  // Company name in header
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text(companyName, margin, 35);

  if (companyPhone || companyEmail) {
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    const contactLine = [companyPhone, companyEmail, companyWebsite].filter(Boolean).join("  |  ");
    pdf.text(contactLine, margin, 50);
  }
  if (companyAddress) {
    pdf.setFontSize(8);
    pdf.text(companyAddress, margin, 62);
  }

  // Document type label (right side of header)
  const ar = parseInt(accentColor.slice(1, 3), 16);
  const ag = parseInt(accentColor.slice(3, 5), 16);
  const ab = parseInt(accentColor.slice(5, 7), 16);
  pdf.setFillColor(ar, ag, ab);
  const labelW = 130;
  pdf.rect(W - margin - labelW, 16, labelW, 48, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(type.toUpperCase(), W - margin - labelW + 14, 38);
  const docNum = type === "INVOICE" ? (doc.invoice_number || "") : (doc.estimate_number || "");
  pdf.setFontSize(9);
  pdf.text(docNum, W - margin - labelW + 14, 54);

  // ── Bill To / Job Info ───────────────────────────────────────
  let y = 104;
  pdf.setTextColor(80, 80, 80);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("BILL TO", margin, y);
  pdf.text("JOB DETAILS", col2, y);
  y += 4;
  pdf.setDrawColor(ar, ag, ab);
  pdf.setLineWidth(1.5);
  pdf.line(margin, y, margin + 140, y);
  pdf.line(col2, y, col2 + 140, y);
  y += 14;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(30, 30, 30);

  if (job) {
    pdf.setFont("helvetica", "bold");
    pdf.text(job.customer_name || "", margin, y);
    pdf.setFont("helvetica", "normal");
    const addr = [job.address, job.city, job.state, job.zip].filter(Boolean).join(", ");
    pdf.text(addr, margin, y + 14);
    if (job.customer_phone) pdf.text(job.customer_phone, margin, y + 28);
    if (job.customer_email) pdf.text(job.customer_email, margin, y + 42);
  }

  // Right column: dates
  const issuedLabel = type === "INVOICE" ? "Invoice Date:" : "Estimate Date:";
  const dueLabel = type === "INVOICE" ? "Due Date:" : "Expires:";
  const issuedDate = doc.issued_date;
  const dueDate = doc.due_date || doc.expiry_date;
  pdf.setFont("helvetica", "bold");
  pdf.text(issuedLabel, col2, y);
  pdf.setFont("helvetica", "normal");
  pdf.text(fmtDate(issuedDate), col2 + 90, y);
  if (dueDate) {
    pdf.setFont("helvetica", "bold");
    pdf.text(dueLabel, col2, y + 14);
    pdf.setFont("helvetica", "normal");
    pdf.text(fmtDate(dueDate), col2 + 90, y + 14);
  }
  if (type === "INVOICE" && doc.payment_terms) {
    pdf.setFont("helvetica", "bold");
    pdf.text("Terms:", col2, y + 28);
    pdf.setFont("helvetica", "normal");
    pdf.text(doc.payment_terms, col2 + 90, y + 28);
  }

  // ── Line Items Table ─────────────────────────────────────────
  y += 70;
  const tableLeft = margin;
  const tableRight = W - margin;
  const tableWidth = tableRight - tableLeft;
  const colWidths = { desc: tableWidth * 0.38, qty: tableWidth * 0.1, unit: tableWidth * 0.1, price: tableWidth * 0.14, tax: tableWidth * 0.1, total: tableWidth * 0.18 };
  const cols = {
    desc: tableLeft,
    qty: tableLeft + colWidths.desc,
    unit: tableLeft + colWidths.desc + colWidths.qty,
    price: tableLeft + colWidths.desc + colWidths.qty + colWidths.unit,
    tax: tableLeft + colWidths.desc + colWidths.qty + colWidths.unit + colWidths.price,
    total: tableLeft + colWidths.desc + colWidths.qty + colWidths.unit + colWidths.price + colWidths.tax,
  };

  // Table header
  pdf.setFillColor(r, g, b);
  pdf.rect(tableLeft, y, tableWidth, 20, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  y += 14;
  pdf.text("Description", cols.desc + 4, y);
  pdf.text("Qty", cols.qty + 2, y);
  pdf.text("Unit", cols.unit + 2, y);
  pdf.text("Unit Price", cols.price + 2, y);
  pdf.text("Tax %", cols.tax + 2, y);
  pdf.text("Total", cols.total + 2, y);
  y += 10;

  // Rows
  pdf.setTextColor(30, 30, 30);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  const items = doc.line_items || [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (i % 2 === 0) {
      pdf.setFillColor(246, 248, 252);
      pdf.rect(tableLeft, y - 10, tableWidth, 18, "F");
    }
    const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
    const descText = pdf.splitTextToSize(item.description || "", colWidths.desc - 8);
    pdf.text(descText, cols.desc + 4, y);
    pdf.text(String(item.quantity || ""), cols.qty + 2, y);
    pdf.text(UNIT_LABELS[item.unit] || item.unit || "", cols.unit + 2, y);
    pdf.text(fmt(item.unit_price), cols.price + 2, y);
    pdf.text(item.tax_rate != null && item.tax_rate !== "" ? `${item.tax_rate}%` : "—", cols.tax + 2, y);
    pdf.text(fmt(lineTotal), cols.total + 2, y);
    y += descText.length > 1 ? 18 * descText.length : 18;

    // Page break
    if (y > H - 200) {
      pdf.addPage();
      y = margin;
    }
  }

  // ── Totals ───────────────────────────────────────────────────
  y += 10;
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.5);
  pdf.line(tableLeft, y, tableRight, y);
  y += 16;

  const { subtotal, taxBreakdown, totalTax, total, balanceDue } = computeDocumentTotals(
    items, doc.discount_amount || 0, doc.amount_paid || 0
  );

  const totalsLeft = W - margin - 220;
  function totalsRow(label, value, bold = false, colorHex = null) {
    if (bold) pdf.setFont("helvetica", "bold"); else pdf.setFont("helvetica", "normal");
    if (colorHex) {
      const tr = parseInt(colorHex.slice(1, 3), 16);
      const tg = parseInt(colorHex.slice(3, 5), 16);
      const tb = parseInt(colorHex.slice(5, 7), 16);
      pdf.setTextColor(tr, tg, tb);
    } else { pdf.setTextColor(50, 50, 50); }
    pdf.text(label, totalsLeft, y);
    pdf.text(value, W - margin, y, { align: "right" });
    y += 16;
  }

  pdf.setFontSize(9);
  totalsRow("Subtotal", fmt(subtotal));
  for (const g of taxBreakdown) {
    totalsRow(`Tax @ ${g.rate}% (on ${fmt(g.taxableAmount)})`, fmt(g.taxAmount));
  }
  if (taxBreakdown.length > 1) totalsRow("Total Tax", fmt(totalTax));
  if (doc.discount_amount > 0) totalsRow(`Discount`, `-${fmt(doc.discount_amount)}`);
  pdf.setLineWidth(0.8);
  pdf.setDrawColor(r, g, b);
  pdf.line(totalsLeft, y - 4, W - margin, y - 4);
  totalsRow("TOTAL", fmt(total), true);
  if (type === "INVOICE") {
    if (doc.amount_paid > 0) totalsRow("Amount Paid", `-${fmt(doc.amount_paid)}`);
    pdf.setFontSize(11);
    totalsRow("BALANCE DUE", fmt(Math.max(0, balanceDue)), true, accentColor);
  }

  // ── Notes & Footer ───────────────────────────────────────────
  if (doc.notes) {
    y += 16;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(80, 80, 80);
    pdf.text("Notes", margin, y);
    y += 12;
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(60, 60, 60);
    const noteLines = pdf.splitTextToSize(doc.notes, tableWidth);
    pdf.text(noteLines, margin, y);
    y += noteLines.length * 12;
  }

  // Footer bar
  const footerY = H - 36;
  pdf.setFillColor(r, g, b);
  pdf.rect(0, footerY, W, 36, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(footerText, W / 2, footerY + 22, { align: "center" });

  const filename = `${type === "INVOICE" ? doc.invoice_number : doc.estimate_number || type}_${job?.customer_name?.replace(/\s+/g, "_") || "document"}.pdf`;
  pdf.save(filename);
}