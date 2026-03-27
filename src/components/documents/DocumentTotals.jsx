import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function DocumentTotals({ subtotal, taxRate, onTaxRateChange, discountAmount, onDiscountChange, showPayment, amountPaid, onAmountPaidChange }) {
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount - (discountAmount || 0);
  const balanceDue = showPayment ? total - (amountPaid || 0) : null;

  return (
    <div className="flex justify-end">
      <div className="w-full max-w-xs space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Tax (%)</span>
          <Input
            type="number"
            step="0.1"
            value={taxRate || ""}
            onChange={e => onTaxRateChange(Number(e.target.value))}
            className="h-7 w-20 text-xs text-right"
            placeholder="0"
          />
        </div>
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