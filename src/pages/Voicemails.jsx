import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Phone,
  Play,
  Trash2,
  MoreHorizontal,
  Clock,
  CheckCircle2,
  Mail,
  Search,
  Filter,
} from "lucide-react";
import { format, formatDistance } from "date-fns";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import VoicemailPlayer from "@/components/voicemail/VoicemailPlayer";
import PageHeader from "@/components/shared/PageHeader";

const STATUS_COLORS = {
  new: "bg-amber-100 text-amber-700 border-amber-200",
  listened: "bg-blue-100 text-blue-700 border-blue-200",
  resolved: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export default function Voicemails() {
  const { isAdmin, can } = usePermissions();
  const canView = isAdmin || can("phone.view");
  const canManage = isAdmin || can("phone.manage");
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [playingId, setPlayingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [sortBy, setSortBy] = useState("recent");

  const { data: voicemails = [], isLoading } = useQuery({
    queryKey: ["voicemails"],
    queryFn: () => base44.entities.Voicemail.list("-received_at", 100),
    enabled: canView,
  });

  const { data: routes = [] } = useQuery({
    queryKey: ["phone_routing"],
    queryFn: () => base44.entities.PhoneRouting.list(),
    enabled: canView,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Voicemail.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["voicemails"] });
      toast.success("Voicemail updated");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Voicemail.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["voicemails"] });
      toast.success("Voicemail deleted");
      setDeleteId(null);
    },
  });

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Phone className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-base">You don't have permission to view voicemails.</p>
      </div>
    );
  }

  // Filter and sort voicemails
  const filtered = voicemails.filter((v) => {
    if (statusFilter !== "all" && v.status !== statusFilter) return false;
    const searchLower = search.toLowerCase();
    return (
      v.phone_number.includes(searchLower) ||
      v.caller_name?.toLowerCase().includes(searchLower) ||
      v.route_description?.toLowerCase().includes(searchLower)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "recent") {
      return new Date(b.received_at) - new Date(a.received_at);
    }
    if (sortBy === "oldest") {
      return new Date(a.received_at) - new Date(b.received_at);
    }
    return 0;
  });

  const stats = {
    new: voicemails.filter((v) => v.status === "new").length,
    listened: voicemails.filter((v) => v.status === "listened").length,
    resolved: voicemails.filter((v) => v.status === "resolved").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Voicemails"
        subtitle="Listen to and manage voicemails from your phone routing system"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.new}</p>
              <p className="text-sm text-muted-foreground">New Voicemails</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Play className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.listened}</p>
              <p className="text-sm text-muted-foreground">Listened</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.resolved}</p>
              <p className="text-sm text-muted-foreground">Resolved</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by phone, name, or route..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="listened">Listened</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Voicemail List */}
      <div className="space-y-2">
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Loading voicemails...
            </CardContent>
          </Card>
        ) : sorted.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Phone className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No voicemails found</p>
            </CardContent>
          </Card>
        ) : (
          sorted.map((voicemail) => (
            <Card key={voicemail.id} className={`hover:shadow-md transition-all ${voicemail.status === "new" ? "border-amber-200 bg-amber-50/30" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Play button */}
                  <button
                    onClick={() => setPlayingId(voicemail.id)}
                    className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors"
                    title="Play voicemail"
                  >
                    <Play className="w-5 h-5 fill-white" />
                  </button>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate">
                            {voicemail.caller_name || voicemail.phone_number}
                          </p>
                          <Badge
                            className={`text-xs whitespace-nowrap border ${
                              STATUS_COLORS[voicemail.status]
                            }`}
                          >
                            {voicemail.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {voicemail.phone_number}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistance(new Date(voicemail.received_at), new Date(), {
                            addSuffix: true,
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(voicemail.received_at), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Phone className="w-3.5 h-3.5" />
                      <span className="truncate">{voicemail.route_description || "Unknown Route"}</span>
                      {voicemail.duration_seconds && (
                        <>
                          <span>•</span>
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {Math.floor(voicemail.duration_seconds / 60)}:
                            {String(voicemail.duration_seconds % 60).padStart(2, "0")}
                          </span>
                        </>
                      )}
                    </div>

                    {voicemail.transcription && (
                      <p className="text-sm text-muted-foreground italic mb-2 line-clamp-2">
                        "{voicemail.transcription}"
                      </p>
                    )}

                    {voicemail.notes && (
                      <p className="text-sm text-foreground mb-2 p-2 bg-muted/50 rounded">
                        <strong>Note:</strong> {voicemail.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  {canManage && (
                    <div className="flex-shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {voicemail.status === "new" && (
                            <DropdownMenuItem
                              onClick={() =>
                                updateMutation.mutate({
                                  id: voicemail.id,
                                  data: { status: "listened" },
                                })
                              }
                            >
                              Mark as Listened
                            </DropdownMenuItem>
                          )}
                          {voicemail.status !== "resolved" && (
                            <DropdownMenuItem
                              onClick={() =>
                                updateMutation.mutate({
                                  id: voicemail.id,
                                  data: { status: "resolved" },
                                })
                              }
                            >
                              Mark as Resolved
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteId(voicemail.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Voicemail Player Modal */}
      {playingId && (
        <VoicemailPlayer
          voicemail={voicemails.find((v) => v.id === playingId)}
          onClose={() => setPlayingId(null)}
          onStatusChange={(status) =>
            updateMutation.mutate({
              id: playingId,
              data: { status },
            })
          }
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Voicemail?</AlertDialogTitle>
          <AlertDialogDescription>
            This voicemail will be permanently deleted. This action cannot be undone.
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}