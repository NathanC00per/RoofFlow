import { useState, useRef, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Search, LogOut, Settings, ChevronDown, Shield, Briefcase, FileText, Receipt, UserCircle } from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import { cn } from "@/lib/utils";

const PAGE_TITLES = {
  "/": "Dashboard",
  "/jobs": "All Jobs",
  "/jobs/new": "New Job",
  "/job-dashboard": "Job Board",
  "/employees": "Employees",
  "/timesheets": "Timesheets",
  "/clock-in": "Clock In",
  "/schedule": "Schedule",
  "/materials": "Materials",
  "/estimates": "Estimates",
  "/invoices": "Invoices",
  "/finance": "Finance Dashboard",
  "/customers": "Customers",
  "/expenses": "Expenses",
  "/maintenance": "Maintenance",
  "/communications": "Communications",
  "/voicemails": "Voicemails",
  "/broadcast": "Broadcast",
  "/forum": "Team Forum",
  "/notifications": "Notifications",
  "/settings/company": "Company Settings",
  "/settings/phone": "Phone Settings",
  "/settings/roles": "Roles & Permissions",
  "/settings/templates": "Document Templates",
  "/settings/vat": "VAT Tracker",
};

const SEARCH_SCOPES = [
  { key: "jobs", label: "Jobs", icon: Briefcase, path: (r) => `/jobs/${r.id}`, display: (r) => `${r.customer_name} — ${r.address || ""}` },
  { key: "estimates", label: "Estimates", icon: FileText, path: (r) => `/estimates/${r.id}`, display: (r) => `${r.estimate_number || "EST"} — ${r.status}` },
  { key: "invoices", label: "Invoices", icon: Receipt, path: (r) => `/invoices/${r.id}`, display: (r) => `${r.invoice_number || "INV"} — ${r.status}` },
  { key: "customers", label: "Customers", icon: UserCircle, path: (r) => `/customers/${r.id}`, display: (r) => `${r.first_name} ${r.last_name} — ${r.email || ""}` },
];

function useSearchData() {
  const { data: jobs = [] } = useQuery({ queryKey: ["jobs"], queryFn: () => base44.entities.Job.list() });
  const { data: estimates = [] } = useQuery({ queryKey: ["estimates"], queryFn: () => base44.entities.Estimate.list() });
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => base44.entities.Invoice.list() });
  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: () => base44.entities.Customer.list() });
  return { jobs, estimates, invoices, customers };
}

function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef(null);
  const data = useSearchData();

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const results = [];
  if (query.trim().length >= 2) {
    const q = query.toLowerCase();
    for (const scope of SEARCH_SCOPES) {
      const records = data[scope.key] || [];
      const matches = records.filter(r => scope.display(r).toLowerCase().includes(q)).slice(0, 3);
      for (const r of matches) {
        results.push({ scope, record: r });
      }
    }
  }

  function pick(item) {
    navigate(item.scope.path(item.record));
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          id="global-search"
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search jobs, estimates, invoices, customers…"
          className="w-full h-9 pl-9 pr-4 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute top-full mt-1.5 left-0 right-0 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No results for "{query}"</p>
          ) : (
            <div className="p-1">
              {results.map((item, i) => {
                const Icon = item.scope.icon;
                return (
                  <button
                    key={i}
                    onClick={() => pick(item)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent text-left transition-colors"
                  >
                    <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
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
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const { role, isAdmin } = usePermissions();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = user?.full_name
    ? user.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : (user?.email?.[0] || "U").toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2.5 pl-1 pr-3 py-1.5 rounded-xl hover:bg-accent transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold flex-shrink-0">
          {initials}
        </div>
        <div className="text-left hidden sm:block">
          <p className="text-sm font-medium leading-none truncate max-w-[120px]">{user?.full_name || user?.email || "User"}</p>
          <p className={cn("text-xs mt-0.5 capitalize flex items-center gap-1", isAdmin ? "text-accent" : "text-muted-foreground")}>
            {isAdmin && <Shield className="w-3 h-3" />}
            {role}
          </p>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          {/* User info header */}
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold truncate">{user?.full_name || "User"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            <span className={cn(
              "inline-flex items-center gap-1 text-xs mt-1.5 px-2 py-0.5 rounded-full font-medium",
              isAdmin ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"
            )}>
              {isAdmin && <Shield className="w-3 h-3" />}
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </span>
          </div>

          {/* Actions */}
          <div className="p-1">
            {isAdmin && (
              <Link
                to="/settings/company"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-accent text-sm transition-colors w-full"
              >
                <Settings className="w-4 h-4 text-muted-foreground" />
                Settings
              </Link>
            )}
            <button
              onClick={() => logout()}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-destructive/10 hover:text-destructive text-sm transition-colors w-full text-left"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickActions() {
  const navigate = useNavigate();
  const { can } = usePermissions();

  useEffect(() => {
    function handler(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); document.getElementById("global-search")?.focus(); }
      if ((e.metaKey || e.ctrlKey) && e.key === "j") { e.preventDefault(); if (can("jobs.create")) navigate("/jobs/new"); }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [can]);

  return null;
}

export default function TopBar() {
  const location = useLocation();
  const pageTitle = (() => {
    // Exact match first
    if (PAGE_TITLES[location.pathname]) return PAGE_TITLES[location.pathname];
    // Prefix match for dynamic routes
    if (location.pathname.startsWith("/jobs/")) return "Job Details";
    if (location.pathname.startsWith("/estimates/")) return "Estimate";
    if (location.pathname.startsWith("/invoices/")) return "Invoice";
    if (location.pathname.startsWith("/customers/")) return "Customer Details";
    if (location.pathname.startsWith("/maintenance/")) return "Maintenance Contract";
    return "";
  })();

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40 flex items-center px-5 gap-4">
      <QuickActions />
      {pageTitle && (
        <h2 className="text-sm font-semibold text-foreground hidden md:block whitespace-nowrap">{pageTitle}</h2>
      )}
      {pageTitle && <div className="hidden md:block w-px h-4 bg-border" />}
      <div className="flex-1 max-w-lg">
        <GlobalSearch />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1.5 rounded-lg border">
          <kbd className="font-mono text-[10px]">⌘K</kbd>
          <span className="text-[10px]">search</span>
          <span className="mx-0.5 text-muted-foreground/40">·</span>
          <kbd className="font-mono text-[10px]">⌘J</kbd>
          <span className="text-[10px]">new job</span>
        </div>
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}