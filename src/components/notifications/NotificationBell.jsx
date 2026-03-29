import { useState } from "react";
import { Bell, Check, CheckCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications } from "@/hooks/useNotifications";
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

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markReadMutation, markAllReadMutation } = useNotifications();

  const handleClick = (n) => {
    if (!n.is_read) markReadMutation.mutate(n.id);
    if (n.link) setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-0.5">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7 gap-1"
              onClick={() => markAllReadMutation.mutate()}>
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </Button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[420px] overflow-y-auto divide-y">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No notifications yet
            </div>
          ) : (
            notifications.map(n => {
              const inner = (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    "flex gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors",
                    !n.is_read && "bg-primary/5"
                  )}
                >
                  <span className="text-lg mt-0.5 flex-shrink-0">{TYPE_ICONS[n.type] || "🔔"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-sm leading-snug", !n.is_read && "font-semibold")}>{n.title}</p>
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-1">
                      {formatDistanceToNow(new Date(n.created_date), { addSuffix: true })}
                    </p>
                  </div>
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

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t px-4 py-2.5">
            <Link to="/notifications" onClick={() => setOpen(false)}
              className="text-xs text-primary hover:underline flex items-center gap-1">
              View all notifications <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}