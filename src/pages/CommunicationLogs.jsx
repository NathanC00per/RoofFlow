import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import { Phone, MessageSquare, ArrowDownLeft, ArrowUpRight, Search, Download, PhoneIncoming, PhoneMissed, PhoneCall, Globe } from "lucide-react";
import { format, subDays } from "date-fns";
import { usePermissions } from "@/hooks/usePermissions";

export default function CommunicationLogs() {
  const { isAdmin, can } = usePermissions();
  const canView = isAdmin || can("communications.view");
  
  const [searchPhone, setSearchPhone] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [daysBack, setDaysBack] = useState("7");

  const { data: logs = [] } = useQuery({
    queryKey: ["communication_logs"],
    queryFn: () => base44.entities.CommunicationLog.list("-timestamp", 500),
    enabled: canView,
  });

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Phone className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-base">You don't have permission to view communication logs.</p>
      </div>
    );
  }

  const cutoffDate = subDays(new Date(), parseInt(daysBack));
  const filtered = logs.filter(log => {
    const logDate = new Date(log.timestamp);
    if (logDate < cutoffDate) return false;
    if (searchPhone && !log.phone_number.includes(searchPhone)) return false;
    if (typeFilter !== "all" && log.type !== typeFilter) return false;
    if (directionFilter !== "all" && log.direction !== directionFilter) return false;
    if (statusFilter !== "all" && log.status !== statusFilter) return false;
    return true;
  });

  const typeIcon = (type) => type === "call" ? <Phone className="w-4 h-4" /> : type === "web_enquiry" ? <Globe className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />;
  const directionIcon = (dir) => dir === "incoming" ? <ArrowDownLeft className="w-4 h-4 text-emerald-600" /> : <ArrowUpRight className="w-4 h-4 text-blue-600" />;

  const typeColor = (type) => type === "call" ? "bg-blue-50 text-blue-700 border-blue-200" : type === "web_enquiry" ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-purple-50 text-purple-700 border-purple-200";
  const statusColor = (status) => 
    status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
    status === "missed" ? "bg-amber-50 text-amber-700 border-amber-200" :
    "bg-red-50 text-red-700 border-red-200";

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Communication Logs"
        subtitle="Track all incoming and outgoing calls and SMS messages"
      >
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" /> Export
        </Button>
      </PageHeader>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Total", value: filtered.length, icon: PhoneCall, color: "bg-blue-100 text-blue-600" },
          { label: "Incoming", value: filtered.filter(l => l.direction === "incoming").length, icon: PhoneIncoming, color: "bg-emerald-100 text-emerald-600" },
          { label: "Missed", value: filtered.filter(l => l.status === "missed").length, icon: PhoneMissed, color: "bg-amber-100 text-amber-600" },
          { label: "SMS", value: filtered.filter(l => l.type === "sms").length, icon: MessageSquare, color: "bg-purple-100 text-purple-600" },
          { label: "Web Enquiries", value: filtered.filter(l => l.type === "web_enquiry").length, icon: Globe, color: "bg-orange-100 text-orange-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search phone number..."
                value={searchPhone}
                onChange={e => setSearchPhone(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="call">Calls</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="web_enquiry">Web Enquiries</SelectItem>
              </SelectContent>
            </Select>
            <Select value={directionFilter} onValueChange={setDirectionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Directions</SelectItem>
                <SelectItem value="incoming">Incoming</SelectItem>
                <SelectItem value="outgoing">Outgoing</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="missed">Missed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={daysBack} onValueChange={setDaysBack}>
              <SelectTrigger>
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24 Hours</SelectItem>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Phone className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p>No communication logs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Type</th>
                    <th className="px-4 py-3 text-left font-semibold">Phone Number</th>
                    <th className="px-4 py-3 text-left font-semibold">Contact</th>
                    <th className="px-4 py-3 text-left font-semibold">Time</th>
                    <th className="px-4 py-3 text-left font-semibold">Routed To</th>
                    <th className="px-4 py-3 text-left font-semibold">Duration / Content</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map(log => (
                    <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg ${typeColor(log.type)}`}>
                            {typeIcon(log.type)}
                          </div>
                          <div className="flex items-center gap-1">
                            {directionIcon(log.direction)}
                            <span className="capitalize text-xs font-medium text-muted-foreground">
                              {log.direction}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-mono text-sm font-medium">{log.phone_number}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm">{log.contact_name || "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <p>{format(new Date(log.timestamp), "MMM d, HH:mm")}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(log.timestamp), "yyyy")}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          {log.routed_to_employee_name && (
                            <>
                              <p className="font-medium">{log.routed_to_employee_name}</p>
                              <p className="text-xs text-muted-foreground capitalize">{log.routed_to_role || "—"}</p>
                            </>
                          )}
                          {!log.routed_to_employee_name && "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {log.type === "call" ? (
                          <p className="text-sm font-medium">
                            {log.duration_seconds ? `${Math.floor(log.duration_seconds / 60)}m ${log.duration_seconds % 60}s` : "—"}
                          </p>
                        ) : (
                          <p className="text-sm truncate max-w-xs text-slate-600">{log.message_body || "—"}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs capitalize ${statusColor(log.status)}`}>
                          {log.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mt-4">
        Showing {filtered.length} of {logs.length} communications
      </p>
    </div>
  );
}