import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { getCompanySettings } from "@/pages/settings/CompanySettings";
import {
  Search, X, Briefcase, FileText, Receipt, UserCircle, Bell, Menu,
  LayoutDashboard, CalendarDays, Users, Clock, Wrench, BarChart2, Wallet,
  Package, MessageSquareMore, Settings, Shield, LayoutTemplate, Building2,
  PlusCircle, Timer, Kanban, Globe, ChevronRight, LogOut
} from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import { cn } from "@/lib/utils";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard",  path: "/",               icon: LayoutDashboard },
      { label: "Job Board",  path: "/job-dashboard",  icon: Kanban,       perm: "jobs.view" },
      { label: "Schedule",   path: "/schedule",       icon: CalendarDays, perm: "schedule.view" },
    ],
  },
  {
    label: "Jobs",
    items: [
      { label: "All Jobs",   path: "/jobs",           icon: Briefcase,    perm: "jobs.view" },
      { label: "New Job",    path: "/jobs/new",        icon: PlusCircle,   perm: "jobs.create" },
      { label: "Customers",  path: "/customers",      icon: UserCircle,   perm: "customers.view" },
      { label: "Maintenance",path: "/maintenance",    icon: Wrench,       perm: "maintenance.view" },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Estimates",  path: "/estimates",      icon: FileText,     perm: "estimates.view" },
      { label: "Invoices",   path: "/invoices",       icon: Receipt,      perm: "invoices.view" },
      { label: "Finance",    path: "/finance",        icon: BarChart2,    perm: "finance.view" },
      { label: "Expenses",   path: "/expenses",       icon: Wallet,       perm: "expenses.view" },
    ],
  },
  {
    label: "Team",
    items: [
      { label: "Employees",  path: "/employees",      icon: Users,        perm: "employees.view" },
      { label: "Timesheets", path: "/timesheets",     icon: Clock,        perm: "timesheets.view" },
      { label: "Clock-In",   path: "/clock-in",       icon: Timer },
      { label: "Forum",      path: "/forum",          icon: MessageSquareMore, perm: "forum.view" },
    ],
  },
  {
    label: "More",
    items: [
      { label: "Materials",  path: "/materials",      icon: Package,      perm: "materials.view" },
      { label: "Public Site",path: "/website",        icon: Globe },
      { label: "Company",    path: "/settings/company", icon: Building2,  perm: "settings.view" },
      { label: "Roles",      path: "/settings/roles", icon: Shield,       perm: "roles.view" },
      { label: "Templates",  path: "/settings/templates", icon: LayoutTemplate, perm: "settings.view" },
    ],
  },
];

const SEARCH_SCOPES = [
  { key: "jobs",      label: "Job",      icon: Briefcase,  path: r => `/jobs/${r.id}`,       display: r => `${r.customer_name} — ${r.address || ""}` },
  { key: "customers", label: "Customer", icon: UserCircle, path: r => `/customers/${r.id}`,  display: r => `${r.first_name} ${r.last_name}` },
  { key: "invoices",  label: "Invoice",  icon: Receipt,    path: r => `/invoices/${r.id}`,   display: r => `${r.invoice_number || "INV"} — ${r.status}` },
];

export default function MobileTopBar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { can } = usePermissions();
  const co = getCompanySettings();
  const primary = co.primaryColor || "#1e3a5f";
  const accent  = co.accentColor  || "#e8730a";

  const { data: jobs = [] }      = useQuery({ queryKey: ["jobs"],      queryFn: () => base44.entities.Job.list(),      enabled: searchOpen });
  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: () => base44.entities.Customer.list(), enabled: searchOpen });
  const { data: invoices = [] }  = useQuery({ queryKey: ["invoices"],  queryFn: () => base44.entities.Invoice.list(),  enabled: searchOpen });
  const data = { jobs, customers, invoices };

  const results = [];
  if (query.trim().length >= 2) {
    const q = query.toLowerCase();
    for (const scope of SEARCH_SCOPES) {
      (data[scope.key] || [])
        .filter(r => scope.display(r).toLowerCase().includes(q))
        .slice(0, 3)
        .forEach(r => results.push({ scope, record: r }));
    }
  }

  const initials = user?.full_name
    ? user.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : (user?.email?.[0] || "U").toUpperCase();

  // ── Search overlay ──────────────────────────────────────────────────────
  if (searchOpen) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b shadow-sm"
        style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="flex items-center gap-2 h-16 px-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search jobs, customers, invoices…"
              className="w-full h-12 pl-10 pr-4 rounded-xl border border-input bg-muted text-base focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={() => { setSearchOpen(false); setQuery(""); }}
            className="p-3 rounded-xl text-muted-foreground hover:bg-muted"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        {query.trim().length >= 2 && (
          <div className="border-t bg-background max-h-[60vh] overflow-y-auto">
            {results.length === 0 ? (
              <p className="text-center text-base text-muted-foreground py-8">No results</p>
            ) : (
              <div className="p-2 space-y-0.5">
                {results.map((item, i) => {
                  const Icon = item.scope.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => { navigate(item.scope.path(item.record)); setSearchOpen(false); setQuery(""); }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-muted text-left"
                    >
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.scope.display(item.record)}</p>
                        <p className="text-xs text-muted-foreground">{item.scope.label}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </header>
    );
  }

  // ── Main header + nav drawer ────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      {navOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setNavOpen(false)}
        />
      )}

      {/* Side drawer */}
      <div
        className={cn(
          "fixed top-0 left-0 bottom-0 z-50 w-72 bg-background border-r shadow-2xl flex flex-col transition-transform duration-300",
          navOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Drawer header */}
        <div
          className="flex items-center gap-3 px-4 h-16 border-b flex-shrink-0"
          style={{ background: primary }}
        >
          {co.logoUrl
            ? <img src={co.logoUrl} alt="" className="h-9 w-9 rounded-lg object-contain bg-white/10 p-0.5" />
            : <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: accent }}>{(co.companyName || "R")[0]}</div>
          }
          <div className="min-w-0 flex-1">
            <p className="font-bold text-white text-sm leading-tight truncate">{co.companyName || "RoofPro"}</p>
            <p className="text-white/60 text-xs truncate">{user?.full_name || user?.email || ""}</p>
          </div>
          <button onClick={() => setNavOpen(false)} className="p-2 rounded-lg text-white/70 hover:bg-white/10 flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto py-3">
          {NAV_GROUPS.map(group => {
            const visibleItems = group.items.filter(i => !i.perm || can(i.perm));
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.label} className="mb-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-5 pb-1 pt-3">
                  {group.label}
                </p>
                {visibleItems.map(item => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setNavOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary border-r-2 border-primary"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Drawer footer */}
        <div className="border-t px-4 py-3 flex-shrink-0">
          <button
            onClick={() => base44.auth.logout()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Top bar */}
      <header
        className="fixed top-0 left-0 right-0 z-40 border-b bg-background/95 backdrop-blur-md"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center justify-between h-16 px-3">
          {/* Left: hamburger + brand */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNavOpen(true)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              {co.logoUrl
                ? <img src={co.logoUrl} alt="" className="h-8 w-8 rounded-lg object-contain" style={{ background: `${primary}20` }} />
                : <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: primary }}>{(co.companyName || "R")[0]}</div>
              }
              <span className="font-bold text-sm tracking-tight truncate max-w-[140px]">{co.companyName || "RoofPro"}</span>
            </div>
          </div>

          {/* Right: search, notifications, avatar */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSearchOpen(true)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
            <NotificationBell />
            <Link
              to="/settings/company"
              className="w-9 h-9 rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0"
              style={{ background: primary }}
            >
              {initials}
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}