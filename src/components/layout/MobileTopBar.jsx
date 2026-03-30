import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { getCompanySettings } from "@/pages/settings/CompanySettings";
import { Search, X, Briefcase, FileText, Receipt, UserCircle, Bell, Menu,
  LayoutDashboard, CalendarDays, Users, Clock, Wrench, BarChart2, Wallet,
  Package, MessageSquareMore, Settings, Shield, LayoutTemplate, Building2,
  PlusCircle, Timer, Kanban, Globe } from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard",    path: "/",                   icon: LayoutDashboard },
  { label: "New Job",      path: "/jobs/new",            icon: PlusCircle,      perm: "jobs.create" },
  { label: "Jobs",         path: "/jobs",                icon: Briefcase,       perm: "jobs.view" },
  { label: "Job Board",    path: "/job-dashboard",       icon: Kanban,          perm: "jobs.view" },
  { label: "Schedule",     path: "/schedule",            icon: CalendarDays,    perm: "schedule.view" },
  { label: "Employees",    path: "/employees",           icon: Users,           perm: "employees.view" },
  { label: "Timesheets",   path: "/timesheets",          icon: Clock,           perm: "timesheets.view" },
  { label: "Clock-In",     path: "/clock-in",            icon: Timer },
  { label: "Maintenance",  path: "/maintenance",         icon: Wrench,          perm: "maintenance.view" },
  { label: "Finance",      path: "/finance",             icon: BarChart2,       perm: "finance.view" },
  { label: "Estimates",    path: "/estimates",           icon: FileText,        perm: "estimates.view" },
  { label: "Invoices",     path: "/invoices",            icon: Receipt,         perm: "invoices.view" },
  { label: "Expenses",     path: "/expenses",            icon: Wallet,          perm: "expenses.view" },
  { label: "Materials",    path: "/materials",           icon: Package,         perm: "materials.view" },
  { label: "Customers",    path: "/customers",           icon: UserCircle,      perm: "customers.view" },
  { label: "Forum",        path: "/forum",               icon: MessageSquareMore, perm: "forum.view" },
  { label: "Public Site",  path: "/website",             icon: Globe },
  { label: "Company",      path: "/settings/company",    icon: Building2,       perm: "settings.view" },
  { label: "Roles",        path: "/settings/roles",      icon: Shield,          perm: "roles.view" },
  { label: "Templates",    path: "/settings/templates",  icon: LayoutTemplate,  perm: "settings.view" },
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
  const visibleNav = NAV_ITEMS.filter(i => !i.perm || can(i.perm));

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

  if (searchOpen) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b shadow-sm"
        style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="flex items-center gap-2 h-16 md:h-[72px] px-3 md:px-5">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search jobs, customers, invoices…"
              className="w-full h-12 md:h-14 pl-10 pr-4 rounded-xl border border-input bg-muted text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
          <div className="border-t bg-background max-h-96 overflow-y-auto">
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
                      className="w-full flex items-center gap-3 px-4 py-4 rounded-xl hover:bg-muted text-left"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-medium truncate">{item.scope.display(item.record)}</p>
                        <p className="text-sm text-muted-foreground">{item.scope.label}</p>
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

  return (
    <>
      {/* Nav drawer overlay */}
      {navOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setNavOpen(false)} />
      )}

      {/* Nav drawer */}
      {navOpen && (
        <div className="fixed top-0 left-0 bottom-0 z-50 w-80 md:w-96 bg-background border-r shadow-2xl overflow-y-auto flex flex-col">
          <div className="flex items-center gap-3 px-5 h-16 md:h-[72px] border-b flex-shrink-0">
            {co.logoUrl
              ? <img src={co.logoUrl} alt="" className="h-10 w-10 rounded-lg object-contain" style={{ background: `${primary}20` }} />
              : <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-base font-bold" style={{ background: primary }}>{(co.companyName || "R")[0]}</div>
            }
            <span className="font-bold text-base tracking-tight">{co.companyName || "RoofPro"}</span>
            <button onClick={() => setNavOpen(false)} className="ml-auto p-2 rounded-lg text-muted-foreground hover:bg-muted">
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            {visibleNav.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setNavOpen(false)}
                  className={cn(
                    "flex items-center gap-4 px-4 py-3.5 rounded-xl text-base font-medium transition-colors",
                    isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

    <header
      className="fixed top-0 left-0 right-0 z-40 border-b bg-background/95 backdrop-blur-md"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex items-center justify-between h-16 md:h-[72px] px-4 md:px-6">
        {/* Hamburger + Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setNavOpen(true)}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          {co.logoUrl
            ? <img src={co.logoUrl} alt="" className="h-9 w-9 md:h-10 md:w-10 rounded-lg object-contain" style={{ background: `${primary}20` }} />
            : <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center text-white text-base font-bold" style={{ background: primary }}>{(co.companyName || "R")[0]}</div>
          }
          <span className="font-bold text-base md:text-lg tracking-tight truncate max-w-[160px] md:max-w-[260px]">{co.companyName || "RoofPro"}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
          >
            <Search className="w-6 h-6" />
          </button>
          <NotificationBell />
          <Link to="/settings/company" className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center text-primary-foreground text-base font-bold">
            {initials}
          </Link>
        </div>
      </div>
    </header>
    </>
  );
}