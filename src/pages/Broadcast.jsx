import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MessageSquare, Mail, Send, Users, User, Search,
  CheckCheck, AlertTriangle, Megaphone, X
} from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";

const TEMPLATES = [
  { label: "🏠 Job Scheduled", subject: "Your Job Has Been Scheduled", text: "Hi {name}, your roofing job has been scheduled. Our crew will be in touch with an exact date and time. Thank you for choosing us!" },
  { label: "🔨 Work Starting", subject: "Work Starts Tomorrow", text: "Hi {name}, just a reminder that our crew will be on site tomorrow. Please ensure access is available. Thank you!" },
  { label: "✅ Job Completed", subject: "Your Job Is Complete", text: "Hi {name}, we've completed the roofing work. Thank you for your business! An invoice will follow shortly." },
  { label: "⚠️ Safety Alert", subject: "Important Safety Notice", text: "ALERT: There is an important safety update. Please check with your manager before proceeding with any work today." },
  { label: "📅 Schedule Change", subject: "Schedule Update", text: "Hi {name}, there has been a change to the schedule. Please check the app or contact your manager for updated details." },
  { label: "💰 Invoice Ready", subject: "Your Invoice Is Ready", text: "Hi {name}, your invoice is ready and has been sent to your email. Please don't hesitate to reach out with any questions." },
];

export default function Broadcast() {
  const { isAdmin } = usePermissions();
  const [audienceType, setAudienceType] = useState("employees"); // employees | customers | both
  const [selectionMode, setSelectionMode] = useState("all"); // all | individual
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [search, setSearch] = useState("");
  const [channels, setChannels] = useState({ sms: true, email: true });
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sentResult, setSentResult] = useState(null);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
    enabled: isAdmin,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list(),
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Megaphone className="w-12 h-12 mb-3 opacity-30" />
        <p>Admin access required to send broadcasts.</p>
      </div>
    );
  }

  // Build candidate list based on audience
  const activeEmployees = employees.filter(e => e.status === "active");
  const activeCustomers = customers.filter(c => c.status !== "inactive");

  let candidates = [];
  if (audienceType === "employees") {
    candidates = activeEmployees.map(e => ({
      id: e.id,
      name: `${e.first_name} ${e.last_name}`,
      role: e.role,
      phone: e.phone,
      email: e.email,
      type: "employee",
    }));
  } else if (audienceType === "customers") {
    candidates = activeCustomers.map(c => ({
      id: c.id,
      name: `${c.first_name} ${c.last_name}`,
      role: null,
      phone: c.phone,
      email: c.email,
      type: "customer",
    }));
  } else {
    candidates = [
      ...activeEmployees.map(e => ({ id: e.id, name: `${e.first_name} ${e.last_name}`, role: e.role, phone: e.phone, email: e.email, type: "employee" })),
      ...activeCustomers.map(c => ({ id: c.id, name: `${c.first_name} ${c.last_name}`, role: null, phone: c.phone, email: c.email, type: "customer" })),
    ];
  }

  const filtered = candidates.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const recipients = selectionMode === "all"
    ? candidates
    : candidates.filter(c => selectedIds.has(c.id));

  const smsCount = recipients.filter(r => r.phone).length;
  const emailCount = recipients.filter(r => r.email).length;

  function toggleId(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function applyTemplate(t) {
    setSubject(t.subject);
    setMessage(t.text);
  }

  async function handleSend() {
    if (!message.trim()) { toast.error("Please enter a message"); return; }
    if (!channels.sms && !channels.email) { toast.error("Select at least one channel"); return; }
    if (recipients.length === 0) { toast.error("No recipients selected"); return; }
    if (channels.sms && smsCount === 0) { toast.error("No recipients have phone numbers for SMS"); return; }
    if (channels.email && emailCount === 0) { toast.error("No recipients have email addresses"); return; }

    setSending(true);
    setSentResult(null);

    const res = await base44.functions.invoke("sendBroadcast", {
      recipients,
      subject,
      message,
      channels,
    });

    setSending(false);

    if (res.data?.success) {
      setSentResult(res.data.results);
      toast.success("Broadcast sent!");
      setMessage("");
      setSubject("");
      setSelectedIds(new Set());
    } else {
      toast.error(res.data?.error || "Broadcast failed");
    }
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-primary" /> Broadcast Messaging
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Send SMS and/or email alerts to employees or customers individually or all at once.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── Left: Audience + Recipients ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Audience type */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Audience</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {[["employees", "Employees"], ["customers", "Customers"], ["both", "Both"]].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => { setAudienceType(val); setSelectedIds(new Set()); }}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors ${audienceType === val ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted border-border"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[["all", "All"], ["individual", "Individual"]].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => { setSelectionMode(val); setSelectedIds(new Set()); }}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors ${selectionMode === val ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted border-border"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Individual picker */}
          {selectionMode === "individual" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-2"><User className="w-4 h-4" />Select Recipients</span>
                  {selectedIds.size > 0 && (
                    <Badge className="text-xs">{selectedIds.size} selected</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="pl-9"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {filtered.map(c => (
                    <label
                      key={c.id}
                      className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${selectedIds.has(c.id) ? "bg-primary/5 border border-primary/20" : "hover:bg-muted border border-transparent"}`}
                    >
                      <Checkbox
                        checked={selectedIds.has(c.id)}
                        onCheckedChange={() => toggleId(c.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.email || c.phone || "No contact info"}</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] capitalize flex-shrink-0">
                        {c.type === "employee" ? c.role || "staff" : "customer"}
                      </Badge>
                    </label>
                  ))}
                  {filtered.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No matches</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          <Card className="bg-muted/40">
            <CardContent className="pt-4 pb-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Send Summary</p>
              <div className="flex items-center justify-between text-sm">
                <span>Recipients</span>
                <span className="font-bold">{recipients.length}</span>
              </div>
              {channels.sms && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5 text-primary" /> SMS</span>
                  <span className="font-bold">{smsCount}</span>
                </div>
              )}
              {channels.email && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-primary" /> Email</span>
                  <span className="font-bold">{emailCount}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right: Compose ── */}
        <div className="lg:col-span-3 space-y-4">

          {/* Channels */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Channels</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4">
              <label className={`flex items-center gap-3 flex-1 p-3 rounded-xl border cursor-pointer transition-colors ${channels.sms ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}>
                <Checkbox checked={channels.sms} onCheckedChange={v => setChannels(p => ({ ...p, sms: !!v }))} />
                <MessageSquare className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm font-semibold">SMS</p>
                  <p className="text-xs text-muted-foreground">Via Twilio</p>
                </div>
              </label>
              <label className={`flex items-center gap-3 flex-1 p-3 rounded-xl border cursor-pointer transition-colors ${channels.email ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}>
                <Checkbox checked={channels.email} onCheckedChange={v => setChannels(p => ({ ...p, email: !!v }))} />
                <Mail className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm font-semibold">Email</p>
                  <p className="text-xs text-muted-foreground">Via platform</p>
                </div>
              </label>
            </CardContent>
          </Card>

          {/* Templates */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Quick Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map(t => (
                  <button
                    key={t.label}
                    onClick={() => applyTemplate(t)}
                    className="text-xs px-3 py-1.5 rounded-full border hover:border-primary hover:text-primary transition-colors"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Compose */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Compose Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {channels.email && (
                <div className="space-y-1.5">
                  <Label>Email Subject</Label>
                  <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Schedule Update" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Message Body</Label>
                <Textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Type your message here... Use {name} to personalise."
                  rows={6}
                />
                <p className="text-xs text-muted-foreground text-right">{message.length} chars · Use <code className="bg-muted px-1 rounded">{"{name}"}</code> to personalise</p>
              </div>

              {/* Result */}
              {sentResult && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-1">
                  <p className="text-sm font-semibold text-emerald-700 flex items-center gap-2"><CheckCheck className="w-4 h-4" />Broadcast Sent!</p>
                  {sentResult.sms && <p className="text-xs text-emerald-600">SMS: {sentResult.sms.sent} sent, {sentResult.sms.failed} failed</p>}
                  {sentResult.email && <p className="text-xs text-emerald-600">Email: {sentResult.email.sent} sent, {sentResult.email.failed} failed</p>}
                </div>
              )}

              <Button onClick={handleSend} disabled={sending} className="w-full gap-2" size="lg">
                <Send className="w-4 h-4" />
                {sending ? `Sending to ${recipients.length} recipients...` : `Send to ${recipients.length} recipient${recipients.length !== 1 ? "s" : ""}`}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}