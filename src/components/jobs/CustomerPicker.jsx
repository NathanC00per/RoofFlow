import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, X, CheckCircle2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * CustomerPicker
 * Props:
 *   value: { customer_name, customer_phone, customer_email, customer_id? }
 *   onChange: (patch) => void  — called with fields to merge into the job form
 */
export default function CustomerPicker({ value, onChange }) {
  const [query, setQuery]         = useState("");
  const [open, setOpen]           = useState(false);
  const [linked, setLinked]       = useState(null); // the selected Customer record
  const [showNewForm, setShowNewForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ first_name: "", last_name: "", phone: "", email: "" });
  const wrapperRef = useRef(null);
  const qc = useQueryClient();

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list(),
  });

  const createCustomerMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.create(data),
    onSuccess: (created) => {
      qc.invalidateQueries(["customers"]);
      selectCustomer(created);
      setShowNewForm(false);
    },
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e) { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const filtered = customers.filter(c => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  });

  function selectCustomer(c) {
    setLinked(c);
    setOpen(false);
    setQuery("");
    onChange({
      customer_name:  `${c.first_name} ${c.last_name}`,
      customer_phone: c.phone || "",
      customer_email: c.email || "",
      customer_id:    c.id,
    });
  }

  function clearCustomer() {
    setLinked(null);
    onChange({ customer_name: "", customer_phone: "", customer_email: "", customer_id: undefined });
  }

  function handleCreateNew() {
    const payload = {
      first_name: newCustomer.first_name,
      last_name:  newCustomer.last_name,
      phone:      newCustomer.phone,
      email:      newCustomer.email,
      status:     "active",
      portal_enabled: false,
      portal_first_login: true,
    };
    createCustomerMutation.mutate(payload);
  }

  // If a customer is linked, show the "linked" state
  if (linked) {
    return (
      <div className="md:col-span-2">
        <Label className="mb-1.5 block">Customer</Label>
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{linked.first_name} {linked.last_name}</p>
            <p className="text-xs text-muted-foreground">{linked.email}{linked.phone ? ` · ${linked.phone}` : ""}</p>
          </div>
          <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">Linked</Badge>
          <Button type="button" variant="ghost" size="icon" className="w-7 h-7" onClick={clearCustomer}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="md:col-span-2 space-y-4" ref={wrapperRef}>
      {/* Search / select existing */}
      <div className="space-y-1.5">
        <Label>Customer <span className="text-muted-foreground font-normal text-xs">(search existing or fill in manually below)</span></Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9 pr-4"
            placeholder="Search by name, email or phone..."
            value={query}
            onFocus={() => setOpen(true)}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
          />
          {open && (
            <div className="absolute z-50 w-full mt-1 rounded-xl border bg-white shadow-xl max-h-56 overflow-y-auto">
              {filtered.length === 0 && (
                <div className="px-4 py-3 text-sm text-muted-foreground">No customers found.</div>
              )}
              {filtered.map(c => (
                <button
                  key={c.id}
                  type="button"
                  className="w-full text-left px-4 py-2.5 hover:bg-muted/50 flex items-center justify-between gap-3 transition-colors"
                  onMouseDown={() => selectCustomer(c)}
                >
                  <div>
                    <p className="text-sm font-medium">{c.first_name} {c.last_name}</p>
                    <p className="text-xs text-muted-foreground">{c.email}{c.phone ? ` · ${c.phone}` : ""}</p>
                  </div>
                  {c.portal_enabled && <Badge className="text-xs bg-emerald-100 text-emerald-700">Portal</Badge>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Manual fields (always visible so job form still works without a linked customer) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded-xl p-4 bg-muted/20">
        <p className="md:col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide -mb-1">Or enter manually</p>
        <div className="space-y-1.5">
          <Label>Customer Name *</Label>
          <Input
            value={value.customer_name}
            onChange={e => onChange({ customer_name: e.target.value })}
            placeholder="John Smith"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input
            value={value.customer_phone}
            onChange={e => onChange({ customer_phone: e.target.value })}
            placeholder="(555) 123-4567"
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Email</Label>
          <Input
            type="email"
            value={value.customer_email}
            onChange={e => onChange({ customer_email: e.target.value })}
            placeholder="john@example.com"
          />
        </div>

        {/* Quick create customer from manual data */}
        {(value.customer_name || value.customer_email) && !linked && (
          <div className="md:col-span-2">
            {!showNewForm ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  const parts = (value.customer_name || "").trim().split(" ");
                  setNewCustomer({
                    first_name: parts[0] || "",
                    last_name:  parts.slice(1).join(" ") || "",
                    email:      value.customer_email || "",
                    phone:      value.customer_phone || "",
                  });
                  setShowNewForm(true);
                }}
              >
                <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                Save as new customer record
              </Button>
            ) : (
              <div className="rounded-lg border bg-white p-4 space-y-3">
                <p className="text-sm font-medium">Create customer record</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">First name</Label>
                    <Input className="h-8 text-sm" value={newCustomer.first_name} onChange={e => setNewCustomer(n => ({ ...n, first_name: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Last name</Label>
                    <Input className="h-8 text-sm" value={newCustomer.last_name} onChange={e => setNewCustomer(n => ({ ...n, last_name: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input className="h-8 text-sm" type="email" value={newCustomer.email} onChange={e => setNewCustomer(n => ({ ...n, email: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Phone</Label>
                    <Input className="h-8 text-sm" value={newCustomer.phone} onChange={e => setNewCustomer(n => ({ ...n, phone: e.target.value }))} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" className="text-xs" onClick={handleCreateNew} disabled={createCustomerMutation.isPending}>
                    {createCustomerMutation.isPending ? "Creating..." : "Create & link"}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => setShowNewForm(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}