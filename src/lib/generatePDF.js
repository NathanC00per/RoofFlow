import jsPDF from "jspdf";
import { computeDocumentTotals } from "@/components/documents/DocumentTotals";

const UNIT_LABELS = {
  each: "Each", sq_ft: "Sq Ft", bundle: "Bundle", roll: "Roll",
  gallon: "Gal", box: "Box", sheet: "Sheet", linear_ft: "Lin Ft",
  square: "Sq", bag: "Bag", tube: "Tube", hr: "Hr"
};

function fmt(n) { return `€${Number(n || 0).toFixed(2)}`; }
function fmtDate(d) {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("en-IE", { year: "numeric", month: "short", day: "numeric" }); }
  catch { return d; }
}

function hexToRgb(hex) {
  const h = (hex || "#000000").replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function isEnabled(template, id) {
  if (!template || !template.elements) return true;
  const el = template.elements.find(e => e.id === id);
  return el ? el.enabled : true;
}

/**
 * @param {object} opts
 *   type       - "INVOICE" | "ESTIMATE"
 *   doc        - the invoice/estimate record
 *   job        - the linked job record
 *   company    - company settings object (from COMPANY_STORAGE_KEY)
 *   template   - template object with elements[] and customNotes
 */
export function generateDocumentPDF({ type, doc, job, company = {}, template = {} }) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const margin = 44;
  const col2 = W / 2 + 10;

  const {
    companyName = "Your Company",
    companyAddress = "",
    companyPhone = "",
    companyEmail = "",
    companyWebsite = "",
    vatNumber = "",
    companyReg = "",
    primaryColor = "#1e3a5f",
    accentColor = "#e8730a",
    footerText = "Thank you for your business!",
    bankName = "",
    accountName = "",
    iban = "",
    bic = "",
    paymentNotes = "",
  } = company;

  const [pr, pg, pb] = hexToRgb(primaryColor);
  const [ar, ag, ab] = hexToRgb(accentColor);

  let y = 0;

  // ── HEADER ────────────────────────────────────────────────────
  if (isEnabled(template, "header")) {
    pdf.setFillColor(pr, pg, pb);
    pdf.rect(0, 0, W, 78, "F");

    let textX = margin;
    // Logo (if provided and loadable)
    if (company.logoUrl) {
      try {
        pdf.addImage(company.logoUrl, margin, 10, 48, 48);
        textX = margin + 56;
      } catch {}
    }

    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text(companyName || "Your Company", textX, 30);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    const contactParts = [companyPhone, companyEmail, companyWebsite].filter(Boolean);
    if (contactParts.length) pdf.text(contactParts.join("  |  "), textX, 44);
    const infoParts = [companyAddress, vatNumber ? `VAT: ${vatNumber}` : "", companyReg ? `Reg: ${companyReg}` : ""].filter(Boolean);
    if (infoParts.length) pdf.text(infoParts.join("  |  "), textX, 56);

    // Doc type badge
    pdf.setFillColor(ar, ag, ab);
    const labelW = 120;
    pdf.rect(W - margin - labelW, 14, labelW, 50, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text(type, W - margin - labelW + 12, 36);
    const docNum = type === "INVOICE" ? (doc.invoice_number || "") : (doc.estimate_number || "");
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.text(docNum, W - margin - labelW + 12, 50);

    y = 96;
  } else {
    y = 24;
  }

  // ── BILL TO + DOC META ────────────────────────────────────────
  const showBillTo = isEnabled(template, "bill_to");
  const showMeta = isEnabled(template, "doc_meta");

  if (showBillTo || showMeta) {
    pdf.setTextColor(80, 80, 80);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);

    if (showBillTo) {
      pdf.text("BILL TO", margin, y);
      pdf.setDrawColor(ar, ag, ab);
      pdf.setLineWidth(1.5);
      pdf.line(margin, y + 3, margin + 120, y + 3);
    }

    if (showMeta) {
      pdf.text("DOCUMENT DETAILS", col2, y);
      pdf.setDrawColor(ar, ag, ab);
      pdf.setLineWidth(1.5);
      pdf.line(col2, y + 3, col2 + 140, y + 3);
    }

    y += 16;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(20, 20, 20);

    if (showBillTo && job) {
      pdf.setFont("helvetica", "bold");
      pdf.text(job.customer_name || "", margin, y);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      const addr = [job.address, job.city, job.zip].filter(Boolean).join(", ");
      pdf.text(addr, margin, y + 12);
      if (job.customer_phone) pdf.text(job.customer_phone, margin, y + 24);
      if (job.customer_email) pdf.text(job.customer_email, margin, y + 36);
    }

    if (showMeta) {
      pdf.setFontSize(9);
      const rows = [
        [type === "INVOICE" ? "Invoice Date:" : "Estimate Date:", fmtDate(doc.issued_date)],
        [type === "INVOICE" ? "Due Date:" : "Expires:", fmtDate(doc.due_date || doc.expiry_date)],
        ...(type === "INVOICE" && doc.payment_terms ? [["Terms:", doc.payment_terms]] : []),
      ].filter(r => r[1]);
      let ry = y;
      for (const [label, val] of rows) {
        pdf.setFont("helvetica", "bold");
        pdf.text(label, col2, ry);
        pdf.setFont("helvetica", "normal");
        pdf.text(val, col2 + 88, ry);
        ry += 14;
      }
    }

    y += 60;
  }

  // ── LINE ITEMS ────────────────────────────────────────────────
  if (isEnabled(template, "line_items")) {
    const tableLeft = margin;
    const tableRight = W - margin;
    const tableWidth = tableRight - tableLeft;
    const cw = { desc: tableWidth * 0.38, qty: tableWidth * 0.09, unit: tableWidth * 0.09, price: tableWidth * 0.14, tax: tableWidth * 0.1, total: tableWidth * 0.2 };
    const cx = {
      desc: tableLeft,
      qty: tableLeft + cw.desc,
      unit: tableLeft + cw.desc + cw.qty,
      price: tableLeft + cw.desc + cw.qty + cw.unit,
      tax: tableLeft + cw.desc + cw.qty + cw.unit + cw.price,
      total: tableLeft + cw.desc + cw.qty + cw.unit + cw.price + cw.tax,
    };

    pdf.setFillColor(pr, pg, pb);
    pdf.rect(tableLeft, y, tableWidth, 18, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    y += 13;
    pdf.text("Description", cx.desc + 4, y);
    pdf.text("Qty", cx.qty + 2, y);
    pdf.text("Unit", cx.unit + 2, y);
    pdf.text("Unit Price", cx.price + 2, y);
    pdf.text("VAT %", cx.tax + 2, y);
    pdf.text("Total", cx.total + 2, y);
    y += 8;

    pdf.setTextColor(20, 20, 20);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    const items = doc.line_items || [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
      const descText = pdf.splitTextToSize(item.description || "", cw.desc - 8);
      const rowH = Math.max(18, descText.length * 12);

      if (i % 2 === 0) {
        pdf.setFillColor(245, 247, 252);
        pdf.rect(tableLeft, y - 1, tableWidth, rowH, "F");
      }

      pdf.text(descText, cx.desc + 4, y + 9);
      pdf.text(String(item.quantity ?? ""), cx.qty + 2, y + 9);
      pdf.text(UNIT_LABELS[item.unit] || item.unit || "", cx.unit + 2, y + 9);
      pdf.text(fmt(item.unit_price), cx.price + 2, y + 9);
      pdf.text(item.tax_rate != null && item.tax_rate !== "" ? `${item.tax_rate}%` : "—", cx.tax + 2, y + 9);
      pdf.text(fmt(lineTotal), cx.total + 2, y + 9);
      y += rowH;

      if (y > H - 180) { pdf.addPage(); y = margin; }
    }
    y += 8;
  }

  // ── TOTALS ────────────────────────────────────────────────────
  if (isEnabled(template, "totals")) {
    const items = doc.line_items || [];
    const { subtotal, taxBreakdown, totalTax, total, balanceDue } = computeDocumentTotals(
      items, doc.discount_amount || 0, doc.amount_paid || 0
    );

    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.5);
    pdf.line(margin, y, W - margin, y);
    y += 12;

    const totalsLeft = W - margin - 200;
    function totalsRow(label, val, bold = false, colorRgb = null) {
      pdf.setFontSize(9);
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      if (colorRgb) pdf.setTextColor(...colorRgb); else pdf.setTextColor(50, 50, 50);
      pdf.text(label, totalsLeft, y);
      pdf.text(val, W - margin, y, { align: "right" });
      y += 14;
    }

    totalsRow("Subtotal", fmt(subtotal));
    for (const g of taxBreakdown) {
      totalsRow(`VAT @ ${g.rate}% (on ${fmt(g.taxableAmount)})`, fmt(g.taxAmount));
    }
    if (taxBreakdown.length > 1) totalsRow("Total VAT", fmt(totalTax));
    if ((doc.discount_amount || 0) > 0) totalsRow("Discount", `-${fmt(doc.discount_amount)}`);

    pdf.setLineWidth(0.8);
    pdf.setDrawColor(pr, pg, pb);
    pdf.line(totalsLeft, y - 2, W - margin, y - 2);
    totalsRow("TOTAL", fmt(total), true);

    if (type === "INVOICE") {
      if ((doc.amount_paid || 0) > 0) totalsRow("Amount Paid", `-${fmt(doc.amount_paid)}`);
      y += 2;
      pdf.setFontSize(11);
      totalsRow("BALANCE DUE", fmt(Math.max(0, balanceDue)), true, [ar, ag, ab]);
    }

    y += 10;
  }

  // ── PAYMENT INFO ─────────────────────────────────────────────
  if (type === "INVOICE" && isEnabled(template, "payment_info") && (iban || bic || bankName)) {
    if (y > H - 160) { pdf.addPage(); y = margin; }

    pdf.setTextColor(80, 80, 80);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("PAYMENT DETAILS", margin, y);
    pdf.setDrawColor(ar, ag, ab);
    pdf.setLineWidth(1.5);
    pdf.line(margin, y + 3, margin + 140, y + 3);
    y += 16;

    pdf.setFillColor(248, 249, 252);
    const payBlockH = [bankName, accountName, iban, bic, paymentNotes].filter(Boolean).length * 13 + 12;
    pdf.rect(margin, y - 6, W - margin * 2, payBlockH, "F");

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(30, 30, 30);
    const payRows = [
      ["Bank:", bankName],
      ["Account Name:", accountName],
      ["IBAN:", iban],
      ["BIC/SWIFT:", bic],
    ].filter(r => r[1]);

    for (const [label, val] of payRows) {
      pdf.setFont("helvetica", "bold");
      pdf.text(label, margin + 6, y + 6);
      pdf.setFont("helvetica", "normal");
      pdf.text(val, margin + 90, y + 6);
      y += 13;
    }
    if (paymentNotes) {
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(8);
      pdf.setTextColor(80, 80, 80);
      pdf.text(paymentNotes, margin + 6, y + 6);
      y += 13;
    }
    y += 14;
  }

  // ── NOTES ────────────────────────────────────────────────────
  const combinedNotes = [doc.notes, template.customNotes].filter(Boolean).join("\n\n");
  if (isEnabled(template, "notes") && combinedNotes) {
    if (y > H - 120) { pdf.addPage(); y = margin; }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(80, 80, 80);
    pdf.text("NOTES", margin, y);
    y += 12;
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(60, 60, 60);
    const noteLines = pdf.splitTextToSize(combinedNotes, W - margin * 2);
    pdf.text(noteLines, margin, y);
    y += noteLines.length * 12 + 10;
  }

  // ── FOOTER ───────────────────────────────────────────────────
  if (isEnabled(template, "footer")) {
    const footerY = H - 32;
    pdf.setFillColor(pr, pg, pb);
    pdf.rect(0, footerY, W, 32, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(footerText || "Thank you for your business!", W / 2, footerY + 20, { align: "center" });
  }

  const filename = `${type === "INVOICE" ? (doc.invoice_number || "INVOICE") : (doc.estimate_number || "ESTIMATE")}_${(job?.customer_name || "document").replace(/\s+/g, "_")}.pdf`;
  pdf.save(filename);
}