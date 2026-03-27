import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, PlusCircle, Package, Wrench, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_ICONS = { material: Package, labor: Wrench, other: MoreHorizontal };

const UNIT_LABELS = {
  each: "Each", sq_ft: "Sq Ft", bundle: "Bundle", roll: "Roll",
  gallon: "Gal", box: "Box", sheet: "Sheet", linear_ft: "Lin Ft",
  square: "Sq", bag: "Bag", tube: "Tube", hr: "Hr"
};

function LineItemRow({ item, index, materials, onUpdate, onRemove }) {
  const Icon = TYPE_ICONS[item.type] || MoreHorizontal;

  const handleMaterialSelect = (matId) => {
    const mat = materials.find(m => m.id === matId);
    if (mat) {
      onUpdate(index, {
        ...item,
        material_id: matId,
        description: mat.name,
        unit: mat.unit,
        unit_price: mat.unit_price,
        total: (item.quantity || 1) * mat.unit_price,
      });
    }
  };

  const handleQtyOrPrice = (field, value) => {
    const updated = { ...item, [field]: Number(value) };
    updated.total = (updated.quantity || 0) * (updated.unit_price || 0);
    onUpdate(index, updated);
  };

  return (
    <div className="grid grid-cols-12 gap-2 items-start py-2 border-b last:border-0">
      {/* Type */}
      <div className="col-span-12 sm:col-span-2">
        <Select value={item.type} onValueChange={v => onUpdate(index, { ...item, type: v, material_id: "", description: "" })}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="material">Material</SelectItem>
            <SelectItem value="labor">Labor</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Description / Material picker */}
      <div className="col-span-12 sm:col-span-4">
        {item.type === "material" ? (
          <Select value={item.material_id || ""} onValueChange={handleMaterialSelect}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select material..." />
            </SelectTrigger>
            <SelectContent>
              {materials.map(m => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name} <span className="text-muted-foreground ml-1">(${m.unit_price}/{UNIT_LABELS[m.unit] || m.unit})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            className="h-8 text-xs"
            value={item.description || ""}
            onChange={e => onUpdate(index, { ...item, description: e.target.value })}
            placeholder={item.type === "labor" ? "e.g. Labor - Tear off & Install" : "Description"}
          />
        )}
      </div>

      {/* Qty */}
      <div className="col-span-4 sm:col-span-2">
        <Input
          type="number"
          className="h-8 text-xs"
          value={item.quantity || ""}
          onChange={e => handleQtyOrPrice("quantity", e.target.value)}
          placeholder="Qty"
        />
      </div>

      {/* Unit */}
      <div className="col-span-4 sm:col-span-1">
        <Input
          className="h-8 text-xs"
          value={item.unit || ""}
          onChange={e => onUpdate(index, { ...item, unit: e.target.value })}
          placeholder="Unit"
        />
      </div>

      {/* Unit price */}
      <div className="col-span-4 sm:col-span-2">
        <Input
          type="number"
          step="0.01"
          className="h-8 text-xs"
          value={item.unit_price || ""}
          onChange={e => handleQtyOrPrice("unit_price", e.target.value)}
          placeholder="$/unit"
        />
      </div>

      {/* Total + remove */}
      <div className="col-span-12 sm:col-span-1 flex items-center justify-between sm:justify-end gap-1">
        <span className="text-xs font-semibold sm:hidden">Total:</span>
        <span className="text-xs font-semibold">${((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}</span>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => onRemove(index)}>
          <Trash2 className="w-3 h-3 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

export default function LineItemsEditor({ items, onChange, materials }) {
  const addItem = (type = "material") => {
    onChange([...items, { type, description: "", quantity: 1, unit: "each", unit_price: 0, total: 0 }]);
  };

  const updateItem = (index, updated) => {
    const next = [...items];
    next[index] = updated;
    onChange(next);
  };

  const removeItem = (index) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div>
      {/* Header row — desktop only */}
      <div className="hidden sm:grid grid-cols-12 gap-2 text-xs text-muted-foreground font-medium mb-1 px-0">
        <div className="col-span-2">Type</div>
        <div className="col-span-4">Description</div>
        <div className="col-span-2">Qty</div>
        <div className="col-span-1">Unit</div>
        <div className="col-span-2">Unit Price</div>
        <div className="col-span-1 text-right">Total</div>
      </div>

      <div>
        {items.map((item, i) => (
          <LineItemRow
            key={i}
            item={item}
            index={i}
            materials={materials}
            onUpdate={updateItem}
            onRemove={removeItem}
          />
        ))}
      </div>

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">No items yet. Add materials or labor below.</p>
      )}

      <div className="flex gap-2 mt-3">
        <Button type="button" variant="outline" size="sm" onClick={() => addItem("material")}>
          <Package className="w-3.5 h-3.5 mr-1.5" /> Add Material
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => addItem("labor")}>
          <Wrench className="w-3.5 h-3.5 mr-1.5" /> Add Labor
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => addItem("other")}>
          <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Other
        </Button>
      </div>
    </div>
  );
}