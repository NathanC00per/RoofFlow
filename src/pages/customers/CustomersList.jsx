import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  UserPlus, Search, Phone, Mail, MapPin,
  Shield, ShieldCheck, Eye, MoreVertical, Briefcase, Edit, Trash2
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const EMPTY_FORM = {
  first_name: "", last_name: "", email: "", phone: "",
  address: "", city: "", state: "", zip: "", notes: "",
  portal_enabled: false, portal_password_hash: "", portal_first_login: true,
  gdpr_consent: false, gdpr_consent_date: "", status: "active"
};

// Very simple hash — just a base64 encode. Keeps passwords out of plain text.
function simpleHash(str) {
  return btoa(encodeURIComponent(str));
}

export default function CustomersList() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [portalPassword, setPortalPassword] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list("-created_date"),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.Job.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.create(data),
    onSuccess: () => { qc.invalidateQueries(["customers"]); closeDialog(); toast({ title: "Customer created" }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Customer.update(id, data),
    onSuccess: () => { qc.invalidateQueries(["customers"]); closeDialog(); toast({ title: "Customer updated" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Customer.delete(id),
    onSuccess: () => { qc.invalidateQueries(["customers"]); toast({ title: "Customer deleted" }); },
  });

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setPortalPassword("");
    setDialogOpen(true);
  }

  function openEdit(c) {
    setEditing(c);
    setForm({
      first_name: c.first_name || "", last_name: c.last_name || "",
      email: c.email || "", phone: c.phone || "",
      address: c.address || "", city: c.city || "",
      state: c.state || "", zip: c.zip || "",
      notes: c.notes || "", portal_enabled: c.portal_enabled || false,
      portal_password_hash: c.portal_password_hash || "",
      portal_first_login: c.portal_first_login ?? true,
      gdpr_consent: c.gdpr_consent || false,
      gdpr_consent_date: c.gdpr_consent_date || "",
      status: c.status || "active"
    });
    setPortalPassword("");
    setDialogOpen(true);
  }

  function closeDialog() { setDialogOpen(false); setEditing(null); }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form };
    if (portalPassword) {
      payload.portal_password_hash = simpleHash(portalPassword);
      payload.portal_first_login = true; // reset so customer must set new pw on next login
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const filtered = customers.filter(c =>
    !search ||
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  function jobCountFor(c) {
    return jobs.filter(j => j.customer_email === c.email).length;
  }

  return (
    <div>
      <PageHeader title="Customers" subtitle="Manage customer accounts and portal access">
        <Button onClick={openNew}><UserPlus className="w-4 h-4 mr-2" />New Customer</Button>
      </PageHeader>

      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No customers yet</p>
          <p className="text-sm mt-1">Add your first customer to get started.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(c => (
          <Card key={c.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-base">{c.first_name} {c.last_name}</p>
                    <Badge variant="outline" className={cn("text-xs", c.status === "active" ? "text-emerald-600 border-emerald-200" : "text-slate-400")}>
                      {c.status}
                    </Badge>
                  </div>
                  <div className="mt-2 space-y-1">
                    {c.email && <p className="text-sm text-muted-foreground flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{c.email}</p>}
                    {c.phone && <p className="text-sm text-muted-foreground flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{c.phone}</p>}
                    {c.city && <p className="text-sm text-muted-foreground flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{c.city}{c.state ? `, ${c.state}` : ""}</p>}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-8 h-8 flex-shrink-0"><MoreVertical className="w-4 h-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(c)}><Edit className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={`/customers/${c.id}`}><Eye className="w-4 h-4 mr-2" />View Details</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(c.id)}>
                      <Trash2 className="w-4 h-4 mr-2" />Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-4 pt-4 border-t flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{jobCountFor(c)} job{jobCountFor(c) !== 1 ? "s" : ""}</span>
                <div className="flex items-center gap-1 ml-auto">
                  {c.portal_enabled ? (
                    <span className="flex items-center gap-1 text-emerald-600"><ShieldCheck className="w-3.5 h-3.5" />Portal active</span>
                  ) : (
                    <span className="flex items-center gap-1 text-slate-400"><Shield className="w-3.5 h-3.5" />No portal</span>
                  )}
                </div>
                {c.gdpr_consent && (
                  <span className="text-emerald-600 text-xs">GDPR ✓</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Customer" : "New Customer"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First name *</Label>
                <Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Last name *</Label>
                <Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email * <span className="text-xs text-muted-foreground">(used for portal login)</span></Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Address</Label>
                <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Postcode</Label>
                <Input value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            {/* Portal access */}
            <div className="rounded-xl border p-4 space-y-3 bg-muted/30">
              <p className="text-sm font-semibold flex items-center gap-2"><Shield className="w-4 h-4" />Portal Access</p>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.portal_enabled} onChange={e => setForm(f => ({ ...f, portal_enabled: e.target.checked }))} className="rounded" />
                Enable customer portal access
              </label>
              {form.portal_enabled && (
                <div className="space-y-1.5">
                  <Label>{editing ? "Set new portal password (leave blank to keep current)" : "Portal password *"}</Label>
                  <Input
                    type="password"
                    value={portalPassword}
                    onChange={e => setPortalPassword(e.target.value)}
                    placeholder={editing ? "Leave blank to keep current" : "Set a temporary password"}
                    required={!editing && form.portal_enabled}
                  />
                  <p className="text-xs text-muted-foreground">Customer will be prompted to change this on first login.</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editing ? "Save changes" : "Create customer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}