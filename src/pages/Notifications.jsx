import { useNotifications } from "@/hooks/useNotifications";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const TYPE_ICONS = {
  job_status: "🏗️",
  job_assigned: "👷",
  estimate_approved: "✅",
  invoice_overdue: "⚠️",
  forum_post: "💬",
  forum_reply: "↩️",
  timesheet_approved: "✔️",
  timesheet_rejected: "❌",
  system: "🔔",
};

export default function Notifications() {
  const { notifications, unreadCount, markReadMutation, markAllReadMutation } = useNotifications();

  return (
    <div>
      <PageHeader title="Notifications" subtitle={`${unreadCount} unread`}>
        {unreadCount > 0 && (
          <Button variant="outline" className="gap-2" onClick={() => markAllReadMutation.mutate()}>
            <CheckCheck className="w-4 h-4" /> Mark all read
          </Button>
        )}
      </PageHeader>

      <div className="max-w-2xl space-y-2">
        {notifications.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">You're all caught up!</p>
          </div>
        ) : (
          notifications.map(n => {
            const inner = (
              <div
                onClick={() => { if (!n.is_read) markReadMutation.mutate(n.id); }}
                className={cn(
                  "flex gap-4 p-4 rounded-xl border transition-colors cursor-pointer hover:bg-muted/40",
                  !n.is_read && "bg-primary/5 border-primary/20"
                )}
              >
                <span className="text-2xl flex-shrink-0 mt-0.5">{TYPE_ICONS[n.type] || "🔔"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("text-sm", !n.is_read && "font-semibold")}>{n.title}</p>
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {formatDistanceToNow(new Date(n.created_date), { addSuffix: true })}
                  </p>
                </div>
                {n.link && <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />}
              </div>
            );

            return n.link ? (
              <Link key={n.id} to={n.link} className="block">{inner}</Link>
            ) : (
              <div key={n.id}>{inner}</div>
            );
          })
        )}
      </div>
    </div>
  );
}