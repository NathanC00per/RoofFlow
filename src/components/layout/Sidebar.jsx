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
  Building2
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "Operations",
    items: [
      { label: "Dashboard", path: "/", icon: LayoutDashboard },
      { label: "New Job", path: "/jobs/new", icon: PlusCircle },
      { label: "All Jobs", path: "/jobs", icon: Briefcase },
    ]
  },
  {
    label: "Workforce",
    items: [
      { label: "Employees", path: "/employees", icon: Users },
      { label: "Timesheets", path: "/timesheets", icon: Clock },
    ]
  },
  {
    label: "Finance",
    items: [
      { label: "Finance Dashboard", path: "/finance", icon: BarChart2 },
      { label: "Estimates", path: "/estimates", icon: FileText },
      { label: "Invoices", path: "/invoices", icon: Receipt },
      { label: "Expenses", path: "/expenses", icon: Wallet },
      { label: "Materials", path: "/materials", icon: Package },
    ]
  },
  {
    label: "Settings",
    items: [
      { label: "Company Settings", path: "/settings/company", icon: Building2 },
      { label: "Templates", path: "/settings/templates", icon: Settings },
      { label: "VAT Tracker", path: "/settings/vat", icon: Receipt },
    ]
  }
];

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

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