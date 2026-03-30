import { Outlet, Link, useLocation } from "react-router-dom";
import { getCompanySettings } from "@/pages/settings/CompanySettings";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, LogIn } from "lucide-react";
import { base44 } from "@/api/base44Client";

const NAV_LINKS = [
  { label: "Home",         path: "/website" },
  { label: "Services",     path: "/website/services" },
  { label: "Gallery",      path: "/website/gallery" },
  { label: "Testimonials", path: "/website/testimonials" },
  { label: "Contact",      path: "/website/contact" },
];

export default function WebsiteLayout() {
  const [co, setCo] = useState(getCompanySettings());
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const handle = () => setCo(getCompanySettings());
    window.addEventListener("storage", handle);
    return () => window.removeEventListener("storage", handle);
  }, []);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const primary = co.primaryColor || "#1e3a5f";
  const accent  = co.accentColor  || "#e8730a";
  const name    = co.companyName  || "RoofPro";

  function handleLogin() {
    base44.auth.redirectToLogin(window.location.pathname);
  }

  return (
    <div className="min-h-screen flex flex-col font-inter bg-white">
      {/* Navbar */}
      <header className="sticky top-0 z-50 shadow-sm" style={{ background: primary }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          {/* Logo / Brand */}
          <Link to="/website" className="flex items-center gap-3">
            {co.logoUrl
              ? <img src={co.logoUrl} alt={name} className="h-9 w-9 object-contain rounded-md bg-white/10 p-0.5" />
              : <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-lg" style={{ background: accent }}>{name[0]}</div>
            }
            <span className="text-white font-bold text-lg hidden sm:block tracking-tight">{name}</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ label, path }) => {
              const isActive = location.pathname === path || (path !== "/website" && location.pathname.startsWith(path));
              return (
                <Link
                  key={path}
                  to={path}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? "bg-white/20 text-white" : "text-white/75 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Right: Client login + portal */}
          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <Link to="/">
                  <Button size="sm" className="text-sm gap-2 border border-white/30 bg-white/10 hover:bg-white/20 text-white">
                    Go to Dashboard
                  </Button>
                </Link>
                <Link to="/client-portal">
                  <Button size="sm" style={{ background: accent }} className="text-white border-0 hover:opacity-90 text-sm gap-2">
                    Client Portal
                  </Button>
                </Link>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={handleLogin}
                style={{ background: accent }}
                className="text-white border-0 hover:opacity-90 text-sm gap-2"
              >
                <LogIn className="w-4 h-4" />
                Client Login
              </Button>
            )}

            {/* Mobile menu toggle */}
            <button
              className="md:hidden text-white p-2 rounded-lg hover:bg-white/10"
              onClick={() => setMenuOpen(o => !o)}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <div className="md:hidden border-t border-white/10 px-4 py-3 space-y-1" style={{ background: primary }}>
            {NAV_LINKS.map(({ label, path }) => (
              <Link
                key={path}
                to={path}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </Link>
            ))}
            <div className="pt-2 border-t border-white/10">
              {user ? (
                <Link to="/client-portal" onClick={() => setMenuOpen(false)}>
                  <Button size="sm" className="w-full" style={{ background: accent }}>Client Portal</Button>
                </Link>
              ) : (
                <Button size="sm" onClick={handleLogin} className="w-full" style={{ background: accent }}>
                  <LogIn className="w-4 h-4 mr-2" /> Client Login
                </Button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}