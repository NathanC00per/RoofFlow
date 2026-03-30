import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Briefcase, CalendarDays, Users, MoreHorizontal,
  PlusCircle, Receipt, Clock, Wrench, FileText, Package,
  BarChart2, Wallet, UserCircle, Bell, Settings, Shield,
  Building2, LayoutTemplate, MessageSquareMore, Timer, Kanban, Globe
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { getCompanySettings } from "@/pages/settings/CompanySettings";

// Primary bottom tabs (always visible)
const PRIMARY_TABS = [
  { label: "Home",     path: "/",          icon: LayoutDashboard },
  { label: "Jobs",     path: "/jobs",       icon: Briefcase,     perm: "jobs.view" },
  { label: "Schedule", path: "/schedule",   icon: CalendarDays,  perm: "schedule.view" },
  { label: "Team",     path: "/employees",  icon: Users,         perm: "employees.view" },
  { label: "More",     path: "__more__",    icon: MoreHorizontal },
];

// Items shown in the "More" drawer
const MORE_ITEMS = [
  { label: "New Job",      path: "/jobs/new",           icon: PlusCircle,       perm: "jobs.create" },
  { label: "Job Board",    path: "/job-dashboard",       icon: Kanban,           perm: "jobs.view" },
  { label: "Timesheets",   path: "/timesheets",          icon: Clock,            perm: "timesheets.view" },
  { label: "Clock-In",     path: "/clock-in",            icon: Timer },
  { label: "Maintenance",  path: "/maintenance",         icon: Wrench,           perm: "maintenance.view" },
  { label: "Finance",      path: "/finance",             icon: BarChart2,        perm: "finance.view" },
  { label: "Estimates",    path: "/estimates",           icon: FileText,         perm: "estimates.view" },
  { label: "Invoices",     path: "/invoices",            icon: Receipt,          perm: "invoices.view" },
  { label: "Expenses",     path: "/expenses",            icon: Wallet,           perm: "expenses.view" },
  { label: "Materials",    path: "/materials",           icon: Package,          perm: "materials.view" },
  { label: "Customers",    path: "/customers",           icon: UserCircle,       perm: "customers.view" },
  { label: "Forum",        path: "/forum",               icon: MessageSquareMore, perm: "forum.view" },
  { label: "Notifications",path: "/notifications",       icon: Bell },
  { label: "Public Site",  path: "/website",             icon: Globe },
  { label: "Company",      path: "/settings/company",    icon: Building2,        perm: "settings.view" },
  { label: "Roles",        path: "/settings/roles",      icon: Shield,           perm: "roles.view" },
  { label: "Templates",    path: "/settings/templates",  icon: LayoutTemplate,   perm: "settings.view" },
];

export default function MobileNav() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const { can } = usePermissions();
  const co = getCompanySettings();
  const primary = co.primaryColor || "#1e3a5f";

  const visibleMore = MORE_ITEMS.filter(i => !i.perm || can(i.perm));
  const visibleTabs = PRIMARY_TABS.filter(i => !i.perm || can(i.perm));

  return (
    <>
      {/* More drawer overlay */}
      {moreOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More drawer */}
      {moreOpen && (
        <div className="fixed bottom-16 left-0 right-0 z-50 bg-background rounded-t-2xl border-t shadow-2xl max-h-[70vh] overflow-y-auto">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mt-3 mb-4" />
          <div className="grid grid-cols-4 gap-1 px-3 pb-safe pb-4">
            {visibleMore.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl transition-colors text-center",
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium leading-tight">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-md"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-stretch h-16">
          {visibleTabs.map(tab => {
            const Icon = tab.icon;
            const isMore = tab.path === "__more__";
            const isActive = isMore
              ? moreOpen
              : (location.pathname === tab.path || (tab.path !== "/" && location.pathname.startsWith(tab.path)));

            return (
              <button
                key={tab.path}
                onClick={() => {
                  if (isMore) { setMoreOpen(o => !o); }
                  else { setMoreOpen(false); }
                }}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
                {...(!isMore ? { as: Link, to: tab.path } : {})}
              >
                {isMore ? (
                  <>
                    <Icon className="w-5 h-5" />
                    <span className="text-[10px] font-medium">{tab.label}</span>
                  </>
                ) : (
                  <Link
                    to={tab.path}
                    className="flex flex-col items-center gap-1 w-full h-full justify-center"
                    onClick={() => setMoreOpen(false)}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                      isActive ? "bg-primary text-white scale-110" : ""
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-medium">{tab.label}</span>
                  </Link>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}