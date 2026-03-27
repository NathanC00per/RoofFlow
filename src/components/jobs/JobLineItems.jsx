import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "lucide-react";

const TYPE_LABELS = { material: "Material", labor: "Labor", other: "Other" };
const TYPE_COLORS = {
  material: "bg-blue-50 text-blue-700",
  labor: "bg-purple-50 text-purple-700",
  other: "bg-muted text-muted-foreground",
};

const fmt = (n) => `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function JobLineItems({ job }) {
  const items = job.line_items || [];
  if (items.length === 0) return null;

  const subtotal = items.reduce((s, li) => s + (li.total || (li.quantity || 0) * (li.unit_price || 0)), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" /> Intake Line Items
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="text-left pb-2">Description</th>
                <th className="text-center pb-2">Type</th>
                <th className="text-right pb-2">Qty</th>
                <th className="text-right pb-2">Unit Price</th>
                <th className="text-right pb-2">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((li, i) => {
                const total = li.total || (li.quantity || 0) * (li.unit_price || 0);
                return (
                  <tr key={i} className="text-sm">
                    <td className="py-2 pr-4">
                      <p className="font-medium">{li.description || "—"}</p>
                      {li.unit && <p className="text-xs text-muted-foreground">{li.unit}</p>}
                    </td>
                    <td className="py-2 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[li.type] || TYPE_COLORS.other}`}>
                        {TYPE_LABELS[li.type] || li.type || "—"}
                      </span>
                    </td>
                    <td className="py-2 text-right">{li.quantity ?? "—"}</td>
                    <td className="py-2 text-right">{li.unit_price != null ? fmt(li.unit_price) : "—"}</td>
                    <td className="py-2 text-right font-semibold">{fmt(total)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t">
                <td colSpan={4} className="pt-3 text-right text-sm font-semibold">Subtotal</td>
                <td className="pt-3 text-right font-bold">{fmt(subtotal)}</td>
              </tr>
              {job.discount_amount > 0 && (
                <tr>
                  <td colSpan={4} className="pt-1 text-right text-sm text-muted-foreground">Discount</td>
                  <td className="pt-1 text-right text-muted-foreground">-{fmt(job.discount_amount)}</td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}