import { Input } from "@/components/ui/input";

/**
 * Computes grouped tax breakdown from line items.
 * Each item can have a tax_rate (%). Groups all items sharing the same rate.
 * Returns array of { rate, taxableAmount, taxAmount }
 */
export function computeTaxBreakdown(items) {
  const groups = {};
  for (const item of items) {
    const rate = item.tax_rate != null && item.tax_rate !== "" ? Number(item.tax_rate) : null;
    if (rate === null || rate === 0) continue;
    const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
    if (!groups[rate]) groups[rate] = { rate, taxableAmount: 0, taxAmount: 0 };
    groups[rate].taxableAmount += lineTotal;
    groups[rate].taxAmount += lineTotal * (rate / 100);
  }
  return Object.values(groups).sort((a, b) => a.rate - b.rate);
}

/**
 * Computes all totals from line items + discount.
 * Tax is driven entirely by per-item tax_rate.
 */
export function computeDocumentTotals(items, discountAmount = 0, amountPaid = 0) {
  const subtotal = items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);
  const taxBreakdown = computeTaxBreakdown(items);
  const totalTax = taxBreakdown.reduce((s, g) => s + g.taxAmount, 0);
  const total = subtotal + totalTax - (discountAmount || 0);
  const balanceDue = total - (amountPaid || 0);
  return { subtotal, taxBreakdown, totalTax, total, balanceDue };
}

export default function DocumentTotals({ items = [], discountAmount, onDiscountChange, showPayment, amountPaid, onAmountPaidChange }) {
  const { subtotal, taxBreakdown, totalTax, total, balanceDue } = computeDocumentTotals(items, discountAmount, amountPaid);

  return (
    <div className="flex justify-end">
      <div className="w-full max-w-xs space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">${subtotal.toFixed(2)}</span>
        </div>

        {/* Per-rate tax breakdown */}
        {taxBreakdown.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Set Tax % on individual line items above</p>
        ) : taxBreakdown.map(g => (
          <div key={g.rate} className="flex justify-between text-muted-foreground">
            <span>Tax @ {g.rate}% <span className="text-xs">(on ${g.taxableAmount.toFixed(2)})</span></span>
            <span>${g.taxAmount.toFixed(2)}</span>
          </div>
        ))}

        {taxBreakdown.length > 1 && (
          <div className="flex justify-between text-muted-foreground border-t pt-1">
            <span>Total Tax</span>
            <span>${totalTax.toFixed(2)}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Discount ($)</span>
          <Input
            type="number"
            step="0.01"
            value={discountAmount || ""}
            onChange={e => onDiscountChange(Number(e.target.value))}
            className="h-7 w-20 text-xs text-right"
            placeholder="0.00"
          />
        </div>

        <div className="flex justify-between border-t pt-2 font-semibold text-base">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>

        {showPayment && (
          <>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Amount Paid</span>
              <Input
                type="number"
                step="0.01"
                value={amountPaid || ""}
                onChange={e => onAmountPaidChange(Number(e.target.value))}
                className="h-7 w-20 text-xs text-right"
                placeholder="0.00"
              />
            </div>
            <div className="flex justify-between border-t pt-2 font-bold text-base text-primary">
              <span>Balance Due</span>
              <span>${Math.max(0, balanceDue).toFixed(2)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}