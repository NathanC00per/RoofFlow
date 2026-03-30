import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Briefcase, 
  PlusCircle, 
  Users, 
  Clock, 
  ChevronLeft,
  ChevronRight,
  Package,
  FileText,
  Receipt,
  BarChart2,
  Wallet,
  Settings,
  HardHat,
  Building2,
  Kanban,
  UserCircle,
  Lock,
  Timer,
  LayoutTemplate,
  MessageSquareMore,
  Bell,
  CalendarDays,
  Wrench,
  Shield,
  Globe
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";

// permission key required to show item (null = always show)
const ALL_NAV_GROUPS = [
  {
    label: "Operations",
    items: [
      { label: "Dashboard",   path: "/",             icon: LayoutDashboard, perm: null },
      { label: "Job Board",   path: "/job-dashboard", icon: Kanban,          perm: "jobs.view" },
      { label: "New Job",     path: "/jobs/new",      icon: PlusCircle,      perm: "jobs.create" },
      { label: "All Jobs",    path: "/jobs",           icon: Briefcase,       perm: "jobs.view" },
      { label: "Maintenance", path: "/maintenance",    icon: Wrench,          perm: "maintenance.view" },
    ]
  },
  {
    label: "Workforce",
    items: [
      { label: "Employees",   path: "/employees",  icon: Users,       perm: "employees.view" },
      { label: "Timesheets",  path: "/timesheets", icon: Clock,       perm: "timesheets.view" },
      { label: "My Clock-In", path: "/clock-in",   icon: Timer,       perm: null },
      { label: "Schedule",    path: "/schedule",   icon: CalendarDays, perm: "schedule.view" },
    ]
  },
  {
    label: "Finance",
    items: [
      { label: "Finance Dashboard", path: "/finance",    icon: BarChart2, perm: "finance.view" },
      { label: "Estimates",         path: "/estimates",  icon: FileText,  perm: "estimates.view" },
      { label: "Invoices",          path: "/invoices",   icon: Receipt,   perm: "invoices.view" },
      { label: "Expenses",          path: "/expenses",   icon: Wallet,    perm: "expenses.view" },
      { label: "Materials",         path: "/materials",  icon: Package,   perm: "materials.view" },
    ]
  },
  {
    label: "Clients",
    items: [
      { label: "Customers",       path: "/customers", icon: UserCircle, perm: "customers.view" },
      { label: "Customer Portal", path: "/customer",  icon: Lock,       perm: "customers.view" },
    ]
  },
  {
    label: "Team",
    items: [
      { label: "Forum",         path: "/forum",          icon: MessageSquareMore, perm: "forum.view" },
      { label: "Notifications", path: "/notifications",  icon: Bell,             perm: null },
    ]
  },
  {
    label: "Settings",
    items: [
      { label: "Company Settings", path: "/settings/company",       icon: Building2,     perm: "settings.view" },
      { label: "Doc Templates",    path: "/settings/templates",     icon: Settings,      perm: "settings.view" },
      { label: "Job Templates",    path: "/settings/templates/jobs", icon: LayoutTemplate, perm: "settings.view" },
      { label: "VAT Tracker",      path: "/settings/vat",           icon: Receipt,       perm: "settings.view" },
      { label: "Roles & Permissions", path: "/settings/roles",      icon: Shield,        perm: "roles.view" },
    ]
  },
  {
    label: "Website",
    items: [
      { label: "Public Site", path: "/website", icon: Globe, perm: null },
    ]
  }
];

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { can } = usePermissions();

  const navGroups = ALL_NAV_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => !item.perm || can(item.perm)),
  })).filter(group => group.items.length > 0);

  return (
    <aside className={cn(
      "h-screen bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 sticky top-0",
      collapsed ? "w-[72px]" : "w-64"
    )}>
      {/* Logo */}
      <div className="p-5 flex items-center gap-3 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
          <HardHat className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="font-bold text-base text-white tracking-tight truncate">RoofPro</h1>
            <p className="text-[11px] text-sidebar-foreground/60 truncate">Management</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 font-semibold px-3 mb-1">{group.label}</p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = location.pathname === item.path ||
                  (item.path !== "/" && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                      isActive
                        ? "bg-sidebar-accent text-white"
                        : "text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent/50"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-sidebar-primary")} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="p-4 border-t border-sidebar-border hover:bg-sidebar-accent/50 transition-colors flex items-center justify-center"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}