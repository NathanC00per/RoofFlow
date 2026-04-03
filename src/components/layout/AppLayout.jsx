import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import MobileNav from "./MobileNav";

export default function AppLayout() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(() => window.innerWidth >= 768 && window.innerWidth < 1024);

  useEffect(() => {
    const handler = () => {
      const w = window.innerWidth;
      setIsMobile(w < 768);
      setIsTablet(w >= 768 && w < 1024);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // Mobile: Bottom nav only
  if (isMobile) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <main className="flex-1 overflow-y-auto pt-4 pb-24 px-4">
          <div className="max-w-2xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  // Tablet: Side nav + top bar
  if (isTablet) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar collapsed={true} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/20">
            <div className="max-w-4xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Desktop: Full side nav + top bar
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 bg-muted/20">
          <div className="max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}