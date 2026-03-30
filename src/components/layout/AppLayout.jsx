import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import MobileTopBar from "./MobileTopBar";
import MobileNav from "./MobileNav";

export default function AppLayout() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024);

  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  if (!isDesktop) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <MobileTopBar />
        <main className="flex-1 overflow-y-auto pt-16 md:pt-[72px] pb-6 px-3 md:px-6">
          <div className="max-w-3xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}